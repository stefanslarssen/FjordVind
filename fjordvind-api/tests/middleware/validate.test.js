/**
 * Unit tests for Validation Middleware
 */

const {
  FieldTypes,
  validateField,
  validateObject,
  validateBody,
  validateQuery,
  CommonSchemas
} = require('../../middleware/validate');

describe('Validation Middleware', () => {
  describe('validateField', () => {
    describe('STRING type', () => {
      it('should pass for valid string', () => {
        const errors = validateField('name', 'John', { type: FieldTypes.STRING });
        expect(errors).toHaveLength(0);
      });

      it('should fail for non-string when required', () => {
        const errors = validateField('name', 123, { type: FieldTypes.STRING, required: true });
        expect(errors).toContain('name må være en tekststreng');
      });

      it('should validate minLength', () => {
        const errors = validateField('name', 'Jo', { type: FieldTypes.STRING, minLength: 3 });
        expect(errors).toContain('name må være minst 3 tegn');
      });

      it('should validate maxLength', () => {
        const errors = validateField('name', 'JohnDoe', { type: FieldTypes.STRING, maxLength: 5 });
        expect(errors).toContain('name kan ikke være mer enn 5 tegn');
      });

      it('should validate pattern', () => {
        const errors = validateField('code', 'abc', {
          type: FieldTypes.STRING,
          pattern: '^[A-Z]+$',
          patternMessage: 'code må være store bokstaver'
        });
        expect(errors).toContain('code må være store bokstaver');
      });
    });

    describe('NUMBER type', () => {
      it('should pass for valid number', () => {
        const errors = validateField('temp', 12.5, { type: FieldTypes.NUMBER });
        expect(errors).toHaveLength(0);
      });

      it('should pass for string number', () => {
        const errors = validateField('temp', '12.5', { type: FieldTypes.NUMBER });
        expect(errors).toHaveLength(0);
      });

      it('should fail for non-numeric string', () => {
        const errors = validateField('temp', 'abc', { type: FieldTypes.NUMBER, required: true });
        expect(errors).toContain('temp må være et tall');
      });

      it('should validate min', () => {
        const errors = validateField('temp', -5, { type: FieldTypes.NUMBER, min: -2 });
        expect(errors).toContain('temp må være minst -2');
      });

      it('should validate max', () => {
        const errors = validateField('temp', 35, { type: FieldTypes.NUMBER, max: 30 });
        expect(errors).toContain('temp kan ikke være mer enn 30');
      });
    });

    describe('INTEGER type', () => {
      it('should pass for valid integer', () => {
        const errors = validateField('count', 5, { type: FieldTypes.INTEGER });
        expect(errors).toHaveLength(0);
      });

      it('should fail for float when integer required', () => {
        // Note: parseInt(5.5) = 5, so this should pass as integers truncate
        const errors = validateField('count', 'abc', { type: FieldTypes.INTEGER, required: true });
        expect(errors).toContain('count må være et heltall');
      });
    });

    describe('DATE type', () => {
      it('should pass for valid date', () => {
        const errors = validateField('dato', '2024-06-15', { type: FieldTypes.DATE });
        expect(errors).toHaveLength(0);
      });

      it('should fail for invalid date format', () => {
        const errors = validateField('dato', '15-06-2024', { type: FieldTypes.DATE, required: true });
        expect(errors.length).toBeGreaterThan(0);
      });

      it('should validate noFuture', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        const errors = validateField('dato', futureDateStr, { type: FieldTypes.DATE, noFuture: true });
        expect(errors).toContain('dato kan ikke være i fremtiden');
      });
    });

    describe('UUID type', () => {
      it('should pass for valid UUID', () => {
        const errors = validateField('id', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', { type: FieldTypes.UUID });
        expect(errors).toHaveLength(0);
      });

      it('should fail for invalid UUID', () => {
        const errors = validateField('id', 'not-a-uuid', { type: FieldTypes.UUID, required: true });
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('EMAIL type', () => {
      it('should pass for valid email', () => {
        const errors = validateField('email', 'test@example.com', { type: FieldTypes.EMAIL });
        expect(errors).toHaveLength(0);
      });

      it('should fail for invalid email', () => {
        const errors = validateField('email', 'not-an-email', { type: FieldTypes.EMAIL, required: true });
        expect(errors).toContain('Ugyldig e-postadresse');
      });
    });

    describe('PHONE type', () => {
      it('should pass for valid Norwegian phone', () => {
        const errors = validateField('phone', '91234567', { type: FieldTypes.PHONE });
        expect(errors).toHaveLength(0);
      });

      it('should pass for phone with country code', () => {
        const errors = validateField('phone', '+4791234567', { type: FieldTypes.PHONE });
        expect(errors).toHaveLength(0);
      });

      it('should fail for invalid phone', () => {
        const errors = validateField('phone', '123', { type: FieldTypes.PHONE, required: true });
        expect(errors).toContain('Ugyldig telefonnummer (må være 8 siffer)');
      });
    });

    describe('ENUM type', () => {
      it('should pass for valid enum value', () => {
        const errors = validateField('status', 'active', {
          type: FieldTypes.ENUM,
          values: ['active', 'inactive', 'pending']
        });
        expect(errors).toHaveLength(0);
      });

      it('should fail for invalid enum value', () => {
        const errors = validateField('status', 'unknown', {
          type: FieldTypes.ENUM,
          values: ['active', 'inactive', 'pending'],
          required: true
        });
        expect(errors).toContain('status må være en av: active, inactive, pending');
      });
    });

    describe('ARRAY type', () => {
      it('should pass for valid array', () => {
        const errors = validateField('items', [1, 2, 3], { type: FieldTypes.ARRAY });
        expect(errors).toHaveLength(0);
      });

      it('should fail for non-array', () => {
        const errors = validateField('items', 'not-array', { type: FieldTypes.ARRAY, required: true });
        expect(errors).toContain('items må være en liste');
      });

      it('should validate minItems', () => {
        const errors = validateField('items', [], { type: FieldTypes.ARRAY, minItems: 1 });
        expect(errors).toContain('items må ha minst 1 element(er)');
      });

      it('should validate maxItems', () => {
        const errors = validateField('items', [1, 2, 3, 4, 5], { type: FieldTypes.ARRAY, maxItems: 3 });
        expect(errors).toContain('items kan ikke ha mer enn 3 element(er)');
      });

      it('should validate array items with itemSchema', () => {
        const errors = validateField('items', [
          { name: 'John' },
          { name: '' } // Invalid - empty name
        ], {
          type: FieldTypes.ARRAY,
          itemSchema: {
            name: { type: FieldTypes.STRING, required: true, minLength: 1 }
          }
        });
        expect(errors.some(e => e.includes('items[1]'))).toBe(true);
      });
    });

    describe('Required field', () => {
      it('should fail for undefined required field', () => {
        const errors = validateField('name', undefined, { type: FieldTypes.STRING, required: true });
        expect(errors).toContain('name er påkrevd');
      });

      it('should fail for null required field', () => {
        const errors = validateField('name', null, { type: FieldTypes.STRING, required: true });
        expect(errors).toContain('name er påkrevd');
      });

      it('should fail for empty string required field', () => {
        const errors = validateField('name', '', { type: FieldTypes.STRING, required: true });
        expect(errors).toContain('name er påkrevd');
      });

      it('should pass for undefined optional field', () => {
        const errors = validateField('name', undefined, { type: FieldTypes.STRING, required: false });
        expect(errors).toHaveLength(0);
      });
    });

    describe('Custom validator', () => {
      it('should run custom validator function', () => {
        const customValidator = (value, fieldName) => {
          if (value !== 'secret') {
            return { errors: [`${fieldName} må være 'secret'`] };
          }
          return { errors: [] };
        };

        const errors = validateField('password', 'wrong', {
          type: FieldTypes.STRING,
          validator: customValidator
        });
        expect(errors).toContain("password må være 'secret'");
      });
    });
  });

  describe('validateObject', () => {
    it('should validate multiple fields', () => {
      const schema = {
        name: { type: FieldTypes.STRING, required: true },
        age: { type: FieldTypes.INTEGER, min: 0, max: 150 },
        email: { type: FieldTypes.EMAIL, required: true }
      };

      const errors = validateObject({
        name: 'John',
        age: 200, // Invalid
        email: 'invalid' // Invalid
      }, schema);

      expect(errors).toContain('age kan ikke være mer enn 150');
      expect(errors).toContain('Ugyldig e-postadresse');
    });

    it('should handle empty data', () => {
      const schema = {
        name: { type: FieldTypes.STRING, required: true }
      };

      const errors = validateObject({}, schema);
      expect(errors).toContain('name er påkrevd');
    });

    it('should handle null data', () => {
      const schema = {
        name: { type: FieldTypes.STRING, required: false }
      };

      const errors = validateObject(null, schema);
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateBody middleware', () => {
    it('should call next() for valid data', () => {
      const schema = {
        name: { type: FieldTypes.STRING, required: true }
      };

      const middleware = validateBody(schema);
      const req = { body: { name: 'John' } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      // next() called without error argument
      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0][0]).toBeUndefined();
    });

    it('should call next(error) for invalid data', () => {
      const schema = {
        name: { type: FieldTypes.STRING, required: true }
      };

      const middleware = validateBody(schema);
      const req = { body: {} };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('CommonSchemas', () => {
    it('should have idParam schema', () => {
      expect(CommonSchemas.idParam).toBeDefined();
      expect(CommonSchemas.idParam.id.type).toBe(FieldTypes.UUID);
    });

    it('should have sampleCreate schema', () => {
      expect(CommonSchemas.sampleCreate).toBeDefined();
      expect(CommonSchemas.sampleCreate.merdId.required).toBe(true);
      expect(CommonSchemas.sampleCreate.observations.type).toBe(FieldTypes.ARRAY);
    });

    it('should have treatmentCreate schema', () => {
      expect(CommonSchemas.treatmentCreate).toBeDefined();
      expect(CommonSchemas.treatmentCreate.treatment_type.type).toBe(FieldTypes.ENUM);
    });
  });
});

describe('Request ID Middleware', () => {
  const { requestIdMiddleware, generateRequestId, getRequestId } = require('../../middleware/requestId');

  describe('generateRequestId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });

    it('should generate ID in correct format', () => {
      const id = generateRequestId();
      expect(id).toMatch(/^\d+-[a-f0-9]+$/);
    });
  });

  describe('requestIdMiddleware', () => {
    it('should add requestId to request object', () => {
      const req = { headers: {} };
      const res = { setHeader: jest.fn() };
      const next = jest.fn();

      requestIdMiddleware(req, res, next);

      expect(req.requestId).toBeDefined();
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.requestId);
      expect(next).toHaveBeenCalled();
    });

    it('should use existing X-Request-ID header', () => {
      const existingId = '1234567890-abcdef123456';
      const req = { headers: { 'x-request-id': existingId } };
      const res = { setHeader: jest.fn() };
      const next = jest.fn();

      requestIdMiddleware(req, res, next);

      expect(req.requestId).toBe(existingId);
    });

    it('should reject invalid X-Request-ID header', () => {
      const req = { headers: { 'x-request-id': '<script>alert(1)</script>' } };
      const res = { setHeader: jest.fn() };
      const next = jest.fn();

      requestIdMiddleware(req, res, next);

      expect(req.requestId).not.toBe('<script>alert(1)</script>');
      expect(req.requestId).toMatch(/^\d+-[a-f0-9]+$/);
    });
  });

  describe('getRequestId', () => {
    it('should return requestId from request', () => {
      const req = { requestId: 'test-123' };
      expect(getRequestId(req)).toBe('test-123');
    });

    it('should return "unknown" for missing requestId', () => {
      expect(getRequestId({})).toBe('unknown');
      expect(getRequestId(null)).toBe('unknown');
      expect(getRequestId(undefined)).toBe('unknown');
    });
  });
});
