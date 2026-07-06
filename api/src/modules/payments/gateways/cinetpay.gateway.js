const crypto = require('crypto');
const PaymentGateway = require('./gateway.interface');
const config = require('../../../config/index');
const logger = require('../../../config/logger');

/**
 * CinetPay payment gateway implementation.
 * CinetPay is a West African payment aggregator that supports
 * Orange Money, Moov Money, and card payments.
 */
class CinetPayGateway extends PaymentGateway {
  getGatewayName() { return 'cinetpay'; }

  async initiatePayment({ amount, phoneNumber, reference }) {
    const payload = {
      apikey: config.cinetpay.apiKey,
      site_id: config.cinetpay.siteId,
      transaction_id: reference,
      amount: amount,
      currency: 'XOF',
      description: `Shopizi - Abonnement (${amount} F CFA)`,
      customer_phone_number: phoneNumber,
      channels: 'ALL',
      notify_url: config.cinetpay.notifyUrl,
      return_url: config.cinetpay.returnUrl,
      lang: 'fr',
    };

    try {
      const response = await fetch(`${config.cinetpay.baseUrl}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      // CinetPay renvoie `code` en chaîne ('201') — comparer en chaîne.
      if (String(data.code) !== '201') {
        logger.error('CinetPay initiation failed:', data);
        return { success: false, error: data.message || 'Erreur de paiement' };
      }

      return {
        success: true,
        gatewayTransactionId: data.data.transaction_id,
        paymentToken: data.data.payment_token,
        paymentUrl: data.data.payment_url,
      };
    } catch (err) {
      logger.error('CinetPay API error:', err);
      return { success: false, error: 'Service de paiement indisponible' };
    }
  }

  async verifyPayment(transactionId) {
    try {
      const response = await fetch(`${config.cinetpay.baseUrl}/payment/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey: config.cinetpay.apiKey,
          site_id: config.cinetpay.siteId,
          transaction_id: transactionId,
        }),
      });
      const data = await response.json();
      // /payment/check renvoie code '00' (SUCCES) quand la transaction existe ;
      // le statut réel (ACCEPTED / REFUSED / WAITING...) est dans data.data.status.
      return { success: String(data.code) === '00', status: data.data?.status || null, data };
    } catch (err) {
      logger.error('CinetPay verify error:', err);
      return { success: false, error: 'Vérification indisponible' };
    }
  }

  async processWebhook(payload, signature) {
    // Verify HMAC signature
    const computedHash = crypto
      .createHmac('sha256', config.cinetpay.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (computedHash !== signature) {
      logger.warn('CinetPay webhook: invalid signature');
      return { success: false, error: 'Signature invalide' };
    }

    return {
      success: true,
      transactionId: payload.transaction_id,
      status: payload.status === 'ACCEPTED' ? 'completed' : 'failed',
      amount: payload.amount,
    };
  }
}

module.exports = new CinetPayGateway();

// Minimal fetch polyfill for Node <18
const https = require('https');
const http = require('http');

function fetch(url, options) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const mod = parsedUrl.protocol === 'https:' ? https : http;
    const req = mod.request(url, { method: options.method || 'GET', headers: options.headers || {} }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ json: () => JSON.parse(body), code: res.statusCode, data: JSON.parse(body) });
        } catch { resolve({ json: () => ({}), code: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}