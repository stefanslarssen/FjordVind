const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');
const { optionalAuth } = require('../middleware/auth');

// Create a test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(optionalAuth);
  app.use('/api/auth', authRoutes);
  return app;
};

describe('Auth Routes', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'test123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Valideringsfeil');
    });

    it('should return 400 for missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.no' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Valideringsfeil');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'test123' });

      expect(res.status).toBe(400);
      expect(res.body.details).toContain('Ugyldig e-postadresse');
    });

    it('should handle login attempt (will fail without DB but should not crash)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.no', password: 'testpassword' });

      // Will return 401 (invalid credentials) or 500 (DB error)
      expect([401, 500]).toContain(res.status);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Valideringsfeil');
    });

    it('should return 400 for short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.no',
          password: 'short',
          full_name: 'Test User'
        });

      expect(res.status).toBe(400);
      expect(res.body.details).toContain('Passord må være minst 8 tegn');
    });

    it('should return 400 for invalid org_number format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.no',
          password: 'ValidPass123!',  // Meets complexity requirements
          full_name: 'Test User',
          org_number: '12345' // Should be 9 digits
        });

      expect(res.status).toBe(400);
      expect(res.body.details).toContain('Organisasjonsnummer må være 9 siffer');
    });

    it('should accept valid registration data (DB may fail but validation passes)', async () => {
      // Use unique email to avoid conflicts
      const uniqueEmail = `test-${Date.now()}@test.no`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'ValidPass123!',  // Meets complexity: uppercase, lowercase, number, special char
          full_name: 'Valid User',
          company_name: 'Test Company',
          org_number: '123456789'
        });

      // Will return 201 (created), 409 (user exists), or 500 (DB error)
      expect([201, 409, 500]).toContain(res.status);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 without auth header', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    });

    it('should return 401 for invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('should return user data for demo token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer demo_token_admin');

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('admin');
    });

    it('should return user data for valid JWT', async () => {
      const { generateToken } = require('../middleware/auth');
      const token = generateToken({
        id: 'test-123',
        email: 'test@test.no',
        role: 'driftsleder',
        company_id: 'company-123',
        full_name: 'Test User'
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@test.no');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/auth/refresh');

      expect(res.status).toBe(401);
    });

    it('should return new token for valid auth', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer demo_token_admin');

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.message).toBe('Token fornyet');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should always return success', async () => {
      const res = await request(app)
        .post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logget ut');
    });
  });
});
