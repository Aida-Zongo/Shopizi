const crypto = require('crypto');
const PaymentGateway = require('./gateway.interface');
const config = require('../../../config/index');
const logger = require('../../../config/logger');

/**
 * GeniusPay payment gateway implementation.
 * GeniusPay is a West African payment aggregator supporting mobile money and cards.
 */
class GeniusPayGateway extends PaymentGateway {
  getGatewayName() {
    return 'geniuspay';
  }

  async initiatePayment({ amount, phoneNumber, description }) {
    const payload = {
      amount,
      currency: 'XOF',
      description: description || `Shopizi - Paiement (${amount} F CFA)`,
      success_url: config.geniuspay.successUrl,
      error_url: config.geniuspay.errorUrl,
    };

    if (phoneNumber) {
      payload.customer = { phone: phoneNumber };
    }

    try {
      const response = await fetch(`${config.geniuspay.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.geniuspay.apiKey,
          'X-API-Secret': config.geniuspay.apiSecret,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success && String(data.code) !== '200' && String(data.code) !== '201') {
        logger.error('GeniusPay initiation failed:', data);
        return { success: false, error: data.message || 'Erreur de paiement GeniusPay' };
      }

      return {
        success: true,
        gatewayTransactionId: data.data?.reference,
        paymentUrl: data.data?.checkout_url,
      };
    } catch (err) {
      logger.error('GeniusPay API error:', err);
      return { success: false, error: 'Service de paiement GeniusPay indisponible' };
    }
  }

  async verifyPayment(transactionReference) {
    try {
      const response = await fetch(`${config.geniuspay.baseUrl}/payments/${transactionReference}`, {
        method: 'GET',
        headers: {
          'X-API-Key': config.geniuspay.apiKey,
          'X-API-Secret': config.geniuspay.apiSecret,
        },
      });

      const data = await response.json();
      const isSuccess = Boolean(data.success) || String(data.code) === '200';

      return {
        success: isSuccess,
        status: data.data?.status || null,
        amount: data.data?.amount,
        data,
      };
    } catch (err) {
      logger.error('GeniusPay verify error:', err);
      return { success: false, error: 'Vérification GeniusPay indisponible' };
    }
  }

  processWebhook(rawBody, { signature, timestamp }) {
    if (!signature || !timestamp) {
      logger.warn('GeniusPay webhook: signature ou timestamp manquant');
      return { success: false, error: 'Signature ou timestamp manquant' };
    }

    const now = Math.floor(Date.now() / 1000);
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Math.abs(now - ts) > 300) {
      logger.warn('GeniusPay webhook: timestamp expiré (anti-rejeu)');
      return { success: false, error: 'Timestamp expiré (anti-rejeu)' };
    }

    const expectedSignature = crypto
      .createHmac('sha256', config.geniuspay.webhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      logger.warn('GeniusPay webhook: signature invalide');
      return { success: false, error: 'Signature invalide' };
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      logger.warn('GeniusPay webhook: JSON invalide');
      return { success: false, error: 'JSON invalide' };
    }

    return {
      success: true,
      event: payload.event,
      transactionId: payload.data?.reference,
      status: payload.data?.status,
    };
  }
}

module.exports = new GeniusPayGateway();

// Minimal fetch polyfill for Node <18
const https = require('https');
const http = require('http');

function fetch(url, options) {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch(url, options);
  }
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
