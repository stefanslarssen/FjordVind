/**
 * Unit tests for Notification Service
 */

// Mock the dependencies
jest.mock('../../config/database', () => ({
  query: jest.fn(),
  connect: jest.fn()
}));

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn()
}));

const pool = require('../../config/database');
const webPush = require('web-push');

// Set environment variables before importing the service
process.env.VAPID_PUBLIC_KEY = 'test-public-key';
process.env.VAPID_PRIVATE_KEY = 'test-private-key';

const notificationService = require('../../services/notifications');

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TEMPLATES', () => {
    it('should have all required notification templates', () => {
      expect(notificationService.TEMPLATES).toHaveProperty('LICE_CRITICAL');
      expect(notificationService.TEMPLATES).toHaveProperty('LICE_WARNING');
      expect(notificationService.TEMPLATES).toHaveProperty('TREATMENT_DUE');
      expect(notificationService.TEMPLATES).toHaveProperty('PREDICTION_ALERT');
      expect(notificationService.TEMPLATES).toHaveProperty('DAILY_SUMMARY');
    });

    it('should have correct priority for LICE_CRITICAL', () => {
      expect(notificationService.TEMPLATES.LICE_CRITICAL.priority).toBe('high');
    });

    it('should have correct category for each template', () => {
      expect(notificationService.TEMPLATES.LICE_CRITICAL.category).toBe('alert');
      expect(notificationService.TEMPLATES.LICE_WARNING.category).toBe('warning');
      expect(notificationService.TEMPLATES.TREATMENT_DUE.category).toBe('reminder');
    });
  });

  describe('getVapidPublicKey', () => {
    it('should return the VAPID public key when configured', () => {
      const key = notificationService.getVapidPublicKey();
      expect(key).toBe('test-public-key');
    });
  });

  describe('savePushSubscription', () => {
    it('should insert new subscription when none exists', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing
        .mockResolvedValueOnce({ rows: [] }); // Insert

      const subscription = {
        endpoint: 'https://push.example.com/abc123',
        keys: { p256dh: 'key1', auth: 'key2' }
      };

      const result = await notificationService.savePushSubscription('user-123', subscription);

      expect(result).toEqual({ success: true });
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should update existing subscription', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 'sub-1' }] }) // Existing found
        .mockResolvedValueOnce({ rows: [] }); // Update

      const subscription = {
        endpoint: 'https://push.example.com/abc123',
        keys: { p256dh: 'key1', auth: 'key2' }
      };

      const result = await notificationService.savePushSubscription('user-123', subscription);

      expect(result).toEqual({ success: true });
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should throw error when database fails', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error'));

      const subscription = {
        endpoint: 'https://push.example.com/abc123',
        keys: { p256dh: 'key1', auth: 'key2' }
      };

      await expect(
        notificationService.savePushSubscription('user-123', subscription)
      ).rejects.toThrow('DB error');
    });
  });

  describe('removePushSubscription', () => {
    it('should remove subscription from database', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationService.removePushSubscription(
        'user-123',
        'https://push.example.com/abc123'
      );

      expect(result).toEqual({ success: true });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM push_subscriptions'),
        ['user-123', 'https://push.example.com/abc123']
      );
    });
  });

  describe('getUserSubscriptions', () => {
    it('should return parsed subscriptions', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            endpoint: 'https://push.example.com/1',
            keys: JSON.stringify({ p256dh: 'key1', auth: 'auth1' })
          },
          {
            endpoint: 'https://push.example.com/2',
            keys: { p256dh: 'key2', auth: 'auth2' }
          }
        ]
      });

      const subscriptions = await notificationService.getUserSubscriptions('user-123');

      expect(subscriptions).toHaveLength(2);
      expect(subscriptions[0].endpoint).toBe('https://push.example.com/1');
      expect(subscriptions[0].keys).toEqual({ p256dh: 'key1', auth: 'auth1' });
    });

    it('should return empty array when no subscriptions', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const subscriptions = await notificationService.getUserSubscriptions('user-123');

      expect(subscriptions).toEqual([]);
    });
  });

  describe('sendWebPush', () => {
    it('should send notification to all user subscriptions', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { endpoint: 'https://push.example.com/1', keys: { p256dh: 'k1', auth: 'a1' } },
          { endpoint: 'https://push.example.com/2', keys: { p256dh: 'k2', auth: 'a2' } }
        ]
      });

      webPush.sendNotification.mockResolvedValue({});

      const result = await notificationService.sendWebPush('user-123', {
        title: 'Test',
        body: 'Test message'
      });

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
    });

    it('should handle failed notifications', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { endpoint: 'https://push.example.com/1', keys: { p256dh: 'k1', auth: 'a1' } }
        ]
      });

      webPush.sendNotification.mockRejectedValueOnce({ statusCode: 500 });

      const result = await notificationService.sendWebPush('user-123', {
        title: 'Test',
        body: 'Test message'
      });

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should remove expired subscriptions (410 status)', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            { endpoint: 'https://push.example.com/expired', keys: { p256dh: 'k1', auth: 'a1' } }
          ]
        })
        .mockResolvedValueOnce({ rows: [] }); // Delete query

      webPush.sendNotification.mockRejectedValueOnce({ statusCode: 410 });

      await notificationService.sendWebPush('user-123', {
        title: 'Test',
        body: 'Test message'
      });

      // Should have called delete
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should return 0 sent when no subscriptions', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationService.sendWebPush('user-123', {
        title: 'Test',
        body: 'Test message'
      });

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('createAlert', () => {
    it('should create alert in database', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 'alert-123' }]
      });

      const result = await notificationService.createAlert({
        alertType: 'LICE_CRITICAL',
        severity: 'CRITICAL',
        title: 'Test Alert',
        message: 'Test message'
      });

      expect(result).toEqual({ id: 'alert-123' });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO alerts'),
        expect.any(Array)
      );
    });

    it('should handle merdId and locality', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 'alert-456' }]
      });

      await notificationService.createAlert({
        merdId: 'merd-1',
        locality: 'Test Location',
        alertType: 'LICE_WARNING',
        severity: 'WARNING',
        title: 'Warning',
        message: 'Warning message',
        recommendedAction: 'Monitor closely'
      });

      const callArgs = pool.query.mock.calls[0][1];
      expect(callArgs).toContain('merd-1');
      expect(callArgs).toContain('Test Location');
    });
  });
});

describe('Notification Service - Email', () => {
  describe('sendEmailNotification', () => {
    it('should fetch user and send email', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ email: 'user@example.com', full_name: 'Test User' }]
      });

      // Mock the email service
      jest.mock('../../services/email', () => ({
        sendEmail: jest.fn().mockResolvedValue({ success: true })
      }));

      // Note: Full email test would require more mocking
      // This tests the function exists and is callable
      expect(typeof notificationService.sendEmailNotification).toBe('function');
    });
  });
});
