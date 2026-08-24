const crypto = require('crypto');
const request = require('supertest');
const express = require('express');

describe('GeniusPay Gateway & Webhook Security', () => {
  const WEBHOOK_SECRET = 'whsec_test_secret_key_12345';
  let geniuspayGateway;

  beforeAll(() => {
    process.env.GENIUSPAY_API_KEY = 'pk_test_123';
    process.env.GENIUSPAY_API_SECRET = 'sk_test_456';
    process.env.GENIUSPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.GENIUSPAY_BASE_URL = 'https://geniuspay.ci/api/v1/merchant';

    geniuspayGateway = require('./gateways/geniuspay.gateway');
  });

  describe('processWebhook signature & timestamp validation', () => {
    test('rejette si signature ou timestamp manquant', () => {
      const res1 = geniuspayGateway.processWebhook('{}', {});
      expect(res1.success).toBe(false);
      expect(res1.error).toMatch(/manquant/);

      const res2 = geniuspayGateway.processWebhook('{}', { signature: 'sig' });
      expect(res2.success).toBe(false);
      expect(res2.error).toMatch(/manquant/);
    });

    test('rejette si timestamp est expiré (> 300s anti-rejeu)', () => {
      const oldTimestamp = String(Math.floor(Date.now() / 1000) - 301);
      const rawBody = JSON.stringify({ event: 'payment.completed', data: { reference: 'MTX-101', status: 'completed' } });
      const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(`${oldTimestamp}.${rawBody}`)
        .digest('hex');

      const res = geniuspayGateway.processWebhook(rawBody, { signature, timestamp: oldTimestamp });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/expiré/);
    });

    test('rejette une signature falsifiée', () => {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const rawBody = JSON.stringify({ event: 'payment.completed', data: { reference: 'MTX-101', status: 'completed' } });
      const invalidSignature = 'a'.repeat(64);

      const res = geniuspayGateway.processWebhook(rawBody, { signature: invalidSignature, timestamp });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/invalide/);
    });

    test('accepte une signature valide et un timestamp récent', () => {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const rawBody = JSON.stringify({ event: 'payment.completed', data: { reference: 'MTX-101', status: 'completed' } });
      const validSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

      const res = geniuspayGateway.processWebhook(rawBody, { signature: validSignature, timestamp });
      expect(res.success).toBe(true);
      expect(res.transactionId).toBe('MTX-101');
      expect(res.status).toBe('completed');
      expect(res.event).toBe('payment.completed');
    });
  });

  describe('Route Express /webhook/geniuspay', () => {
    let app;

    beforeAll(() => {
      app = express();
      app.use(express.json({
        verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
      }));
      const paymentsRouter = require('./payments.routes');
      app.use('/api/v1/payments', paymentsRouter);
    });

    test('renvoie 401 si headers de signature manquants', async () => {
      const res = await request(app)
        .post('/api/v1/payments/webhook/geniuspay')
        .send({ event: 'payment.completed' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('renvoie 401 si signature invalide', async () => {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const res = await request(app)
        .post('/api/v1/payments/webhook/geniuspay')
        .set('x-webhook-signature', 'bad_sig')
        .set('x-webhook-timestamp', timestamp)
        .send({ event: 'payment.completed' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
