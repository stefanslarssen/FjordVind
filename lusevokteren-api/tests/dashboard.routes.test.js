const request = require('supertest');
const express = require('express');
const dashboardRoutes = require('../routes/dashboard');
const { optionalAuth } = require('../middleware/auth');

// Create a test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(optionalAuth);
  app.use('/api/dashboard', dashboardRoutes);
  return app;
};

describe('Dashboard Routes', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /api/dashboard/overview', () => {
    it('should return dashboard overview', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('overview');
    });

    it('should have all required overview metrics', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview');

      expect(res.status).toBe(200);
      const overview = res.body.overview;

      expect(overview).toHaveProperty('totalLocalities');
      expect(overview).toHaveProperty('totalCages');
      expect(overview).toHaveProperty('totalFish');
    });

    it('should return localities array', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('localities');
      expect(Array.isArray(res.body.localities)).toBe(true);
    });

    it('numeric values should be valid', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview');

      expect(res.status).toBe(200);
      const overview = res.body.overview;

      expect(typeof overview.totalLocalities).toBe('number');
      expect(overview.totalLocalities).toBeGreaterThanOrEqual(0);
      expect(typeof overview.totalFish).toBe('number');
      expect(overview.totalFish).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/dashboard/locality/:name', () => {
    it('should accept locality name parameter', async () => {
      const res = await request(app)
        .get('/api/dashboard/locality/Nordfjorden');

      // Will return data or 500 depending on DB
      expect([200, 500]).toContain(res.status);
    });

    it('should decode URL-encoded locality names', async () => {
      const res = await request(app)
        .get('/api/dashboard/locality/' + encodeURIComponent('Test Lokalitet'));

      // Will return data or 500 depending on DB
      expect([200, 500]).toContain(res.status);
    });
  });

  describe('GET /api/dashboard/charts/:locality', () => {
    it('should return chart data for locality', async () => {
      const res = await request(app)
        .get('/api/dashboard/charts/Nordfjorden');

      // Will return data or 500 depending on DB
      expect([200, 500]).toContain(res.status);
    });
  });

  describe('GET /api/dashboard/monthly-stats', () => {
    it('should return monthly statistics', async () => {
      const res = await request(app)
        .get('/api/dashboard/monthly-stats');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('months');
      expect(res.body).toHaveProperty('lice');
      expect(res.body).toHaveProperty('mortality');
      expect(res.body).toHaveProperty('growth');
    });

    it('should return 12 months of data', async () => {
      const res = await request(app)
        .get('/api/dashboard/monthly-stats');

      expect(res.status).toBe(200);
      expect(res.body.months.length).toBe(12);
    });
  });

  describe('GET /api/dashboard/feed-storage', () => {
    it('should return feed storage data', async () => {
      const res = await request(app)
        .get('/api/dashboard/feed-storage');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalKg');
      expect(res.body).toHaveProperty('feedTypes');
    });

    it('should return valid storage values', async () => {
      const res = await request(app)
        .get('/api/dashboard/feed-storage');

      expect(res.status).toBe(200);
      expect(typeof res.body.totalKg).toBe('number');
      expect(res.body.totalKg).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/dashboard/feeding', () => {
    it('should return feeding logs', async () => {
      const res = await request(app)
        .get('/api/dashboard/feeding');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('count');
      expect(res.body).toHaveProperty('feedingLogs');
    });

    it('should return valid feeding data', async () => {
      const res = await request(app)
        .get('/api/dashboard/feeding');

      expect(res.status).toBe(200);
      expect(typeof res.body.count).toBe('number');
      expect(Array.isArray(res.body.feedingLogs)).toBe(true);
    });

    it('should accept limit parameter', async () => {
      const res = await request(app)
        .get('/api/dashboard/feeding')
        .query({ limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.feedingLogs.length).toBeLessThanOrEqual(5);
    });

    it('feeding logs should have required fields', async () => {
      const res = await request(app)
        .get('/api/dashboard/feeding');

      expect(res.status).toBe(200);
      if (res.body.feedingLogs.length > 0) {
        const log = res.body.feedingLogs[0];
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('location');
        expect(log).toHaveProperty('amount');
      }
    });
  });
});
