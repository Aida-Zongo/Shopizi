const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '7d' }
  );
}

// Google
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'], 
    session: false 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    session: false, 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed` 
  }),
  (req, res) => {
    const token = generateToken(req.user);
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${token}&role=${req.user.role}` 
    );
  }
);

// Facebook
router.get('/facebook',
  passport.authenticate('facebook', { 
    scope: ['email'], 
    session: false 
  })
);

router.get('/facebook/callback',
  passport.authenticate('facebook', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=facebook_failed` 
  }),
  (req, res) => {
    const token = generateToken(req.user);
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${token}&role=${req.user.role}` 
    );
  }
);

module.exports = router;
