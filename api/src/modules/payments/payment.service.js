const { query, getClient } = require('../../db/pool');
const { NotFoundError, BadRequestError, PaymentError } = require('../../utils/errors');
const { getIO } = require('../../realtime/socket');
const { broadcastNewOrder } = require('../orders/order-broadcast');
const eventBus = require('../../events');
const config = require('../../config/index');
const logger = require('../../config/logger');

const PAYMENT_TYPES = ['order', 'subscription', 'ads', 'digital_product'];

/**
 * Mode courant, sans changement de code :
 * - 'geniuspay' dès que GENIUSPAY_API_KEY, GENIUSPAY_API_SECRET et GENIUSPAY_WEBHOOK_SECRET sont valides ;
 * - 'cinetpay' dès que CINETPAY_API_KEY ET CINETPAY_SITE_ID sont de vraies valeurs ;
 * - sinon 'paydunya' si une vraie clé Master PayDunya est présente ;
 * - sinon 'sandbox'.
 */
function getMode() {
  const gpKey = process.env.GENIUSPAY_API_KEY;
  const gpSec = process.env.GENIUSPAY_API_SECRET;
  const gpWh = process.env.GENIUSPAY_WEBHOOK_SECRET;
  if (gpKey && !gpKey.startsWith('change-me') &&
      gpSec && !gpSec.startsWith('change-me') &&
      gpWh && !gpWh.startsWith('change-me')) {
    return 'geniuspay';
  }
  const cpKey = process.env.CINETPAY_API_KEY;
  const cpSite = process.env.CINETPAY_SITE_ID;
  if (cpKey && !cpKey.startsWith('change-me') &&
      cpSite && !cpSite.startsWith('change-me') && cpSite !== 'SITE_ID_ICI') {
    return 'cinetpay';
  }
  const key = process.env.PAYDUNYA_MASTER_KEY;
  return key && key !== 'change-me' ? 'paydunya' : 'sandbox';
}

function generateTransactionId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Point d'entrée unique pour démarrer un paiement (commande, abonnement ou pub).
 */
async function initiatePayment({ type, amount, customerId, shopId, metadata }) {
  if (!PAYMENT_TYPES.includes(type)) throw new BadRequestError('Type de paiement invalide');
  if (!amount || amount <= 0) throw new BadRequestError('Montant invalide');

  const mode = getMode();
  if (mode === 'geniuspay') return initiateGeniuspay({ type, amount, customerId, shopId, metadata });
  if (mode === 'cinetpay') return initiateCinetpay({ type, amount, customerId, shopId, metadata });
  if (mode === 'paydunya') return initiatePaydunya({ type, amount, customerId, shopId, metadata });
  return initiateSandbox({ type, amount, customerId, shopId, metadata });
}

async function initiateSandbox({ type, amount, customerId, shopId, metadata }) {
  const transactionId = generateTransactionId('SANDBOX');
  await query(
    `INSERT INTO payment_transactions (transaction_id, type, amount, customer_id, shop_id, status, metadata)
     VALUES ($1,$2,$3,$4,$5,'pending',$6)`,
    [transactionId, type, amount, customerId || null, shopId || null, metadata ? JSON.stringify(metadata) : null]
  );

  return {
    mode: 'sandbox',
    transaction_id: transactionId,
    payment_url: null,
    sandbox_url: `${process.env.BACKEND_URL || `http://localhost:${config.server.port}`}/api/v1/payments/sandbox/confirm/${transactionId}`,
  };
}

/**
 * Démarre un paiement via CinetPay (Orange Money, Moov Money, cartes).
 * Même schéma que PayDunya : transaction persistée 'pending' d'abord, puis
 * création du paiement chez CinetPay ; le webhook /webhook/cinetpay confirme.
 * CinetPay impose un montant multiple de 5 en XOF — on rejette en amont
 * plutôt que de laisser l'API renvoyer une erreur opaque.
 */
async function initiateCinetpay({ type, amount, customerId, shopId, metadata }) {
  const cinetpay = require('./gateways/cinetpay.gateway');

  if (amount % 5 !== 0) {
    throw new BadRequestError('CinetPay exige un montant multiple de 5 XOF');
  }

  const transactionId = generateTransactionId('CP');
  await query(
    `INSERT INTO payment_transactions (transaction_id, type, amount, customer_id, shop_id, status, metadata)
     VALUES ($1,$2,$3,$4,$5,'pending',$6)`,
    [transactionId, type, amount, customerId || null, shopId || null, metadata ? JSON.stringify(metadata) : null]
  );

  const result = await cinetpay.initiatePayment({
    amount,
    phoneNumber: metadata?.customer_phone || '',
    reference: transactionId,
  });

  if (!result.success) {
    await query(`UPDATE payment_transactions SET status = 'failed' WHERE transaction_id = $1`, [transactionId]);
    throw new PaymentError(result.error || "Échec de l'initialisation du paiement CinetPay");
  }

  return {
    mode: 'cinetpay',
    transaction_id: transactionId,
    payment_url: result.paymentUrl,
    payment_token: result.paymentToken,
  };
}

/**
 * Démarre un paiement via PayDunya (Orange Money, Moov, Wave... Burkina Faso).
 * On persiste d'abord la transaction en base ('pending') puis on crée la
 * facture PayDunya. Le transaction_id est passé en custom_data pour que le
 * webhook puisse retrouver et confirmer la transaction. Idempotent côté order
 * via processConfirmedPayment.
 *
 * NB : le SDK paydunya lit `returnURL`/`cancelURL`/`callbackURL` et
 * `logoURL`/`websiteURL` (URL en majuscules) — un mauvais casing serait
 * silencieusement ignoré et le webhook ne serait jamais enregistré.
 */
async function initiatePaydunya({ type, amount, customerId, shopId, metadata }) {
  const paydunya = require('paydunya');

  const transactionId = generateTransactionId('PD');
  await query(
    `INSERT INTO payment_transactions (transaction_id, type, amount, customer_id, shop_id, status, metadata)
     VALUES ($1,$2,$3,$4,$5,'pending',$6)`,
    [transactionId, type, amount, customerId || null, shopId || null, metadata ? JSON.stringify(metadata) : null]
  );

  const setup = new paydunya.Setup({
    masterKey: process.env.PAYDUNYA_MASTER_KEY,
    privateKey: process.env.PAYDUNYA_PRIVATE_KEY,
    token: process.env.PAYDUNYA_TOKEN,
    publicKey: process.env.PAYDUNYA_PUBLIC_KEY,
    mode: process.env.PAYDUNYA_MODE || 'test',
  });

  const store = new paydunya.Store({
    name: 'Shopizi',
    tagline: 'La marketplace digitale du Burkina Faso',
    phoneNumber: '+22666869010',
    postalAddress: 'Ouagadougou, Burkina Faso',
    logoURL: 'https://shopizi.bf/logo-shopizi.png',
    websiteURL: 'https://shopizi.bf',
  });

  const frontendUrl = process.env.FRONTEND_URL || config.frontend.url;
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${config.server.port}`;

  const invoice = new paydunya.CheckoutInvoice(setup, store);
  invoice.description = 'Shopizi - ' + type;
  invoice.totalAmount = amount;
  invoice.addItem('Shopizi ' + type, 1, amount, amount);
  invoice.addCustomData('transaction_id', transactionId);
  invoice.cancelURL = frontendUrl + '/payment/cancel';
  invoice.returnURL = frontendUrl + '/payment/success?ref=' + transactionId;
  invoice.callbackURL = backendUrl + '/api/v1/payments/webhook/paydunya';

  try {
    await invoice.create();
  } catch (err) {
    await query(`UPDATE payment_transactions SET status = 'failed' WHERE transaction_id = $1`, [transactionId]);
    throw new PaymentError(err.message || "Échec de l'initialisation du paiement PayDunya");
  }

  return {
    mode: 'paydunya',
    transaction_id: transactionId,
    payment_url: invoice.url,
    paydunya_token: invoice.token,
  };
}

/**
 * Confirme une transaction (sandbox ou webhook CinetPay) et déclenche
 * les actions métier correspondant à son type. Idempotent.
 */
async function processConfirmedPayment(transactionId, status = 'completed') {
  const txRes = await query('SELECT * FROM payment_transactions WHERE transaction_id = $1', [transactionId]);
  if (txRes.rows.length === 0) throw new NotFoundError('Transaction introuvable');
  const tx = txRes.rows[0];

  if (tx.status !== 'pending') return tx; // déjà traité

  await query(
    `UPDATE payment_transactions SET status = $1, confirmed_at = NOW() WHERE transaction_id = $2`,
    [status, transactionId]
  );
  tx.status = status;

  if (status !== 'completed') return tx;

  const metadata = tx.metadata || {};
  if (tx.type === 'order') await processOrderPayment(tx, metadata);
  else if (tx.type === 'subscription') await processSubscriptionPayment(tx, metadata);
  else if (tx.type === 'ads') await processAdsPayment(tx, metadata);
  else if (tx.type === 'digital_product') await processDigitalPurchase(tx, metadata);

  return tx;
}

/**
 * Commande client payée : confirme la commande et crédite le solde du
 * marchand. La répartition (5% Shopizi / 95% livreur sur la livraison,
 * 100% marchand sur le produit) a déjà été calculée à la création de la
 * commande dans order_financials — on ne fait ici que débloquer le paiement.
 */
async function processOrderPayment(tx, metadata) {
  const orderId = metadata.order_id;
  if (!orderId) throw new BadRequestError('order_id manquant dans les métadonnées de paiement');

  const client = await getClient();
  let order, merchantEarnings;
  try {
    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
    if (orderRes.rows.length === 0) throw new NotFoundError('Commande introuvable');
    order = orderRes.rows[0];

    const finRes = await client.query('SELECT merchant_earnings_xof FROM order_financials WHERE order_id = $1', [orderId]);
    merchantEarnings = finRes.rows[0]?.merchant_earnings_xof || 0;

    const updated = await client.query(
      `UPDATE orders SET payment_status = 'paid', status = CASE WHEN status = 'new' THEN 'confirmed' ELSE status END
       WHERE id = $1 RETURNING *`,
      [orderId]
    );
    order = updated.rows[0];

    await client.query(
      `UPDATE shops SET pending_balance = pending_balance + $1, total_earned = total_earned + $1 WHERE id = $2`,
      [merchantEarnings, order.shop_id]
    );

    // Point 4: Decrement stock for physical products
    const itemsRes = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [orderId]);
    for (const item of itemsRes.rows) {
      await client.query(
        'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - $1) WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await broadcastNewOrder(order, metadata.product_name || null);
  getIO().emit('order:confirmed', { order_id: order.id, shop_id: order.shop_id });
  eventBus.emit('order:status_changed', { shopId: order.shop_id, orderId: order.id, oldStatus: 'new', newStatus: order.status });
}

/**
 * Abonnement payé : active le plan pour 30 jours. Les fonctionnalités
 * (produits illimités, rapports, équipe...) se déduisent automatiquement
 * du plan actif via subscriptions.plan_id — aucune table de flags séparée.
 */
async function processSubscriptionPayment(tx, metadata) {
  const planSlug = metadata.plan_slug;
  const shopId = metadata.shop_id || tx.shop_id;
  if (!planSlug || !shopId) throw new BadRequestError('plan_slug ou shop_id manquant dans les métadonnées de paiement');

  const shopRes = await query('SELECT user_id FROM shops WHERE id = $1', [shopId]);
  if (shopRes.rows.length === 0) throw new NotFoundError('Boutique introuvable');
  const userId = shopRes.rows[0].user_id;

  const planRes = await query('SELECT * FROM plans WHERE slug = $1 AND is_active = true', [planSlug]);
  if (planRes.rows.length === 0) throw new NotFoundError('Plan introuvable');
  const plan = planRes.rows[0];

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1 AND status IN ('trial','active','past_due')`,
      [userId]
    );
    await client.query(
      `INSERT INTO subscriptions (user_id, plan_id, status, starts_at, ends_at)
       VALUES ($1,$2,'active',NOW(),NOW() + INTERVAL '30 days')`,
      [userId, plan.id]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  eventBus.emit('payment:completed', { userId, payment: { amount: tx.amount, method: 'payment_transactions' }, planSlug: plan.slug });
  eventBus.emit('subscription:activated', { userId, planSlug: plan.slug });
}

/**
 * Publicité payée : crée la campagne active. Elle apparaît immédiatement
 * comme "sponsorisée" via customer.routes.js (GET /customer/products/featured),
 * qui ne joint que les ads au statut 'active'.
 */
async function processAdsPayment(tx, metadata) {
  const { product_id, budget_xof } = metadata;
  const shop_id = metadata.shop_id || tx.shop_id;
  if (!product_id || !budget_xof || !shop_id) {
    throw new BadRequestError('product_id, budget_xof ou shop_id manquant dans les métadonnées de paiement');
  }

  const adRes = await query(
    `INSERT INTO ads (shop_id, product_id, budget_xof, status) VALUES ($1,$2,$3,'active') RETURNING *`,
    [shop_id, product_id, budget_xof]
  );

  getIO().emit('ads:activated', { shop_id, product_id, ad_id: adRes.rows[0].id });
}

/**
 * Produit digital payé : débloque le lien de téléchargement, crédite le
 * marchand (95%, Shopizi garde 5%) et incrémente le compteur de ventes.
 * Tout en transaction : un achat à moitié validé donnerait soit un fichier
 * gratuit, soit un paiement sans fichier.
 */
async function processDigitalPurchase(tx, metadata) {
  const purchaseId = metadata.purchase_id;
  if (!purchaseId) throw new BadRequestError('purchase_id manquant dans les métadonnées de paiement');

  const client = await getClient();
  let purchase, product;
  try {
    await client.query('BEGIN');

    const purchaseRes = await client.query(
      'SELECT * FROM digital_purchases WHERE id = $1 FOR UPDATE',
      [purchaseId]
    );
    if (purchaseRes.rows.length === 0) throw new NotFoundError('Achat digital introuvable');
    purchase = purchaseRes.rows[0];

    const productRes = await client.query(
      'SELECT id, name, shop_id FROM digital_products WHERE id = $1',
      [purchase.digital_product_id]
    );
    if (productRes.rows.length === 0) throw new NotFoundError('Produit digital introuvable');
    product = productRes.rows[0];

    // Le compte à rebours des 48h démarre au paiement, pas à l'initiation :
    // un client bloqué 30 min sur son mobile money ne perd pas son délai.
    const updated = await client.query(
      `UPDATE digital_purchases
       SET payment_status = 'completed',
           download_expires_at = NOW() + INTERVAL '48 hours'
       WHERE id = $1 RETURNING *`,
      [purchaseId]
    );
    purchase = updated.rows[0];

    await client.query(
      `UPDATE shops SET pending_balance = pending_balance + $1, total_earned = total_earned + $1 WHERE id = $2`,
      [purchase.merchant_amount, product.shop_id]
    );

    await client.query(
      'UPDATE digital_products SET total_sales = total_sales + 1 WHERE id = $1',
      [product.id]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const frontendUrl = process.env.FRONTEND_URL || config.frontend.url;
  logger.info(
    `Produit digital payé: ${product.name} — lien ${frontendUrl}/download/${purchase.download_token} (expire ${purchase.download_expires_at.toISOString()})`
  );

  getIO().emit('digital:purchased', {
    purchase_id: purchase.id,
    digital_product_id: product.id,
    shop_id: product.shop_id,
  });
}

/**
 * Démarre un paiement via GeniusPay.
 * GeniusPay génère lui-même sa référence (ex: MTX-...), qu'on utilise comme
 * transaction_id dans payment_transactions ('pending').
 */
async function initiateGeniuspay({ type, amount, customerId, shopId, metadata }) {
  const geniuspay = require('./gateways/geniuspay.gateway');

  const result = await geniuspay.initiatePayment({
    amount,
    phoneNumber: metadata?.customer_phone || '',
    description: `Shopizi - ${type} (${amount} F CFA)`,
  });

  if (!result.success || !result.gatewayTransactionId) {
    throw new PaymentError(result.error || "Échec de l'initialisation du paiement GeniusPay");
  }

  const transactionId = result.gatewayTransactionId;

  await query(
    `INSERT INTO payment_transactions (transaction_id, type, amount, customer_id, shop_id, status, metadata)
     VALUES ($1,$2,$3,$4,$5,'pending',$6)`,
    [transactionId, type, amount, customerId || null, shopId || null, metadata ? JSON.stringify(metadata) : null]
  );

  return {
    mode: 'geniuspay',
    transaction_id: transactionId,
    payment_url: result.paymentUrl,
  };
}

module.exports = {
  getMode,
  initiatePayment,
  initiateSandbox,
  initiateGeniuspay,
  initiateCinetpay,
  initiatePaydunya,
  processConfirmedPayment,
  processOrderPayment,
  processSubscriptionPayment,
  processAdsPayment,
  processDigitalPurchase,
};
