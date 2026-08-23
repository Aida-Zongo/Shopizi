const { Router } = require('express');
const { z } = require('zod');
const { query } = require('../../db/pool');
const { optionalAuth, authenticate } = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const { successResponse } = require('../../utils/response');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const paymentService = require('./payment.service');

const router = Router();

// Démarre un paiement (commande client, abonnement marchand ou publicité).
// Public : une commande client n'est pas authentifiée (achat invité).
router.post('/initiate', optionalAuth, validate({ body: z.object({
  type: z.enum(['order', 'subscription', 'ads']),
  amount: z.number().positive(),
  shop_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
})}), asyncHandler(async (req, res) => {
  const { type, amount, shop_id, metadata } = req.body;
  const result = await paymentService.initiatePayment({
    type,
    amount,
    customerId: req.user?.userId || null,
    shopId: shop_id || req.user?.shopId || null,
    metadata: metadata || {},
  });
  return successResponse(res, result, null, 201);
}));

// Confirmation manuelle en mode sandbox (bouton "Simuler paiement" côté client).
router.post('/sandbox/confirm/:transactionId', validate({ body: z.object({
  status: z.enum(['completed', 'failed']).default('completed'),
})}), asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  if (!transactionId.startsWith('SANDBOX_')) {
    throw new BadRequestError('Cette transaction n\'est pas en mode sandbox');
  }
  const tx = await paymentService.processConfirmedPayment(transactionId, req.body.status);
  return successResponse(res, tx);
}));

// Webhook PayDunya (IPN). PayDunya poste l'objet `data` (form-urlencoded ou JSON).
// On vérifie de manière sécurisée la signature avec le hash de la Master Key
// et le vrai statut du paiement via confirm() du SDK PayDunya.
router.post('/webhook/paydunya', async (req, res) => {
  try {
    const data = req.body?.data || req.body;
    const invoice = data?.invoice || {};

    // 1. Validation de la signature (hash SHA-512 de la MasterKey)
    const crypto = require('crypto');
    const masterKey = process.env.PAYDUNYA_MASTER_KEY;
    if (!masterKey) {
      console.error('Webhook PayDunya: PAYDUNYA_MASTER_KEY non configurée');
      return res.status(400).json({ success: false, error: 'Master Key non configurée' });
    }

    const expectedHash = crypto.createHash('sha512').update(masterKey).digest('hex');
    const receivedHash = data?.hash || invoice?.hash || req.body?.hash;

    if (!receivedHash || receivedHash !== expectedHash) {
      console.warn('Webhook PayDunya: signature invalide');
      return res.status(400).json({ success: false, error: 'Signature invalide' });
    }

    // 2. Récupération du token de l'invoice
    const token = data?.token || invoice?.token || req.body?.token || req.body?.invoice_token;
    if (!token) {
      console.warn('Webhook PayDunya: token de transaction manquant');
      return res.status(400).json({ success: false, error: 'Token de transaction manquant' });
    }

    // 3. Appel à l'API PayDunya via le SDK pour confirmer officiellement le statut de l'invoice
    const paydunya = require('paydunya');
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

    const checkInvoice = new paydunya.CheckoutInvoice(setup, store);
    try {
      await checkInvoice.confirm(token);
    } catch (e) {
      console.error('Webhook PayDunya API confirm error:', e.message);
      return res.status(400).json({ success: false, error: 'Échec de la validation auprès de PayDunya' });
    }

    if (checkInvoice.status !== 'completed') {
      console.warn(`Webhook PayDunya: Statut de transaction invalide (${checkInvoice.status})`);
      return res.status(400).json({ success: false, error: `Statut invalide : ${checkInvoice.status}` });
    }

    // 4. Récupération du transaction_id interne (passé en custom_data)
    const transactionId =
      data?.custom_data?.transaction_id ||
      invoice?.custom_data?.transaction_id ||
      req.body?.transaction_id;

    if (!transactionId) {
      console.warn('Webhook PayDunya: transaction_id manquant');
      return res.status(400).json({ success: false, error: 'transaction_id manquant' });
    }

    // 5. Confirmation du paiement
    await paymentService.processConfirmedPayment(transactionId, 'completed');
    res.json({ success: true });
  } catch (err) {
    console.error('Webhook PayDunya erreur:', err.message);
    res.status(500).json({ success: false });
  }
});

// Webhook CinetPay (notify_url). On ne fait JAMAIS confiance au corps du POST
// (cpm_result est falsifiable) : on re-vérifie le statut auprès de l'API
// CinetPay (/payment/check) et on ne confirme que sur ACCEPTED. Les statuts
// intermédiaires (WAITING_FOR_CUSTOMER...) sont ignorés — CinetPay re-notifiera.
router.post('/webhook/cinetpay', asyncHandler(async (req, res) => {
  const cinetpayGateway = require('./gateways/cinetpay.gateway');
  const transactionId = req.body.cpm_trans_id || req.body.transaction_id;
  if (!transactionId) throw new BadRequestError('cpm_trans_id manquant');

  const check = await cinetpayGateway.verifyPayment(transactionId);
  if (check.status === 'ACCEPTED') {
    await paymentService.processConfirmedPayment(transactionId, 'completed');
  } else if (check.status === 'REFUSED') {
    await paymentService.processConfirmedPayment(transactionId, 'failed');
  }
  return successResponse(res, { received: true, status: check.status || null });
}));

// Statut d'une transaction (utilisé par le dashboard marchand).
router.get('/status/:transactionId', authenticate, asyncHandler(async (req, res) => {
  const r = await query('SELECT * FROM payment_transactions WHERE transaction_id = $1', [req.params.transactionId]);
  if (r.rows.length === 0) throw new NotFoundError('Transaction introuvable');
  return successResponse(res, r.rows[0]);
}));

module.exports = router;
