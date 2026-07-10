const crypto = require('crypto');
const { query, getClient } = require('../../db/pool');
const { hash, compare } = require('../../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../utils/jwt');
const { PLANS } = require('../../constants/plans');
const { seedDefaultCategories } = require('../categories/default-categories');
const eventBus = require('../../events');
const {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
} = require('../../utils/errors');

/**
 * Register a new user (merchant or driver).
 * -- Merchant: creates user + shop + free subscription.
 * -- Driver: creates user + delivery_driver record.
 */
async function register({ email, password, full_name, phone_number, role }) {
  // Check existing user
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new ConflictError('Un compte avec cet email existe déjà');
  }

  const password_hash = await hash(password);
  const email_verify_token = crypto.randomBytes(32).toString('hex');
  const userRole = role === 'driver' ? 'driver' : role === 'customer' ? 'customer' : 'merchant';

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Create user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, phone_number, email_verify_token, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, phone_number, role, email_verified, is_active, created_at`,
      [email, password_hash, full_name, phone_number, email_verify_token, userRole]
    );
    const user = userResult.rows[0];

    let shop = null;
    let driverRow = null;

    if (userRole === 'merchant') {
      // Get free plan
      const planResult = await client.query("SELECT id FROM plans WHERE slug = 'free'");
      const freePlanId = planResult.rows[0].id;

      // Create empty shop placeholder with unique temporary subdomain and slug
      const uniqueSuffix = user.id.slice(0, 8);
      const tempSubdomain = `shop-${uniqueSuffix}`;
      const baseSlug = full_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-+$)/g, '') || 'shop';
      const tempSlug = `${baseSlug}-${uniqueSuffix}`;

      const shopResult = await client.query(
        `INSERT INTO shops (user_id, subdomain, name, slug, category, whatsapp_number)
         VALUES ($1, $2, $3, $4, 'other', $5)
         RETURNING id`,
        [user.id, tempSubdomain, full_name, tempSlug, phone_number]
      );
      shop = shopResult.rows[0];

      // Seed default categories so the product form isn't empty
      await seedDefaultCategories((text, params) => client.query(text, params), shop.id);

      // Create free subscription
      const now = new Date();
      const endsAt = new Date(now.getFullYear() + 100, 0, 1);
      await client.query(
        `INSERT INTO subscriptions (user_id, plan_id, status, starts_at, ends_at)
         VALUES ($1, $2, 'active', $3, $4)`,
        [user.id, freePlanId, now, endsAt]
      );
    } else if (userRole === 'driver') {
      // Get city of Ouagadougou or fallback
      const cityResult = await client.query("SELECT id, name FROM cities WHERE name ILIKE 'Ouagadougou' LIMIT 1");
      const cityId = cityResult.rows[0]?.id || null;
      const cityName = cityResult.rows[0]?.name || 'Ouagadougou';

      // Create delivery driver profile
      const driverResult = await client.query(
        `INSERT INTO delivery_drivers (user_id, full_name, phone_number, email, status, commission_rate, city_id, city_name)
         VALUES ($1, $2, $3, $4, 'pending', 95, $5, $6) RETURNING id, status`,
        [user.id, full_name, phone_number, email, cityId, cityName]
      );
      driverRow = driverResult.rows[0];
    }

    // Generate tokens
    const tokenPayload = { userId: user.id, role: user.role, shopId: shop ? shop.id : null, planSlug: 'free' };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ userId: user.id });

    // Store refresh token hash
    const refreshTokenHash = await hash(refreshToken);
    await client.query('UPDATE users SET refresh_token_hash = $1 WHERE id = $2', [
      refreshTokenHash,
      user.id,
    ]);

    await client.query('COMMIT');

    // Emit event
    eventBus.emit('user:registered', { userId: user.id, email, fullName: full_name, role: userRole });

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        role: user.role,
        email_verified: user.email_verified,
        ...(userRole === 'driver' ? { driver_id: driverRow.id, driver_status: driverRow.status } : {}),
      },
      shop: shop ? { id: shop.id } : null,
      subscription: userRole === 'merchant' ? { plan: 'free', status: 'active' } : null,
      accessToken,
      refreshToken,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Login a user.
 */
async function login({ email, password }) {
  const result = await query(
    `SELECT u.id, u.email, u.password_hash, u.full_name, u.phone_number,
            u.role, u.email_verified, u.is_active, u.refresh_token_hash,
            s.id AS shop_id, sub.plan_id, p.slug AS plan_slug,
            d.id AS driver_id, d.status AS driver_status
     FROM users u
     LEFT JOIN shops s ON s.user_id = u.id
     LEFT JOIN subscriptions sub ON sub.user_id = u.id AND sub.status IN ('trial', 'active', 'past_due')
     LEFT JOIN plans p ON p.id = sub.plan_id
     LEFT JOIN delivery_drivers d ON d.user_id = u.id
     WHERE u.email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new UnauthorizedError('Email ou mot de passe incorrect');
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw new UnauthorizedError('Ce compte a été désactivé');
  }

  const validPassword = await compare(password, user.password_hash);
  if (!validPassword) {
    throw new UnauthorizedError('Email ou mot de passe incorrect');
  }

  // Update last login
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  // Generate tokens
  const planSlug = user.plan_slug || 'free';
  const tokenPayload = { userId: user.id, role: user.role, shopId: user.shop_id, planSlug };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken({ userId: user.id });

  // Store refresh token hash
  const refreshTokenHash = await hash(refreshToken);
  await query('UPDATE users SET refresh_token_hash = $1 WHERE id = $2', [
    refreshTokenHash,
    user.id,
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone_number: user.phone_number,
      role: user.role,
      email_verified: user.email_verified,
      driver_id: user.driver_id,
      driver_status: user.driver_status,
    },
    shop: user.shop_id ? { id: user.shop_id } : null,
    subscription: user.plan_slug ? { plan: user.plan_slug } : null,
    accessToken,
    refreshToken,
  };
}

/**
 * Refresh access token using a valid refresh token.
 */
async function refreshTokens(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Refresh token invalide ou expiré');
  }

  // Get user
  const result = await query(
    `SELECT u.id, u.role, u.refresh_token_hash, s.id AS shop_id, p.slug AS plan_slug
     FROM users u
     LEFT JOIN shops s ON s.user_id = u.id
     LEFT JOIN subscriptions sub ON sub.user_id = u.id AND sub.status IN ('trial', 'active', 'past_due')
     LEFT JOIN plans p ON p.id = sub.plan_id
     WHERE u.id = $1 AND u.is_active = true`,
    [decoded.userId]
  );

  if (result.rows.length === 0) {
    throw new UnauthorizedError('Utilisateur introuvable ou désactivé');
  }

  const user = result.rows[0];

  // Verify refresh token hash
  const validRefresh = user.refresh_token_hash
    ? await compare(refreshToken, user.refresh_token_hash)
    : false;
  if (!validRefresh) {
    throw new UnauthorizedError('Refresh token invalide');
  }

  // Issue new tokens
  const planSlug = user.plan_slug || 'free';
  const tokenPayload = { userId: user.id, role: user.role, shopId: user.shop_id, planSlug };
  const newAccessToken = signAccessToken(tokenPayload);
  const newRefreshToken = signRefreshToken({ userId: user.id });

  // Rotate refresh token
  const newRefreshTokenHash = await hash(newRefreshToken);
  await query('UPDATE users SET refresh_token_hash = $1 WHERE id = $2', [
    newRefreshTokenHash,
    user.id,
  ]);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Logout by clearing the refresh token.
 */
async function logout(userId) {
  await query('UPDATE users SET refresh_token_hash = NULL WHERE id = $1', [userId]);
  return { message: 'Déconnexion réussie' };
}

/**
 * Initiate forgot password flow.
 * Always returns success to not leak user existence.
 */
async function forgotPassword(email) {
  const result = await query('SELECT id, full_name FROM users WHERE email = $1 AND is_active = true', [email]);

  if (result.rows.length === 0) {
    // Don't leak user existence
    return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
  }

  const user = result.rows[0];
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1 hour

  await query(
    'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
    [token, expires, user.id]
  );

  // Emit event for email service
  eventBus.emit('user:forgot_password', {
    userId: user.id,
    email,
    fullName: user.full_name,
    token,
  });

  return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
}

/**
 * Reset password using a valid reset token.
 */
async function resetPassword(token, newPassword) {
  const result = await query(
    `SELECT id FROM users
     WHERE password_reset_token = $1
       AND password_reset_expires > NOW()
       AND is_active = true`,
    [token]
  );

  if (result.rows.length === 0) {
    throw new BadRequestError('Token invalide ou expiré');
  }

  const password_hash = await hash(newPassword);
  await query(
    `UPDATE users
     SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL
     WHERE id = $2`,
    [password_hash, result.rows[0].id]
  );

  return { message: 'Mot de passe réinitialisé avec succès' };
}

/**
 * Get current user context for the dashboard.
 */
async function getMe(userId) {
  const result = await query(
    `SELECT u.id, u.email, u.full_name, u.phone_number, u.role, u.email_verified,
            u.is_active, u.last_login_at, u.created_at,
            s.id AS shop_id, s.subdomain, s.name AS shop_name, s.slug AS shop_slug,
            s.category AS shop_category, s.description AS shop_description,
            s.whatsapp_number, s.logo_url, s.banner_url, s.is_published,
            s.primary_color, s.secondary_color,
            d.id AS driver_id, d.status AS driver_status,
            d.avg_rating AS driver_rating, d.total_deliveries AS driver_total_deliveries,
            d.balance_xof AS driver_balance, d.commission_rate AS driver_commission,
            sub.id AS subscription_id, sub.status AS subscription_status,
            sub.starts_at, sub.ends_at, sub.trial_ends_at, sub.auto_renew,
            p.id AS plan_id, p.slug AS plan_slug, p.name AS plan_name,
            p.price_monthly_xof, p.max_products, p.max_images_per_product,
            p.max_variants_per_product, p.max_categories, p.storage_mb,
            p.custom_domain, p.analytics, p.custom_colors, p.remove_branding,
            p.priority_support, p.trial_days
     FROM users u
     LEFT JOIN shops s ON s.user_id = u.id
     LEFT JOIN delivery_drivers d ON d.user_id = u.id
     LEFT JOIN subscriptions sub ON sub.user_id = u.id AND sub.status IN ('trial', 'active', 'past_due')
     LEFT JOIN plans p ON p.id = sub.plan_id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Utilisateur introuvable');
  }

  return result.rows[0];
}

/**
 * Update own profile.
 */
async function updateProfile(userId, { full_name, phone_number }) {
  const updates = [];
  const params = [];
  let paramIdx = 1;

  if (full_name !== undefined) {
    updates.push(`full_name = $${paramIdx++}`);
    params.push(full_name);
  }
  if (phone_number !== undefined) {
    updates.push(`phone_number = $${paramIdx++}`);
    params.push(phone_number);
  }

  if (updates.length === 0) return { message: 'Aucune modification' };

  params.push(userId);
  const result = await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx}
     RETURNING id, email, full_name, phone_number, role`,
    params
  );

  return result.rows[0];
}

/**
 * Change password.
 */
async function changePassword(userId, currentPassword, newPassword) {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    throw new NotFoundError('Utilisateur introuvable');
  }

  const valid = await compare(currentPassword, result.rows[0].password_hash);
  if (!valid) {
    throw new UnauthorizedError('Mot de passe actuel incorrect');
  }

  const password_hash = await hash(newPassword);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, userId]);

  return { message: 'Mot de passe modifié avec succès' };
}

module.exports = {
  register,
  login,
  refreshTokens,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
};
