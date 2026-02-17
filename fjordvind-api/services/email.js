/**
 * Email Service
 * Supports multiple providers: SendGrid, SMTP, or console logging for development
 */

const logger = require('../utils/logger');

// Email provider configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'console'; // 'sendgrid', 'smtp', 'console'
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@fjordvind.no';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'FjordVind Lusevokteren';

// SendGrid configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

// SMTP configuration
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

// App URLs
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Send email using configured provider
 */
async function sendEmail({ to, subject, text, html }) {
  const emailData = {
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to,
    subject,
    text,
    html: html || text,
  };

  switch (EMAIL_PROVIDER) {
    case 'sendgrid':
      return sendWithSendGrid(emailData);
    case 'smtp':
      return sendWithSMTP(emailData);
    case 'console':
    default:
      return sendToConsole(emailData);
  }
}

/**
 * Send email via SendGrid
 */
async function sendWithSendGrid(emailData) {
  if (!SENDGRID_API_KEY) {
    logger.warn('SendGrid API key not configured, falling back to console');
    return sendToConsole(emailData);
  }

  try {
    // Dynamic import to avoid requiring sendgrid if not used
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(SENDGRID_API_KEY);

    await sgMail.send({
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    });

    logger.info('Email sent via SendGrid', { to: emailData.to, subject: emailData.subject });
    return { success: true, provider: 'sendgrid' };
  } catch (error) {
    logger.error('SendGrid email failed', { error: error.message, to: emailData.to });
    throw error;
  }
}

/**
 * Send email via SMTP (nodemailer)
 */
async function sendWithSMTP(emailData) {
  if (!SMTP_HOST || !SMTP_USER) {
    logger.warn('SMTP not configured, falling back to console');
    return sendToConsole(emailData);
  }

  try {
    // Dynamic import to avoid requiring nodemailer if not used
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    });

    logger.info('Email sent via SMTP', { to: emailData.to, subject: emailData.subject });
    return { success: true, provider: 'smtp' };
  } catch (error) {
    logger.error('SMTP email failed', { error: error.message, to: emailData.to });
    throw error;
  }
}

/**
 * Log email to console (development mode)
 */
async function sendToConsole(emailData) {
  console.log('\n' + '='.repeat(60));
  console.log('📧 EMAIL (Development Mode)');
  console.log('='.repeat(60));
  console.log(`From: ${emailData.from}`);
  console.log(`To: ${emailData.to}`);
  console.log(`Subject: ${emailData.subject}`);
  console.log('-'.repeat(60));
  console.log(emailData.text);
  console.log('='.repeat(60) + '\n');

  logger.info('Email logged to console', { to: emailData.to, subject: emailData.subject });
  return { success: true, provider: 'console' };
}

// =============================================
// EMAIL TEMPLATES
// =============================================

/**
 * Send email verification email
 */
async function sendVerificationEmail(user, token) {
  const verifyUrl = `${API_URL}/api/auth/verify-email?token=${token}`;

  const subject = 'Bekreft din e-postadresse - FjordVind Lusevokteren';

  const text = `
Hei ${user.full_name || 'der'}!

Velkommen til FjordVind Lusevokteren!

Klikk på lenken nedenfor for å bekrefte din e-postadresse:
${verifyUrl}

Denne lenken utløper om 24 timer.

Hvis du ikke opprettet denne kontoen, kan du ignorere denne e-posten.

Med vennlig hilsen,
FjordVind-teamet
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🐟 FjordVind Lusevokteren</h1>
    </div>
    <div class="content">
      <h2>Velkommen, ${user.full_name || 'der'}!</h2>
      <p>Takk for at du registrerte deg hos FjordVind Lusevokteren.</p>
      <p>Klikk på knappen nedenfor for å bekrefte din e-postadresse:</p>
      <p style="text-align: center;">
        <a href="${verifyUrl}" class="button">Bekreft e-postadresse</a>
      </p>
      <p><small>Eller kopier denne lenken til nettleseren din:<br>${verifyUrl}</small></p>
      <p><em>Denne lenken utløper om 24 timer.</em></p>
    </div>
    <div class="footer">
      <p>Hvis du ikke opprettet denne kontoen, kan du ignorere denne e-posten.</p>
      <p>&copy; ${new Date().getFullYear()} FjordVind AS</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({ to: user.email, subject, text, html });
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const subject = 'Tilbakestill passord - FjordVind Lusevokteren';

  const text = `
Hei ${user.full_name || 'der'}!

Vi mottok en forespørsel om å tilbakestille passordet ditt.

Klikk på lenken nedenfor for å lage et nytt passord:
${resetUrl}

Denne lenken utløper om 1 time.

Hvis du ikke ba om å tilbakestille passordet, kan du ignorere denne e-posten.
Passordet ditt vil ikke bli endret.

Med vennlig hilsen,
FjordVind-teamet
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #cc6600; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #cc6600; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Tilbakestill passord</h1>
    </div>
    <div class="content">
      <h2>Hei, ${user.full_name || 'der'}!</h2>
      <p>Vi mottok en forespørsel om å tilbakestille passordet ditt for FjordVind Lusevokteren.</p>
      <p>Klikk på knappen nedenfor for å lage et nytt passord:</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Tilbakestill passord</a>
      </p>
      <p><small>Eller kopier denne lenken til nettleseren din:<br>${resetUrl}</small></p>
      <p><em>Denne lenken utløper om 1 time.</em></p>
      <div class="warning">
        <strong>⚠️ Sikkerhetstips:</strong> Hvis du ikke ba om dette, kan du ignorere denne e-posten.
        Passordet ditt vil ikke bli endret med mindre du klikker på lenken ovenfor.
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} FjordVind AS</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({ to: user.email, subject, text, html });
}

/**
 * Send password changed notification
 */
async function sendPasswordChangedEmail(user) {
  const subject = 'Passordet ditt er endret - FjordVind Lusevokteren';

  const text = `
Hei ${user.full_name || 'der'}!

Passordet ditt for FjordVind Lusevokteren ble nylig endret.

Hvis du gjorde denne endringen, kan du ignorere denne e-posten.

Hvis du IKKE endret passordet ditt, vennligst kontakt oss umiddelbart
eller tilbakestill passordet ditt her: ${APP_URL}/forgot-password

Med vennlig hilsen,
FjordVind-teamet
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .warning { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Passord endret</h1>
    </div>
    <div class="content">
      <h2>Hei, ${user.full_name || 'der'}!</h2>
      <p>Passordet ditt for FjordVind Lusevokteren ble nylig endret.</p>
      <p>Hvis du gjorde denne endringen, trenger du ikke å gjøre noe mer.</p>
      <div class="warning">
        <strong>⚠️ Ikke du?</strong><br>
        Hvis du IKKE endret passordet ditt, bør du umiddelbart:
        <ol>
          <li><a href="${APP_URL}/forgot-password">Tilbakestille passordet ditt</a></li>
          <li>Kontakte vår support</li>
        </ol>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} FjordVind AS</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({ to: user.email, subject, text, html });
}

/**
 * Send welcome email after verification
 */
async function sendWelcomeEmail(user) {
  const subject = 'Velkommen til FjordVind Lusevokteren!';

  const text = `
Hei ${user.full_name || 'der'}!

Kontoen din er nå bekreftet og klar til bruk!

Logg inn her: ${APP_URL}/login

Med FjordVind Lusevokteren kan du:
- Registrere lusetellinger enkelt
- Få varsler når grenseverdier nærmer seg
- Se trender og analyser for anlegget ditt
- Planlegge behandlinger smart

Vi er her for å hjelpe deg med alt du trenger.

Lykke til med overvåkingen!

Med vennlig hilsen,
FjordVind-teamet
  `.trim();

  return sendEmail({ to: user.email, subject, text });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendWelcomeEmail,
};
