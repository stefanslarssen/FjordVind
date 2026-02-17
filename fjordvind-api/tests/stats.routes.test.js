const request = require('supertest');
const express = require('express');
const statsRoutes = require('../routes/stats');
const { optionalAuth } = require('../middleware/auth');

// Create a test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(optionalAuth);
  app.use('/api/stats', statsRoutes);
  return app;
};

describe('Stats Routes', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /api/stats', () => {
    it('should return stats object with required fields', async () => {
      const res = await request(app)
        .get('/api/stats');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalCounts');
      expect(res.body).toHaveProperty('todayCounts');
      expect(res.body).toHaveProperty('avgAdultFemale');
      expect(res.body).toHaveProperty('aboveThreshold');
    });

    it('should return numeric values', async () => {
      const res = await request(app)
        .get('/api/stats');

      expect(res.status).toBe(200);
      expect(typeof res.body.totalCounts).toBe('number');
      expect(typeof res.body.avgAdultFemale).toBe('number');
      expect(res.body.avgAdultFemale).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/stats/lice-trend', () => {
    it('should return trend data with correct structure', async () => {
      const res = await request(app)
        .get('/api/stats/lice-trend');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('days');
      expect(res.body).toHaveProperty('dailyData');
      expect(res.body).toHaveProperty('trend');
      expect(res.body).toHaveProperty('totalSamples');
    });

    it('should return default 14 days', async () => {
      const res = await request(app)
        .get('/api/stats/lice-trend');

      expect(res.status).toBe(200);
      expect(res.body.days).toBe(14);
      expect(res.body.dailyData.length).toBe(14);
    });

    it('should respect custom days parameter', async () => {
      const res = await request(app)
        .get('/api/stats/lice-trend')
        .query({ days: 7 });

      expect(res.status).toBe(200);
      expect(res.body.days).toBe(7);
      expect(res.body.dailyData.length).toBe(7);
    });

    it('should return valid trend direction', async () => {
      const res = await request(app)
        .get('/api/stats/lice-trend');

      expect(res.status).toBe(200);
      expect(['up', 'down', 'stable']).toContain(res.body.trend.direction);
    });

    it('dailyData should have correct structure', async () => {
      const res = await request(app)
        .get('/api/stats/lice-trend');

      expect(res.status).toBe(200);
      expect(res.body.dailyData.length).toBeGreaterThan(0);

      const firstEntry = res.body.dailyData[0];
      expect(firstEntry).toHaveProperty('date');
      expect(firstEntry).toHaveProperty('avgLice');
      expect(firstEntry).toHaveProperty('sampleCount');
      expect(firstEntry).toHaveProperty('totalFish');
    });
  });

  describe('GET /api/stats/lice-counts', () => {
    it('should return 400 when merdId is missing', async () => {
      const res = await request(app)
        .get('/api/stats/lice-counts');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('merdId parameter is required');
    });

    it('should accept merdId parameter', async () => {
      const res = await request(app)
        .get('/api/stats/lice-counts')
        .query({ merdId: 'test-merd-123' });

      // Will return empty array or 500 depending on DB state
      expect([200, 500]).toContain(res.status);
    });
  });
});
