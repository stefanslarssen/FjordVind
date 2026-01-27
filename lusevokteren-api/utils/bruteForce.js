/**
 * Brute-Force Protection Module for FjordVind Lusevokteren
 *
 * Implements rate limiting and account lockout for login attempts.
 */

// In-memory storage for login attempts (for production, use Redis)
const loginAttempts = new Map();
const lockedAccounts = new Map();

// Configuration
const config = {
  // Number of failed attempts before lockout
  maxAttempts: parseInt(process.env.BRUTE_FORCE_MAX_ATTEMPTS) || 5,

  // Lockout duration in milliseconds (default: 15 minutes)
  lockoutDuration: parseInt(process.env.BRUTE_FORCE_LOCKOUT_MS) || 15 * 60 * 1000,

  // Time window for counting attempts (default: 15 minutes)
  attemptWindow: parseInt(process.env.BRUTE_FORCE_WINDOW_MS) || 15 * 60 * 1000,

  // Cleanup interval (default: 5 minutes)
  cleanupInterval: 5 * 60 * 1000,
};

/**
 * Get attempts key (by email or IP)
 */
function getKey(identifier) {
  return identifier.toLowerCase().trim();
}

/**
 * Record a failed login attempt
 * @param {string} email - User email
 * @param {string} ip - Client IP address
 * @returns {object} - { isLocked, attemptsRemaining, lockoutEndsAt }
 */
function recordFailedAttempt(email, ip) {
  const emailKey = getKey(email);
  const ipKey = getKey(ip);
  const now = Date.now();

  // Check if already locked
  const emailLock = lockedAccounts.get(emailKey);
  const ipLock = lockedAccounts.get(ipKey);

  if (emailLock && emailLock.until > now) {
    return {
      isLocked: true,
      attemptsRemaining: 0,
      lockoutEndsAt: new Date(emailLock.until),
      reason: 'account'
    };
  }

  if (ipLock && ipLock.until > now) {
    return {
      isLocked: true,
      attemptsRemaining: 0,
      lockoutEndsAt: new Date(ipLock.until),
      reason: 'ip'
    };
  }

  // Clean expired locks
  if (emailLock && emailLock.until <= now) {
    lockedAccounts.delete(emailKey);
    loginAttempts.delete(emailKey);
  }
  if (ipLock && ipLock.until <= now) {
    lockedAccounts.delete(ipKey);
    loginAttempts.delete(ipKey);
  }

  // Get current attempts
  const emailAttempts = loginAttempts.get(emailKey) || [];
  const ipAttempts = loginAttempts.get(ipKey) || [];

  // Filter to recent attempts only
  const recentEmailAttempts = emailAttempts.filter(t => t > now - config.attemptWindow);
  const recentIpAttempts = ipAttempts.filter(t => t > now - config.attemptWindow);

  // Add new attempt
  recentEmailAttempts.push(now);
  recentIpAttempts.push(now);

  loginAttempts.set(emailKey, recentEmailAttempts);
  loginAttempts.set(ipKey, recentIpAttempts);

  // Check if should lock
  const maxEmailAttempts = recentEmailAttempts.length;
  const maxIpAttempts = recentIpAttempts.length;

  if (maxEmailAttempts >= config.maxAttempts) {
    const lockUntil = now + config.lockoutDuration;
    lockedAccounts.set(emailKey, {
      until: lockUntil,
      attempts: maxEmailAttempts
    });

    console.warn(`[SECURITY] Account locked: ${email} after ${maxEmailAttempts} failed attempts`);

    return {
      isLocked: true,
      attemptsRemaining: 0,
      lockoutEndsAt: new Date(lockUntil),
      reason: 'account'
    };
  }

  if (maxIpAttempts >= config.maxAttempts * 2) {
    // IP gets more attempts (to avoid blocking shared IPs too easily)
    const lockUntil = now + config.lockoutDuration;
    lockedAccounts.set(ipKey, {
      until: lockUntil,
      attempts: maxIpAttempts
    });

    console.warn(`[SECURITY] IP locked: ${ip} after ${maxIpAttempts} failed attempts`);

    return {
      isLocked: true,
      attemptsRemaining: 0,
      lockoutEndsAt: new Date(lockUntil),
      reason: 'ip'
    };
  }

  return {
    isLocked: false,
    attemptsRemaining: config.maxAttempts - maxEmailAttempts,
    lockoutEndsAt: null
  };
}

/**
 * Check if login is allowed (before attempting)
 * @param {string} email - User email
 * @param {string} ip - Client IP address
 * @returns {object} - { isAllowed, lockoutEndsAt, reason }
 */
function checkLoginAllowed(email, ip) {
  const emailKey = getKey(email);
  const ipKey = getKey(ip);
  const now = Date.now();

  // Check email lock
  const emailLock = lockedAccounts.get(emailKey);
  if (emailLock && emailLock.until > now) {
    return {
      isAllowed: false,
      lockoutEndsAt: new Date(emailLock.until),
      reason: 'account',
      message: 'Kontoen er midlertidig låst. Prøv igjen senere.'
    };
  }

  // Check IP lock
  const ipLock = lockedAccounts.get(ipKey);
  if (ipLock && ipLock.until > now) {
    return {
      isAllowed: false,
      lockoutEndsAt: new Date(ipLock.until),
      reason: 'ip',
      message: 'For mange innloggingsforsøk fra denne IP-adressen. Prøv igjen senere.'
    };
  }

  // Clean expired locks
  if (emailLock && emailLock.until <= now) {
    lockedAccounts.delete(emailKey);
    loginAttempts.delete(emailKey);
  }
  if (ipLock && ipLock.until <= now) {
    lockedAccounts.delete(ipKey);
    loginAttempts.delete(ipKey);
  }

  return {
    isAllowed: true,
    lockoutEndsAt: null,
    reason: null
  };
}

/**
 * Clear failed attempts after successful login
 * @param {string} email - User email
 */
function clearFailedAttempts(email) {
  const emailKey = getKey(email);
  loginAttempts.delete(emailKey);
  lockedAccounts.delete(emailKey);
}

/**
 * Manually unlock an account (admin function)
 * @param {string} email - User email to unlock
 */
function unlockAccount(email) {
  const emailKey = getKey(email);
  loginAttempts.delete(emailKey);
  lockedAccounts.delete(emailKey);
  console.log(`[SECURITY] Account manually unlocked: ${email}`);
}

/**
 * Get statistics about locked accounts
 */
function getStats() {
  const now = Date.now();
  let activeLocks = 0;
  let totalAttempts = 0;

  for (const [, lock] of lockedAccounts) {
    if (lock.until > now) {
      activeLocks++;
    }
  }

  for (const [, attempts] of loginAttempts) {
    totalAttempts += attempts.length;
  }

  return {
    activeLocks,
    trackedAccounts: loginAttempts.size,
    totalRecentAttempts: totalAttempts,
    config: {
      maxAttempts: config.maxAttempts,
      lockoutDurationMinutes: config.lockoutDuration / 60000,
      attemptWindowMinutes: config.attemptWindow / 60000
    }
  };
}

// Periodic cleanup of old entries
setInterval(() => {
  const now = Date.now();

  // Clean old attempts
  for (const [key, attempts] of loginAttempts) {
    const recent = attempts.filter(t => t > now - config.attemptWindow);
    if (recent.length === 0) {
      loginAttempts.delete(key);
    } else {
      loginAttempts.set(key, recent);
    }
  }

  // Clean expired locks
  for (const [key, lock] of lockedAccounts) {
    if (lock.until <= now) {
      lockedAccounts.delete(key);
    }
  }
}, config.cleanupInterval);

module.exports = {
  recordFailedAttempt,
  checkLoginAllowed,
  clearFailedAttempts,
  unlockAccount,
  getStats,
  config
};
