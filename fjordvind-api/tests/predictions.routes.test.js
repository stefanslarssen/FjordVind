const request = require('supertest');
const express = require('express');
const predictionsRoutes = require('../routes/predictions');
const { optionalAuth } = require('../middleware/auth');

// Create a test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(optionalAuth);
  app.use('/api/predictions', predictionsRoutes);
  return app;
};

describe('Predictions Routes', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /api/predictions', () => {
    it('should return paginated predictions', async () => {
      const res = await request(app)
        .get('/api/predictions');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should have correct pagination structure', async () => {
      const res = await request(app)
        .get('/api/predictions');

      expect(res.status).toBe(200);
      expect(res.body.pagination).toHaveProperty('page');
      expect(res.body.pagination).toHaveProperty('limit');
      // Pagination uses totalItems instead of total
      expect(res.body.pagination).toHaveProperty('totalItems');
      expect(res.body.pagination).toHaveProperty('totalPages');
      // hasNextPage/hasPrevPage instead of hasMore
      expect(res.body.pagination).toHaveProperty('hasNextPage');
    });

    it('predictions should have valid risk levels', async () => {
      const res = await request(app)
        .get('/api/predictions');

      expect(res.status).toBe(200);

      const validRiskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      res.body.data.forEach(prediction => {
        expect(validRiskLevels).toContain(prediction.riskLevel);
      });
    });

    it('predictions should have required fields', async () => {
      const res = await request(app)
        .get('/api/predictions');

      expect(res.status).toBe(200);

      if (res.body.data.length > 0) {
        const prediction = res.body.data[0];
        expect(prediction).toHaveProperty('id');
        expect(prediction).toHaveProperty('merdName');
        expect(prediction).toHaveProperty('currentLice');
        expect(prediction).toHaveProperty('predictedLice');
        expect(prediction).toHaveProperty('riskLevel');
      }
    });

    it('should filter by riskLevel', async () => {
      const res = await request(app)
        .get('/api/predictions')
        .query({ riskLevel: 'HIGH' });

      expect(res.status).toBe(200);
      res.body.data.forEach(prediction => {
        expect(prediction.riskLevel).toBe('HIGH');
      });
    });

    it('should respect pagination parameters', async () => {
      const res = await request(app)
        .get('/api/predictions')
        .query({ page: 1, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /api/predictions/summary', () => {
    it('should return forecast summary', async () => {
      const res = await request(app)
        .get('/api/predictions/summary');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sevenDayForecast');
    });

    it('should have all required forecast fields', async () => {
      const res = await request(app)
        .get('/api/predictions/summary');

      expect(res.status).toBe(200);
      const forecast = res.body.sevenDayForecast;

      expect(forecast).toHaveProperty('avgPredictedLice');
      expect(forecast).toHaveProperty('criticalCount');
      expect(forecast).toHaveProperty('highCount');
      expect(forecast).toHaveProperty('mediumCount');
      expect(forecast).toHaveProperty('lowCount');
      expect(forecast).toHaveProperty('treatmentNeededCount');
      expect(forecast).toHaveProperty('merdsNeedingTreatment');
    });

    it('counts should be non-negative integers', async () => {
      const res = await request(app)
        .get('/api/predictions/summary');

      expect(res.status).toBe(200);
      const forecast = res.body.sevenDayForecast;

      expect(typeof forecast.criticalCount).toBe('number');
      expect(forecast.criticalCount).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(forecast.criticalCount)).toBe(true);
    });
  });

  describe('GET /api/predictions/risk-scores', () => {
    it('should return risk scores', async () => {
      const res = await request(app)
        .get('/api/predictions/risk-scores');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('aggregateRiskScore');
      expect(res.body).toHaveProperty('aggregateRiskLevel');
      expect(res.body).toHaveProperty('scores');
    });

    it('should have valid aggregate risk level', async () => {
      const res = await request(app)
        .get('/api/predictions/risk-scores');

      expect(res.status).toBe(200);
      const validLevels = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
      expect(validLevels).toContain(res.body.aggregateRiskLevel);
    });

    it('scores should have correct structure', async () => {
      const res = await request(app)
        .get('/api/predictions/risk-scores');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.scores)).toBe(true);

      if (res.body.scores.length > 0) {
        const score = res.body.scores[0];
        expect(score).toHaveProperty('overallScore');
        expect(score).toHaveProperty('liceScore');
        expect(score).toHaveProperty('merdName');
      }
    });

    it('aggregate score should be 0-100', async () => {
      const res = await request(app)
        .get('/api/predictions/risk-scores');

      expect(res.status).toBe(200);
      expect(res.body.aggregateRiskScore).toBeGreaterThanOrEqual(0);
      expect(res.body.aggregateRiskScore).toBeLessThanOrEqual(100);
    });
  });
});
