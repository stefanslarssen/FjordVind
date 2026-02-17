/**
 * Unit tests for Prediction Service
 */

const predictionService = require('../../services/predictions');

describe('Prediction Service', () => {
  describe('calculateSeasonalMultiplier', () => {
    it('should return higher multiplier in summer months', () => {
      // June (month 5) should have high multiplier
      const junMultiplier = predictionService.calculateSeasonalMultiplier(5);
      // January (month 0) should have lower multiplier
      const janMultiplier = predictionService.calculateSeasonalMultiplier(0);

      expect(junMultiplier).toBeGreaterThan(janMultiplier);
    });

    it('should return multiplier between 0.5 and 1.5', () => {
      for (let month = 0; month < 12; month++) {
        const multiplier = predictionService.calculateSeasonalMultiplier(month);
        expect(multiplier).toBeGreaterThanOrEqual(0.5);
        expect(multiplier).toBeLessThanOrEqual(1.5);
      }
    });

    it('should peak in June-August', () => {
      const june = predictionService.calculateSeasonalMultiplier(5);
      const july = predictionService.calculateSeasonalMultiplier(6);
      const august = predictionService.calculateSeasonalMultiplier(7);

      // These months should all be high
      expect(june).toBeGreaterThanOrEqual(1.2);
      expect(july).toBeGreaterThanOrEqual(1.2);
      expect(august).toBeGreaterThanOrEqual(1.2);
    });
  });

  describe('calculateTemperatureEffect', () => {
    it('should return higher effect for warmer temperatures', () => {
      const warmEffect = predictionService.calculateTemperatureEffect(15);
      const coldEffect = predictionService.calculateTemperatureEffect(5);

      expect(warmEffect).toBeGreaterThan(coldEffect);
    });

    it('should return effect between 0.3 and 1.0', () => {
      for (let temp = 0; temp <= 25; temp += 5) {
        const effect = predictionService.calculateTemperatureEffect(temp);
        expect(effect).toBeGreaterThanOrEqual(0.3);
        expect(effect).toBeLessThanOrEqual(1.0);
      }
    });

    it('should handle negative temperatures', () => {
      const effect = predictionService.calculateTemperatureEffect(-2);
      expect(effect).toBeDefined();
      expect(typeof effect).toBe('number');
    });
  });

  describe('calculateRiskLevel', () => {
    it('should return CRITICAL for very high lice counts', () => {
      const level = predictionService.calculateRiskLevel(0.8, 0.9);
      expect(level).toBe('CRITICAL');
    });

    it('should return HIGH for above-limit lice counts', () => {
      const level = predictionService.calculateRiskLevel(0.5, 0.6);
      expect(['HIGH', 'CRITICAL']).toContain(level);
    });

    it('should return LOW for very low lice counts', () => {
      const level = predictionService.calculateRiskLevel(0.05, 0.05);
      expect(level).toBe('LOW');
    });

    it('should return MEDIUM for moderate lice counts', () => {
      // WARNING_THRESHOLD is 0.3, so counts at 0.35 should be MEDIUM
      const level = predictionService.calculateRiskLevel(0.35, 0.4);
      expect(['MEDIUM', 'HIGH']).toContain(level);
    });

    it('should return LOW for low lice counts below warning threshold', () => {
      // Counts below 0.3 should be LOW
      const level = predictionService.calculateRiskLevel(0.2, 0.25);
      expect(level).toBe('LOW');
    });
  });

  describe('predictLiceGrowth', () => {
    it('should predict growth over time', () => {
      const result = predictionService.predictLiceGrowth({
        currentLice: 0.2,
        temperature: 12,
        daysAhead: 7
      });

      expect(result).toHaveProperty('predictedLice');
      expect(result).toHaveProperty('growthRate');
      expect(result.predictedLice).toBeGreaterThanOrEqual(0);
    });

    it('should predict higher lice with higher temperature', () => {
      const cold = predictionService.predictLiceGrowth({
        currentLice: 0.2,
        temperature: 5,
        daysAhead: 7
      });

      const warm = predictionService.predictLiceGrowth({
        currentLice: 0.2,
        temperature: 15,
        daysAhead: 7
      });

      expect(warm.predictedLice).toBeGreaterThan(cold.predictedLice);
    });

    it('should predict higher lice for longer time periods', () => {
      const short = predictionService.predictLiceGrowth({
        currentLice: 0.2,
        temperature: 12,
        daysAhead: 3
      });

      const long = predictionService.predictLiceGrowth({
        currentLice: 0.2,
        temperature: 12,
        daysAhead: 14
      });

      expect(long.predictedLice).toBeGreaterThan(short.predictedLice);
    });
  });

  describe('calculateRiskScore', () => {
    it('should return score between 0 and 100', () => {
      const score = predictionService.calculateRiskScore({
        currentLice: 0.3,
        predictedLice: 0.4,
        trend: 0.02,
        treatmentDue: false
      });

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return higher score when treatment is due', () => {
      const noTreatment = predictionService.calculateRiskScore({
        currentLice: 0.3,
        predictedLice: 0.4,
        trend: 0.02,
        treatmentDue: false
      });

      const withTreatment = predictionService.calculateRiskScore({
        currentLice: 0.3,
        predictedLice: 0.4,
        trend: 0.02,
        treatmentDue: true
      });

      expect(withTreatment).toBeGreaterThan(noTreatment);
    });

    it('should return higher score for higher lice counts', () => {
      const low = predictionService.calculateRiskScore({
        currentLice: 0.1,
        predictedLice: 0.15,
        trend: 0.01,
        treatmentDue: false
      });

      const high = predictionService.calculateRiskScore({
        currentLice: 0.6,
        predictedLice: 0.8,
        trend: 0.05,
        treatmentDue: false
      });

      expect(high).toBeGreaterThan(low);
    });
  });

  describe('isSpringPeriod', () => {
    it('should return true for spring months in Norway', () => {
      // March 15 - June 30 is spring period
      expect(predictionService.isSpringPeriod(new Date('2024-04-15'))).toBe(true);
      expect(predictionService.isSpringPeriod(new Date('2024-05-01'))).toBe(true);
      expect(predictionService.isSpringPeriod(new Date('2024-06-15'))).toBe(true);
    });

    it('should return false for non-spring months', () => {
      expect(predictionService.isSpringPeriod(new Date('2024-01-15'))).toBe(false);
      expect(predictionService.isSpringPeriod(new Date('2024-08-15'))).toBe(false);
      expect(predictionService.isSpringPeriod(new Date('2024-12-01'))).toBe(false);
    });
  });

  describe('getLiceLimit', () => {
    it('should return 0.2 during spring', () => {
      const limit = predictionService.getLiceLimit(new Date('2024-05-01'));
      expect(limit).toBe(0.2);
    });

    it('should return 0.5 outside spring', () => {
      const limit = predictionService.getLiceLimit(new Date('2024-08-01'));
      expect(limit).toBe(0.5);
    });
  });
});
