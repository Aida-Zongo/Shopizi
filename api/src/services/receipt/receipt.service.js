/**
 * Receipt generation service.
 * Generates simple receipt data for payment confirmation emails.
 */
async function generateReceiptData(paymentId) {
  const { query } = require('../../db/pool');
  const result = await query(
    `SELECT p.*, u.full_name, u.email, pl.name AS plan_name
     FROM payments p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN subscriptions s ON s.id = p.subscription_id
     LEFT JOIN plans pl ON pl.id = s.plan_id
     WHERE p.id = $1`,
    [paymentId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

module.exports = { generateReceiptData };
