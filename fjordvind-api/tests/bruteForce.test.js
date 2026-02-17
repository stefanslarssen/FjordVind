const {
  recordFailedAttempt,
  checkLoginAllowed,
  clearFailedAttempts,
  unlockAccount,
  getStats,
  config
} = require('../utils/bruteForce');

describe('Brute Force Protection', () => {
  // Use unique identifiers for each test to avoid state pollution
  let testEmail;
  let testIp;

  beforeEach(() => {
    // Generate unique identifiers for each test
    const uniqueId = Date.now() + Math.random().toString(36).substr(2, 9);
    testEmail = `test-${uniqueId}@example.com`;
    testIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  });

  describe('checkLoginAllowed', () => {
    it('should allow login for new user', () => {
      const result = checkLoginAllowed('newuser@test.no', '10.0.0.1');
      expect(result.isAllowed).toBe(true);
      expect(result.lockoutEndsAt).toBeNull();
    });

    it('should block login for locked account', () => {
      // Lock the account
      for (let i = 0; i < config.maxAttempts; i++) {
        recordFailedAttempt(testEmail, testIp);
      }

      const result = checkLoginAllowed(testEmail, testIp);
      expect(result.isAllowed).toBe(false);
      expect(result.lockoutEndsAt).toBeInstanceOf(Date);
      expect(result.reason).toBe('account');
    });
  });

  describe('recordFailedAttempt', () => {
    it('should track failed attempts', () => {
      const result1 = recordFailedAttempt(testEmail, testIp);
      expect(result1.isLocked).toBe(false);
      expect(result1.attemptsRemaining).toBe(config.maxAttempts - 1);

      const result2 = recordFailedAttempt(testEmail, testIp);
      expect(result2.attemptsRemaining).toBe(config.maxAttempts - 2);
    });

    it('should lock account after max attempts', () => {
      let result;
      for (let i = 0; i < config.maxAttempts; i++) {
        result = recordFailedAttempt(testEmail, testIp);
      }

      expect(result.isLocked).toBe(true);
      expect(result.attemptsRemaining).toBe(0);
      expect(result.lockoutEndsAt).toBeInstanceOf(Date);
    });

    it('should return locked status for already locked account', () => {
      // Lock the account
      for (let i = 0; i < config.maxAttempts; i++) {
        recordFailedAttempt(testEmail, testIp);
      }

      // Try another attempt
      const result = recordFailedAttempt(testEmail, testIp);
      expect(result.isLocked).toBe(true);
      expect(result.reason).toBe('account');
    });
  });

  describe('clearFailedAttempts', () => {
    it('should clear attempts for email', () => {
      // Record some attempts
      recordFailedAttempt(testEmail, testIp);
      recordFailedAttempt(testEmail, testIp);

      // Clear
      clearFailedAttempts(testEmail);

      // Check - should be allowed again
      const result = checkLoginAllowed(testEmail, testIp);
      expect(result.isAllowed).toBe(true);
    });

    it('should unlock locked account', () => {
      // Lock the account
      for (let i = 0; i < config.maxAttempts; i++) {
        recordFailedAttempt(testEmail, testIp);
      }

      // Verify locked
      expect(checkLoginAllowed(testEmail, testIp).isAllowed).toBe(false);

      // Clear
      clearFailedAttempts(testEmail);

      // Should be allowed
      expect(checkLoginAllowed(testEmail, testIp).isAllowed).toBe(true);
    });
  });

  describe('unlockAccount', () => {
    it('should unlock a locked account', () => {
      // Lock the account
      for (let i = 0; i < config.maxAttempts; i++) {
        recordFailedAttempt(testEmail, testIp);
      }

      expect(checkLoginAllowed(testEmail, testIp).isAllowed).toBe(false);

      unlockAccount(testEmail);

      expect(checkLoginAllowed(testEmail, testIp).isAllowed).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      const stats = getStats();

      expect(stats).toHaveProperty('activeLocks');
      expect(stats).toHaveProperty('trackedAccounts');
      expect(stats).toHaveProperty('totalRecentAttempts');
      expect(stats).toHaveProperty('config');
      expect(stats.config).toHaveProperty('maxAttempts');
      expect(stats.config).toHaveProperty('lockoutDurationMinutes');
    });

    it('should track locked accounts', () => {
      // Lock an account
      for (let i = 0; i < config.maxAttempts; i++) {
        recordFailedAttempt(testEmail, testIp);
      }

      const stats = getStats();
      expect(stats.activeLocks).toBeGreaterThanOrEqual(1);
    });
  });

  describe('IP-based protection', () => {
    it('should allow more attempts per IP than per account', () => {
      const ip = '10.10.10.10';

      // Each email gets maxAttempts before lock
      // IP gets maxAttempts * 2 before lock
      for (let i = 0; i < config.maxAttempts; i++) {
        const email = `user${i}@test.no`;
        recordFailedAttempt(email, ip);
      }

      // IP should still be allowed
      const check = checkLoginAllowed('newuser@test.no', ip);
      expect(check.isAllowed).toBe(true);
    });
  });

  describe('config', () => {
    it('should have valid configuration', () => {
      expect(config.maxAttempts).toBeGreaterThan(0);
      expect(config.lockoutDuration).toBeGreaterThan(0);
      expect(config.attemptWindow).toBeGreaterThan(0);
    });
  });
});
