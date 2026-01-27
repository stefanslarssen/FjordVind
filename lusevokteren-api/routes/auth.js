// Authentication routes for FjordVind/Lusevokteren
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Joi = require('joi');
const pool = require('../config/database');
const { generateToken, requireAuth, DEMO_MODE, setAuthCookie, clearAuthCookie, extractToken, verifyToken } = require('../middleware/auth');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail
} = require('../services/email');

// Helper: Generate secure random token
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ============================================================
// PASSORDKRAV (SIKKERHET)
// ============================================================
// Minst 8 tegn, må inneholde:
// - Minst én stor bokstav (A-Z)
// - Minst én liten bokstav (a-z)
// - Minst ett tall (0-9)
// - Minst ett spesialtegn (!@#$%^&*(),.?":{}|<>)
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
const PASSWORD_ERROR = 'Passord må være minst 8 tegn og inneholde minst én stor bokstav, én liten bokstav, ett tall og ett spesialtegn';

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Ugyldig e-postadresse',
    'any.required': 'E-post er påkrevd'
  }),
  password: Joi.string().min(8).pattern(PASSWORD_REGEX).required().messages({
    'string.min': 'Passord må være minst 8 tegn',
    'string.pattern.base': PASSWORD_ERROR,
    'any.required': 'Passord er påkrevd'
  }),
  full_name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Navn må være minst 2 tegn',
    'any.required': 'Navn er påkrevd'
  }),
  company_name: Joi.string().min(2).max(200).optional(),
  org_number: Joi.string().pattern(/^\d{9}$/).optional().messages({
    'string.pattern.base': 'Organisasjonsnummer må være 9 siffer'
  }),
  role: Joi.string().valid('admin', 'driftsleder', 'røkter').default('røkter')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Ugyldig e-postadresse',
    'any.required': 'E-post er påkrevd'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Passord er påkrevd'
  })
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(8).pattern(PASSWORD_REGEX).required().messages({
    'string.min': 'Nytt passord må være minst 8 tegn',
    'string.pattern.base': PASSWORD_ERROR
  })
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Ugyldig e-postadresse',
    'any.required': 'E-post er påkrevd'
  })
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().length(64).required().messages({
    'string.length': 'Ugyldig token',
    'any.required': 'Token er påkrevd'
  }),
  password: Joi.string().min(8).pattern(PASSWORD_REGEX).required().messages({
    'string.min': 'Passord må være minst 8 tegn',
    'string.pattern.base': PASSWORD_ERROR,
    'any.required': 'Passord er påkrevd'
  })
});

/**
 * POST /api/auth/register - Register new user
 */
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Valideringsfeil',
        details: error.details.map(d => d.message)
      });
    }

    const { email, password, full_name, company_name, org_number, role } = value;

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'E-postadressen er allerede registrert',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Create company if provided
    let company_id = null;
    if (company_name) {
      const companyResult = await pool.query(
        `INSERT INTO companies (name, org_number, contact_email)
         VALUES ($1, $2, $3)
         ON CONFLICT (org_number) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [company_name, org_number || null, email.toLowerCase()]
      );
      company_id = companyResult.rows[0]?.id;
    }

    // Create user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, company_id, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, email, full_name, role, company_id, created_at`,
      [email.toLowerCase(), password_hash, full_name, role, company_id]
    );

    const user = userResult.rows[0];

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
      full_name: user.full_name
    });

    // Set httpOnly cookie
    setAuthCookie(res, token);

    res.status(201).json({
      message: 'Bruker opprettet',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        company_id: user.company_id
      },
      token  // Still return token for backwards compatibility with API clients
    });

  } catch (error) {
    console.error('Registration error:', error);

    // Handle database errors gracefully
    if (error.code === '42P01') {
      // Table doesn't exist - return demo response
      if (DEMO_MODE) {
        const token = generateToken({
          id: 'new-user-' + Date.now(),
          email: req.body.email,
          role: req.body.role || 'røkter',
          company_id: null,
          full_name: req.body.full_name
        });

        return res.status(201).json({
          message: 'Bruker opprettet (demo-modus)',
          user: {
            id: 'new-user-' + Date.now(),
            email: req.body.email,
            full_name: req.body.full_name,
            role: req.body.role || 'røkter'
          },
          token,
          _demo: true
        });
      }
    }

    res.status(500).json({ error: 'Kunne ikke opprette bruker' });
  }
});

/**
 * POST /api/auth/login - Login user
 */
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Valideringsfeil',
        details: error.details.map(d => d.message)
      });
    }

    const { email, password } = value;

    // Demo users for testing
    const DEMO_LOGINS = {
      'admin@fjordvind.no': { password: 'admin123', id: 'demo-1', full_name: 'Admin Bruker', role: 'admin' },
      'leder@fjordvind.no': { password: 'leder123', id: 'demo-2', full_name: 'Ole Dansen', role: 'driftsleder' },
      'rokter@fjordvind.no': { password: 'rokter123', id: 'demo-3', full_name: 'Kari Hansen', role: 'røkter' },
      'demo@fjordvind.no': { password: 'demo1234', id: 'demo-user', full_name: 'Demo Bruker', role: 'driftsleder' }
    };

    // Demo login - always available in demo mode
    const demoUser = DEMO_LOGINS[email.toLowerCase()];
    if (DEMO_MODE && demoUser && password === demoUser.password) {
      const token = generateToken({
        id: demoUser.id,
        email: email.toLowerCase(),
        role: demoUser.role,
        company_id: 'demo-company',
        full_name: demoUser.full_name
      });

      // Set httpOnly cookie
      setAuthCookie(res, token);

      return res.json({
        message: 'Innlogget (demo-modus)',
        user: {
          id: demoUser.id,
          email: email.toLowerCase(),
          full_name: demoUser.full_name,
          role: demoUser.role
        },
        token,  // Still return for backwards compatibility
        _demo: true
      });
    }

    // Find user
    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, role, company_id, is_active
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Ugyldig e-post eller passord',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Kontoen er deaktivert',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        error: 'Ugyldig e-post eller passord',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
      full_name: user.full_name
    });

    // Set httpOnly cookie
    setAuthCookie(res, token);

    res.json({
      message: 'Innlogget',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        company_id: user.company_id
      },
      token  // Still return for backwards compatibility with API clients
    });

  } catch (error) {
    console.error('Login error:', error);

    // Handle database errors - allow demo login
    if (DEMO_MODE && error.code === '42P01') {
      // Demo login for testing
      if (req.body.email === 'demo@fjordvind.no' && req.body.password === 'demo1234') {
        const token = generateToken({
          id: 'demo-user',
          email: 'demo@fjordvind.no',
          role: 'driftsleder',
          company_id: 'demo-company',
          full_name: 'Demo Bruker'
        });

        return res.json({
          message: 'Innlogget (demo-modus)',
          user: {
            id: 'demo-user',
            email: 'demo@fjordvind.no',
            full_name: 'Demo Bruker',
            role: 'driftsleder'
          },
          token,
          _demo: true
        });
      }
    }

    res.status(500).json({ error: 'Innlogging feilet' });
  }
});

/**
 * GET /api/auth/me - Get current user info
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    // Get fresh user data from database
    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.company_id, u.created_at, u.last_login,
              c.name as company_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // Return token data if user not in DB (demo mode)
      return res.json({
        user: req.user,
        _demo: true
      });
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        company_id: user.company_id,
        company_name: user.company_name,
        created_at: user.created_at,
        last_login: user.last_login
      }
    });

  } catch (error) {
    console.error('Get user error:', error);

    // Return token data on DB error
    res.json({
      user: req.user,
      _demo: true
    });
  }
});

/**
 * POST /api/auth/change-password - Change password
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Valideringsfeil',
        details: error.details.map(d => d.message)
      });
    }

    const { current_password, new_password } = value;

    // Get current password hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bruker ikke funnet' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({
        error: 'Nåværende passord er feil',
        code: 'INVALID_PASSWORD'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(new_password, salt);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, req.user.id]
    );

    res.json({ message: 'Passord endret' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Kunne ikke endre passord' });
  }
});

/**
 * POST /api/auth/refresh - Refresh token
 */
router.post('/refresh', requireAuth, (req, res) => {
  // Generate new token with same user data
  const token = generateToken(req.user);

  // Set new httpOnly cookie
  setAuthCookie(res, token);

  res.json({
    message: 'Token fornyet',
    token  // Still return for backwards compatibility
  });
});

/**
 * POST /api/auth/logout - Logout (clears httpOnly cookie and revokes token)
 */
router.post('/logout', async (req, res) => {
  try {
    // Get the current token
    const token = extractToken(req);

    if (token && !token.startsWith('demo_token_')) {
      // Verify and decode the token to get expiry
      const decoded = verifyToken(token);

      if (decoded) {
        // Hash the token for storage (don't store raw tokens)
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Calculate expiry from token (or use default 7 days)
        const expiresAt = decoded.exp
          ? new Date(decoded.exp * 1000)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Add to revoked tokens table
        await pool.query(
          `INSERT INTO revoked_tokens (token_hash, user_id, expires_at)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [tokenHash, decoded.sub, expiresAt]
        );
      }
    }
  } catch (error) {
    // Log but don't fail - cookie clearing is the important part
    console.warn('Token revocation warning:', error.message);
  }

  // Always clear the httpOnly cookie
  clearAuthCookie(res);
  res.json({ message: 'Logget ut' });
});

/**
 * POST /api/auth/forgot-password - Request password reset
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Valideringsfeil',
        details: error.details.map(d => d.message)
      });
    }

    const { email } = value;

    // Find user (don't reveal if email exists or not for security)
    const result = await pool.query(
      'SELECT id, email, full_name FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    // Always return success to prevent email enumeration
    const successMessage = 'Hvis e-postadressen er registrert, vil du motta en e-post med instruksjoner.';

    if (result.rows.length === 0) {
      // User not found, but don't reveal this
      return res.json({ message: successMessage });
    }

    const user = result.rows[0];

    // Delete any existing reset tokens for this user
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1',
      [user.id]
    );

    // Generate reset token
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [user.id, token, expiresAt, req.ip]
    );

    // Send email
    try {
      await sendPasswordResetEmail(user, token);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't fail the request if email fails in dev
    }

    res.json({ message: successMessage });

  } catch (error) {
    console.error('Forgot password error:', error);

    // Handle missing table gracefully
    if (error.code === '42P01') {
      return res.json({
        message: 'Hvis e-postadressen er registrert, vil du motta en e-post med instruksjoner.',
        _demo: true
      });
    }

    res.status(500).json({ error: 'Kunne ikke behandle forespørselen' });
  }
});

/**
 * POST /api/auth/reset-password - Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Valideringsfeil',
        details: error.details.map(d => d.message)
      });
    }

    const { token, password } = value;

    // Find valid token
    const tokenResult = await pool.query(
      `SELECT prt.id, prt.user_id, u.email, u.full_name
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1
         AND prt.expires_at > NOW()
         AND prt.used_at IS NULL`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Ugyldig eller utløpt token',
        code: 'INVALID_TOKEN'
      });
    }

    const resetToken = tokenResult.rows[0];

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, resetToken.user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [resetToken.id]
    );

    // Send notification email
    try {
      await sendPasswordChangedEmail({
        email: resetToken.email,
        full_name: resetToken.full_name
      });
    } catch (emailError) {
      console.error('Failed to send password changed email:', emailError);
    }

    res.json({ message: 'Passord er tilbakestilt. Du kan nå logge inn.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Kunne ikke tilbakestille passord' });
  }
});

/**
 * POST /api/auth/resend-verification - Resend verification email
 */
router.post('/resend-verification', requireAuth, async (req, res) => {
  try {
    // Check if already verified
    const userResult = await pool.query(
      'SELECT id, email, full_name, email_verified FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bruker ikke funnet' });
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      return res.json({ message: 'E-postadressen er allerede verifisert' });
    }

    // Delete existing verification tokens
    await pool.query(
      'DELETE FROM email_verification_tokens WHERE user_id = $1',
      [user.id]
    );

    // Generate new token
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    // Send verification email
    try {
      await sendVerificationEmail(user, token);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    res.json({ message: 'Verifiserings-e-post sendt' });

  } catch (error) {
    console.error('Resend verification error:', error);

    // Handle missing table
    if (error.code === '42P01') {
      return res.json({ message: 'Verifiserings-e-post sendt', _demo: true });
    }

    res.status(500).json({ error: 'Kunne ikke sende verifiserings-e-post' });
  }
});

/**
 * GET /api/auth/verify-email - Verify email with token
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || token.length !== 64) {
      return res.status(400).json({
        error: 'Ugyldig token',
        code: 'INVALID_TOKEN'
      });
    }

    // Find valid token
    const tokenResult = await pool.query(
      `SELECT evt.id, evt.user_id
       FROM email_verification_tokens evt
       WHERE evt.token = $1
         AND evt.expires_at > NOW()
         AND evt.used_at IS NULL`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Ugyldig eller utløpt token',
        code: 'INVALID_TOKEN'
      });
    }

    const verifyToken = tokenResult.rows[0];

    // Update user as verified
    await pool.query(
      `UPDATE users SET email_verified = true, email_verified_at = NOW()
       WHERE id = $1`,
      [verifyToken.user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1',
      [verifyToken.id]
    );

    // Redirect to frontend or return success
    const frontendUrl = process.env.APP_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?verified=true`);

  } catch (error) {
    console.error('Verify email error:', error);

    // Handle missing table
    if (error.code === '42P01') {
      const frontendUrl = process.env.APP_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?verified=demo`);
    }

    res.status(500).json({ error: 'Kunne ikke verifisere e-post' });
  }
});

module.exports = router;
