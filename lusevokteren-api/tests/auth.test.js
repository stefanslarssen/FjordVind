const {
  generateToken,
  verifyToken,
  extractUserFromToken,
  optionalAuth,
  requireAuth,
  requireRole
} = require('../middleware/auth');

describe('Auth Middleware', () => {
  const testUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    role: 'driftsleder',
    company_id: 'company-123',
    full_name: 'Test User'
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(testUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include user data in token payload', () => {
      const token = generateToken(testUser);
      const decoded = verifyToken(token);

      expect(decoded.sub).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.role).toBe(testUser.role);
      expect(decoded.company_id).toBe(testUser.company_id);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(testUser);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe(testUser.id);
    });

    it('should return null for invalid token', () => {
      const result = verifyToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create a token with very short expiry
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { sub: testUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const result = verifyToken(expiredToken);
      expect(result).toBeNull();
    });
  });

  describe('extractUserFromToken', () => {
    it('should extract user from valid JWT', () => {
      const token = generateToken(testUser);
      const user = extractUserFromToken(token);

      expect(user).toBeDefined();
      expect(user.id).toBe(testUser.id);
      expect(user.email).toBe(testUser.email);
      expect(user.role).toBe(testUser.role);
    });

    it('should return null for invalid token', () => {
      const user = extractUserFromToken('invalid-token');
      expect(user).toBeNull();
    });

    it('should extract demo user from demo token (in non-production)', () => {
      const user = extractUserFromToken('demo_token_admin');

      // In test/dev mode, demo tokens should work
      expect(user).toBeDefined();
      expect(user.role).toBe('admin');
    });
  });

  describe('optionalAuth middleware', () => {
    it('should set req.user to null when no auth header', () => {
      const req = { headers: {} };
      const res = {};
      const next = jest.fn();

      optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should set req.user when valid token provided', () => {
      const token = generateToken(testUser);
      const req = {
        headers: { authorization: `Bearer ${token}` }
      };
      const res = {};
      const next = jest.fn();

      optionalAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(testUser.id);
      expect(next).toHaveBeenCalled();
    });

    it('should set req.user to null for invalid token', () => {
      const req = {
        headers: { authorization: 'Bearer invalid-token' }
      };
      const res = {};
      const next = jest.fn();

      optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireAuth middleware', () => {
    it('should return 401 when no auth header', async () => {
      const req = { headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'AUTH_REQUIRED' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      const req = {
        headers: { authorization: 'Bearer invalid-token' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INVALID_TOKEN' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() for valid token', async () => {
      const token = generateToken(testUser);
      const req = {
        headers: { authorization: `Bearer ${token}` }
      };
      const res = {};
      const next = jest.fn();

      await requireAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(testUser.id);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRole middleware', () => {
    it('should return 401 when no user', () => {
      const req = { user: null };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user has wrong role', () => {
      const req = { user: { ...testUser, role: 'røkter' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INSUFFICIENT_PERMISSIONS' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() when user has correct role', () => {
      const req = { user: { ...testUser, role: 'admin' } };
      const res = {};
      const next = jest.fn();

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should accept multiple roles', () => {
      const req = { user: { ...testUser, role: 'driftsleder' } };
      const res = {};
      const next = jest.fn();

      const middleware = requireRole('admin', 'driftsleder');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
