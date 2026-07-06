const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function findOrCreateUser(email, name, provider, providerId) {
  let result = await pool.query(
    'SELECT * FROM users WHERE email = $1', [email]
  );
  if (result.rows.length > 0) return result.rows[0];
  
  result = await pool.query(
    `INSERT INTO users (email, full_name, role, provider, provider_id, 
     is_verified, created_at)
     VALUES ($1, $2, 'customer', $3, $4, true, NOW())
     RETURNING *`,
    [email, name, provider, providerId]
  );
  return result.rows[0];
}

// Ne configurer les stratégies OAuth que si les clés sont réellement présentes.
// Sinon passport-oauth2 lève "OAuth2Strategy requires a clientID option" au boot
// (ex. déploiement Render sans clés Google/Facebook).
if (process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_ID !== 'change-me' &&
    process.env.GOOGLE_CLIENT_ID !== 'coller_ici') {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const name = profile.displayName;
      const user = await findOrCreateUser(email, name, 'google', profile.id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  }));
}

if (process.env.FACEBOOK_APP_ID &&
    process.env.FACEBOOK_APP_ID !== 'change-me' &&
    process.env.FACEBOOK_APP_ID !== 'coller_ici') {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL,
    profileFields: ['id', 'emails', 'name'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value ||
                    `fb_${profile.id}@shopizi.bf`;
      const name = `${profile.name.givenName} ${profile.name.familyName}`;
      const user = await findOrCreateUser(email, name, 'facebook', profile.id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  }));
}

module.exports = passport;
