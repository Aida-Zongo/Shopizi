const { query } = require('../db/pool');
const logger = require('../config/logger');

// Une commande client passe par le checkout en ligne : creation (status='new',
// payment_status='pending', source='website_form') puis redirection CinetPay.
// Si le client abandonne sans payer, la commande reste indefiniment 'new'/'pending'.
// Un paiement reussi mettrait payment_status='paid' + status='confirmed' de facon
// atomique (webhook), donc une commande encore 'new'/'pending' n'a jamais ete payee.
// Fenetre de 60 min : un paiement Mobile Money peut prendre jusqu'a ~30 min, on
// laisse une marge avant d'effacer.
const ABANDON_MINUTES = 60;

/**
 * Efface les commandes en ligne abandonnees : le client a entame la procedure de
 * paiement (une transaction 'order' existe) mais aucune n'a abouti, et la commande
 * est restee 'new'/'pending' au-dela de la fenetre d'abandon. Les FK ON DELETE
 * CASCADE nettoient order_items, order_financials et deliveries. Les commandes
 * manuelles du marchand (source='manual') ne sont jamais concernees.
 */
async function runCleanupAbandonedOrders() {
  const result = await query(
    `DELETE FROM orders o
     WHERE o.status = 'new'
       AND o.payment_status = 'pending'
       AND o.source = 'website_form'
       AND o.created_at < NOW() - INTERVAL '${ABANDON_MINUTES} minutes'
       AND EXISTS (
         SELECT 1 FROM payment_transactions pt
         WHERE pt.type = 'order' AND pt.metadata->>'order_id' = o.id::text
       )
       AND NOT EXISTS (
         SELECT 1 FROM payment_transactions pt
         WHERE pt.type = 'order' AND pt.metadata->>'order_id' = o.id::text
           AND pt.status = 'completed'
       )
     RETURNING o.id`
  );

  if (result.rowCount > 0) {
    logger.info(`Abandoned orders cleanup: deleted ${result.rowCount} unpaid order(s)`);
  }
}

module.exports = { runCleanupAbandonedOrders };
