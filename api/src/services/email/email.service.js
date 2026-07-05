const nodemailer = require('nodemailer');
const Handlebars = require('handlebars');
const { query } = require('../../db/pool');
const config = require('../../config/index');
const logger = require('../../config/logger');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

/**
 * Send an email using a template from the database.
 * Falls back to hardcoded templates if DB templates unavailable.
 */
async function sendEmail({ toEmail, toName, templateSlug, variables = {} }) {
  // Get template from DB
  let template = null;
  try {
    const r = await query(
      'SELECT * FROM email_templates WHERE slug = $1 AND is_active = true',
      [templateSlug]
    );
    template = r.rows[0];
  } catch { /* Use fallback below */ }

  if (!template) {
    template = getFallbackTemplate(templateSlug);
  }

  // Compile template
  const html = Handlebars.compile(template.body_html)(variables);
  const text = Handlebars.compile(template.body_text)(variables);
  const subject = Handlebars.compile(template.subject)(variables);

  // Log the email
  const log = await query(
    `INSERT INTO email_logs (user_id, to_email, to_name, subject, template_slug, status, metadata)
     VALUES ($1,$2,$3,$4,$5,'queued',$6) RETURNING id`,
    [variables.userId || null, toEmail, toName || '', subject, templateSlug, JSON.stringify(variables)]
  );

  // Send in production, log only in dev
  if (config.env === 'production' || config.smtp.host !== 'localhost') {
    try {
      const transport = getTransporter();
      await transport.sendMail({
        from: `"${config.smtp.fromName}" <${config.smtp.fromAddress}>`,
        to: toName ? `"${toName}" <${toEmail}>` : toEmail,
        subject,
        text,
        html,
      });
      await query("UPDATE email_logs SET status = 'sent', sent_at = NOW() WHERE id = $1", [log.rows[0].id]);
      logger.info(`Email sent: ${templateSlug} to ${toEmail}`);
    } catch (err) {
      await query("UPDATE email_logs SET status = 'failed', error_message = $1 WHERE id = $2",
        [err.message, log.rows[0].id]);
      logger.error(`Email failed: ${templateSlug} to ${toEmail}`, err);
    }
  } else {
    logger.info(`[DEV] Email (${templateSlug}) to ${toEmail}: ${subject}`);
    await query("UPDATE email_logs SET status = 'sent', sent_at = NOW() WHERE id = $1", [log.rows[0].id]);
  }

  return log.rows[0];
}

/**
 * Fallback templates when DB is not yet seeded.
 */
function getFallbackTemplate(slug) {
  const templates = {
    welcome: {
      subject: 'Bienvenue sur Shopizi, {{fullName}} !',
      body_html: '<h1>Bienvenue, {{fullName}} !</h1><p>Votre compte Shopizi est prêt.</p><p><a href="{{loginUrl}}">Connectez-vous</a> pour configurer votre boutique.</p>',
      body_text: 'Bienvenue, {{fullName}} ! Votre compte Shopizi est prêt. Connectez-vous : {{loginUrl}}',
    },
    payment_receipt: {
      subject: 'Votre paiement {{amountXOF}} F CFA a bien été reçu',
      body_html: '<h1>Paiement confirmé</h1><p>Montant : <strong>{{amountXOF}} F CFA</strong></p><p>Plan : {{planName}}</p><p>Merci !</p>',
      body_text: 'Paiement confirmé - Montant : {{amountXOF}} F CFA - Plan : {{planName}}',
    },
    renewal_reminder: {
      subject: 'Rappel : votre abonnement {{planName}} expire dans {{daysLeft}} jours',
      body_html: '<h1>Abonnement bientôt expiré</h1><p>Plan : {{planName}}</p><p>Il reste <strong>{{daysLeft}} jours</strong>.</p><p><a href="{{renewUrl}}">Renouvelez maintenant</a></p>',
      body_text: 'Abonnement {{planName}} expire dans {{daysLeft}} jours. Renouvelez : {{renewUrl}}',
    },
    subscription_expired: {
      subject: 'Votre abonnement {{planName}} a expiré',
      body_html: '<h1>Abonnement expiré</h1><p>Plan {{planName}} expiré le {{endsAt}}.</p><p>Vous êtes passé au plan Gratuit.</p><p><a href="{{renewUrl}}">Réactivez</a></p>',
      body_text: 'Abonnement {{planName}} expiré le {{endsAt}}. Réactivez : {{renewUrl}}',
    },
    new_order: {
      subject: 'Nouvelle commande #{{orderNumber}} - {{customerName}}',
      body_html: '<h1>Nouvelle commande !</h1><p>#{{orderNumber}} - {{customerName}} ({{customerPhone}})</p><p>{{customerMessage}}</p>',
      body_text: 'Nouvelle commande #{{orderNumber}} de {{customerName}} : {{customerMessage}}',
    },
  };
  return templates[slug] || { subject: 'Shopizi', body_html: '<p>{{message}}</p>', body_text: '{{message}}' };
}

module.exports = { sendEmail };