/**
 * Tests de sécurité — Audit corrective fixes
 *
 * Test 1 : Webhook PayDunya — requête forgée sans hash valide → 400
 * Test 2 : Config JWT — le serveur refuse de démarrer en production
 *           si JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / INTERNAL_API_KEY
 *           sont absents ou contiennent "change-in-production".
 */

const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────
// SUITE 1 : Webhook PayDunya — hash SHA-512 obligatoire
// ─────────────────────────────────────────────────────────────────
describe('PayDunya webhook security', () => {
  let app;
  const MASTER_KEY = 'fake-master-key-for-test-only';

  beforeAll(() => {
    process.env.PAYDUNYA_MASTER_KEY  = MASTER_KEY;
    process.env.PAYDUNYA_PRIVATE_KEY = 'fake-priv';
    process.env.PAYDUNYA_TOKEN       = 'fake-token';
    process.env.PAYDUNYA_PUBLIC_KEY  = 'fake-pub';
    process.env.PAYDUNYA_MODE        = 'test';

    const express = require('express');
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    const paymentsRouter = require('./payments.routes');
    app.use('/api/v1/payments', paymentsRouter);
  });

  const request = require('supertest');

  test('rejette une requête sans hash (corps vide)', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webhook/paydunya')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejette une requête avec un hash SHA-512 incorrect', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webhook/paydunya')
      .send({ hash: 'invalid-hash-that-does-not-match' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejette une requête avec hash forgé d\'une autre clé', async () => {
    const wrongHash = crypto.createHash('sha512').update('wrong-master-key').digest('hex');
    const res = await request(app)
      .post('/api/v1/payments/webhook/paydunya')
      .send({ hash: wrongHash });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejette si hash correct mais token manquant', async () => {
    const validHash = crypto.createHash('sha512').update(MASTER_KEY).digest('hex');
    const res = await request(app)
      .post('/api/v1/payments/webhook/paydunya')
      .send({ hash: validHash });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// SUITE 2 : Config JWT — validation des secrets en production
// ─────────────────────────────────────────────────────────────────
describe('Config JWT — protection secrets en production', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  test('lance une erreur si JWT_ACCESS_SECRET absent en production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET = '';
    process.env.JWT_REFRESH_SECRET = 'real-refresh-secret-abcdefghijklmnopqrstuvwxyz';
    process.env.INTERNAL_API_KEY  = 'real-internal-key-abcdefghijklmnopqrstuvwxyz';
    expect(() => require('../../config/index')).toThrow(/JWT_ACCESS_SECRET/);
  });

  test('lance une erreur si JWT_ACCESS_SECRET contient "change-in-production"', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET = 'dev-access-secret-change-in-production';
    process.env.JWT_REFRESH_SECRET = 'real-refresh-secret-abcdefghijklmnopqrstuvwxyz';
    process.env.INTERNAL_API_KEY  = 'real-internal-key-abcdefghijklmnopqrstuvwxyz';
    expect(() => require('../../config/index')).toThrow(/JWT_ACCESS_SECRET/);
  });

  test('lance une erreur si JWT_REFRESH_SECRET absent en production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET = 'real-access-secret-abcdefghijklmnopqrstuvwxyz';
    process.env.JWT_REFRESH_SECRET = '';
    process.env.INTERNAL_API_KEY  = 'real-internal-key-abcdefghijklmnopqrstuvwxyz';
    expect(() => require('../../config/index')).toThrow(/JWT_REFRESH_SECRET/);
  });

  test('lance une erreur si INTERNAL_API_KEY contient "change-in-production"', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET  = 'real-access-secret-abcdefghijklmnopqrstuvwxyz';
    process.env.JWT_REFRESH_SECRET = 'real-refresh-secret-abcdefghijklmnopqrstuvwxyz';
    process.env.INTERNAL_API_KEY   = 'dev-internal-key-change-in-production';
    expect(() => require('../../config/index')).toThrow(/INTERNAL_API_KEY/);
  });

  test('ne lance PAS d\'erreur avec des secrets valides en production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET  = 'real-strong-access-secret-min-32-chars-xyz';
    process.env.JWT_REFRESH_SECRET = 'real-strong-refresh-secret-min-32-chars-xyz';
    process.env.INTERNAL_API_KEY   = 'real-strong-internal-api-key-min-32-chars-xyz';
    expect(() => require('../../config/index')).not.toThrow();
  });

  test('ne lance PAS d\'erreur en développement même sans secrets', () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_ACCESS_SECRET = '';
    process.env.JWT_REFRESH_SECRET = '';
    process.env.INTERNAL_API_KEY = '';
    expect(() => require('../../config/index')).not.toThrow();
  });
});
