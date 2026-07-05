const eventBus = require('./index');
const generatorService = require('../services/generator/generator.service');
const { sendEmail } = require('../services/email/email.service');
const config = require('../config/index');
const logger = require('../config/logger');

// Shop events trigger site regeneration
eventBus.on('shop:updated', ({ shopId, changedFields }) => {
  const relevant = ['name','description','logo_url','banner_url','primary_color','secondary_color','opening_hours','whatsapp_number'];
  if (changedFields.some(f => relevant.includes(f))) {
    generatorService.queueGeneration(shopId, 'shop_update').catch(err => logger.error('Site generation failed:', err));
  }
});

eventBus.on('shop:published', ({ shopId }) => {
  generatorService.queueGeneration(shopId, 'shop_update').catch(err => logger.error('Site generation failed:', err));
});

eventBus.on('product:created', ({ shopId }) => {
  generatorService.queueGeneration(shopId, 'product_update').catch(err => logger.error('Site generation failed:', err));
});

eventBus.on('product:updated', ({ shopId }) => {
  generatorService.queueGeneration(shopId, 'product_update').catch(err => logger.error('Site generation failed:', err));
});

eventBus.on('product:deleted', ({ shopId }) => {
  generatorService.queueGeneration(shopId, 'product_update').catch(err => logger.error('Site generation failed:', err));
});

eventBus.on('product:image:added', ({ shopId }) => {
  generatorService.queueGeneration(shopId, 'image_update').catch(err => logger.error('Site generation failed:', err));
});

// Payment events
eventBus.on('payment:completed', async ({ userId, payment, planSlug }) => {
  try {
    await sendEmail({
      toEmail: '', templateSlug: 'payment_receipt', variables: {
        userId, amountXOF: payment.amount, planName: planSlug, transactionId: payment.id,
        paymentDate: new Date().toLocaleDateString('fr-FR'),
      }
    });
  } catch (err) { logger.error('Email failed:', err); }
});

logger.info('Event listeners registered');
