const {
  escapeHtml,
  stripHtml,
  sanitizeEmail,
  sanitizeNorwegianPhone,
  sanitizeOrgNumber,
  sanitizeUuid,
  isValidUuid,
  sanitizeNumber,
  sanitizeInteger,
  sanitizeDate,
  sanitizeObject,
  sanitizeUrl,
  sanitizeFilename,
} = require('../utils/sanitizer');

describe('Sanitizer Utils', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('should handle ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should return non-strings unchanged', () => {
      expect(escapeHtml(123)).toBe(123);
      expect(escapeHtml(null)).toBe(null);
    });
  });

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      expect(stripHtml('<b>bold</b> text')).toBe('bold text');
    });

    it('should remove script tags', () => {
      expect(stripHtml('<script>alert(1)</script>Hello')).toBe('alert(1)Hello');
    });

    it('should handle nested tags', () => {
      expect(stripHtml('<div><p>nested</p></div>')).toBe('nested');
    });
  });

  describe('sanitizeEmail', () => {
    it('should accept valid emails', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
      expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
    });

    it('should reject invalid emails', () => {
      expect(sanitizeEmail('not-an-email')).toBe('');
      expect(sanitizeEmail('@example.com')).toBe('');
      expect(sanitizeEmail('test@')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
    });
  });

  describe('sanitizeNorwegianPhone', () => {
    it('should accept valid Norwegian mobile numbers', () => {
      expect(sanitizeNorwegianPhone('91234567')).toBe('+4791234567');
      expect(sanitizeNorwegianPhone('41234567')).toBe('+4741234567');
      expect(sanitizeNorwegianPhone('+4791234567')).toBe('+4791234567');
    });

    it('should normalize different formats', () => {
      expect(sanitizeNorwegianPhone('004791234567')).toBe('+4791234567');
      expect(sanitizeNorwegianPhone('91 23 45 67')).toBe('+4791234567');
    });

    it('should reject invalid numbers', () => {
      expect(sanitizeNorwegianPhone('12345678')).toBe(''); // Starts with 1, not 4 or 9
      expect(sanitizeNorwegianPhone('1234567')).toBe('');  // Too short
    });
  });

  describe('sanitizeOrgNumber', () => {
    it('should accept valid 9-digit org numbers', () => {
      expect(sanitizeOrgNumber('123456789')).toBe('123456789');
    });

    it('should strip non-digits', () => {
      expect(sanitizeOrgNumber('123 456 789')).toBe('123456789');
    });

    it('should reject invalid org numbers', () => {
      expect(sanitizeOrgNumber('12345678')).toBe('');  // 8 digits
      expect(sanitizeOrgNumber('1234567890')).toBe(''); // 10 digits
    });
  });

  describe('isValidUuid / sanitizeUuid', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUuid('not-a-uuid')).toBe(false);
      expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
    });

    it('should sanitize UUIDs', () => {
      expect(sanitizeUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(
        '550e8400-e29b-41d4-a716-446655440000'
      );
      expect(sanitizeUuid('invalid')).toBe('');
    });
  });

  describe('sanitizeNumber', () => {
    it('should parse valid numbers', () => {
      expect(sanitizeNumber('123.45')).toBe(123.45);
      expect(sanitizeNumber(123.45)).toBe(123.45);
    });

    it('should respect min/max bounds', () => {
      expect(sanitizeNumber('150', { min: 0, max: 100 })).toBe(100);
      expect(sanitizeNumber('-50', { min: 0, max: 100 })).toBe(0);
    });

    it('should round to decimals', () => {
      expect(sanitizeNumber('3.14159', { decimals: 2 })).toBe(3.14);
    });

    it('should return null for invalid', () => {
      expect(sanitizeNumber('not-a-number')).toBe(null);
    });
  });

  describe('sanitizeInteger', () => {
    it('should parse integers', () => {
      expect(sanitizeInteger('42')).toBe(42);
      expect(sanitizeInteger('42.9')).toBe(42);
    });

    it('should respect bounds', () => {
      expect(sanitizeInteger('150', { min: 0, max: 100 })).toBe(100);
    });
  });

  describe('sanitizeDate', () => {
    it('should parse valid dates', () => {
      expect(sanitizeDate('2024-01-15')).toBe('2024-01-15');
      expect(sanitizeDate('2024-01-15T12:00:00Z')).toBe('2024-01-15');
    });

    it('should return null for invalid dates', () => {
      expect(sanitizeDate('not-a-date')).toBe(null);
      expect(sanitizeDate('')).toBe(null);
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('/relative/path')).toBe('/relative/path');
    });

    it('should block dangerous protocols', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('data:text/html,<script>')).toBe('');
    });

    it('should add https to bare domains', () => {
      expect(sanitizeUrl('example.com')).toBe('https://example.com');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeFilename('file<>name.txt')).toBe('filename.txt');
      expect(sanitizeFilename('file:name?.txt')).toBe('filename.txt');
    });

    it('should prevent path traversal', () => {
      // Slashes and dots are removed, preventing directory traversal
      expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize nested objects', () => {
      const input = {
        name: '<script>alert(1)</script>',
        nested: {
          value: '  whitespace  '
        }
      };

      const result = sanitizeObject(input, { stripHtml: true, normalizeWhitespace: true });

      expect(result.name).toBe('alert(1)');
      expect(result.nested.value).toBe('whitespace');
    });

    it('should handle arrays', () => {
      const input = ['<b>one</b>', '<i>two</i>'];
      const result = sanitizeObject(input, { stripHtml: true });

      expect(result).toEqual(['one', 'two']);
    });

    it('should preserve non-strings', () => {
      const input = { number: 123, bool: true, nil: null };
      const result = sanitizeObject(input);

      expect(result).toEqual({ number: 123, bool: true, nil: null });
    });
  });
});
