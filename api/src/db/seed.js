const { pool } = require('./pool');
const logger = require('../config/logger');

/**
 * Seed the database with initial data (plans, superadmin).
 */
async function seed() {
  logger.info('Starting database seeding...');

  // Seed plans
  const plansExist = await pool.query('SELECT COUNT(*)::int AS count FROM plans');
  if (plansExist.rows[0].count === 0) {
    await pool.query(`
      INSERT INTO plans (slug, name, description, price_monthly_xof, price_yearly_xof,
        max_products, max_images_per_product, max_variants_per_product, max_categories,
        storage_mb, custom_domain, analytics, custom_colors, remove_branding,
        priority_support, trial_days, sort_order)
      VALUES
        ('free', 'Gratuit', 'Pour démarrer et tester la plateforme',
         0, 0, 15, 3, 0, 5, 50, false, false, false, false, false, 0, 1),
        ('pro', 'Pro', 'Pour les commerçants sérieux qui veulent développer leur activité',
         7500, 75000, 100, 8, 6, 20, 500, false, true, true, false, false, 14, 2),
        ('business', 'Business', 'Pour les entreprises établies avec des besoins avancés',
         20000, 200000, 500, 20, 50, 100, 5000, true, true, true, true, true, 14, 3)
    `);
    logger.info('  ✓ Plans seeded: Gratuit, Pro, Business');
  } else {
    logger.info('  ✓ Plans already exist, skipping.');
  }

  // Seed email templates
  const templatesExist = await pool.query('SELECT COUNT(*)::int AS count FROM email_templates');
  if (templatesExist.rows[0].count === 0) {
    await pool.query(`
      INSERT INTO email_templates (slug, name, subject, body_html, body_text, available_variables)
      VALUES
        ('welcome', 'Bienvenue sur Shopizi',
         'Bienvenue sur Shopizi, {{fullName}} !',
         '<h1>Bienvenue, {{fullName}} !</h1><p>Votre compte Shopizi est prêt.</p><p><a href="{{loginUrl}}">Connectez-vous</a> pour configurer votre boutique.</p>',
         'Bienvenue, {{fullName}} ! Votre compte Shopizi est prêt. Connectez-vous : {{loginUrl}}',
         '["fullName","loginUrl","shopName"]'),
        ('payment_receipt', 'Reçu de paiement',
         'Votre paiement {{amountXOF}} F CFA a bien été reçu',
         '<h1>Paiement confirmé</h1><p>Montant : <strong>{{amountXOF}} F CFA</strong></p><p>Plan : {{planName}}</p><p>Merci de votre confiance !</p>',
         'Paiement confirmé - Montant : {{amountXOF}} F CFA - Plan : {{planName}}',
         '["amountXOF","planName","transactionId","paymentDate"]'),
        ('renewal_reminder', 'Rappel : votre abonnement expire bientôt',
         'Rappel : votre abonnement {{planName}} expire dans {{daysLeft}} jours',
         '<h1>Votre abonnement arrive bientôt à expiration</h1><p>Plan : {{planName}}</p><p>Il vous reste <strong>{{daysLeft}} jours</strong>.</p><p><a href="{{renewUrl}}">Renouvelez maintenant</a> pour éviter toute interruption.</p>',
         'Votre abonnement {{planName}} expire dans {{daysLeft}} jours. Renouvelez ici : {{renewUrl}}',
         '["planName","daysLeft","renewUrl","endsAt"]'),
        ('subscription_expired', 'Votre abonnement a expiré',
         'Votre abonnement {{planName}} a expiré',
         '<h1>Abonnement expiré</h1><p>Votre plan {{planName}} est expiré depuis le {{endsAt}}.</p><p>Votre boutique a été rétrogradée au plan Gratuit.</p><p><a href="{{renewUrl}}">Réactivez votre plan</a> pour retrouver toutes vos fonctionnalités.</p>',
         'Abonnement expiré - Plan : {{planName}} - Expiré le : {{endsAt}} - Réactivez ici : {{renewUrl}}',
         '["planName","endsAt","renewUrl"]'),
        ('new_order', 'Nouvelle commande reçue',
         'Nouvelle commande #{{orderNumber}} - {{customerName}}',
         '<h1>Nouvelle commande !</h1><p>Commande : <strong>#{{orderNumber}}</strong></p><p>Client : {{customerName}}</p><p>Téléphone : {{customerPhone}}</p><p>Message : {{customerMessage}}</p><p><a href="{{dashboardUrl}}">Voir dans le dashboard</a></p>',
         'Nouvelle commande #{{orderNumber}} de {{customerName}} ({{customerPhone}}) - Message : {{customerMessage}}',
         '["orderNumber","customerName","customerPhone","customerMessage","dashboardUrl"]')
    `);
    logger.info('  ✓ Email templates seeded: welcome, payment_receipt, renewal_reminder, subscription_expired, new_order');
  } else {
    logger.info('  ✓ Email templates already exist, skipping.');
  }

  logger.info('Seeding completed successfully.');
}

// Run if called directly
if (require.main === module) {
  seed()
    .then(() => {
      logger.info('Seed finished.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Seed failed:', err);
      process.exit(1);
    });
}

module.exports = { seed };