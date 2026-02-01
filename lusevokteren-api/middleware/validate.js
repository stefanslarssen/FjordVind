// Validation middleware for FjordVind Lusevokteren
// Provides reusable request validation based on schemas

const { validationError } = require('../utils/errorHandler');
const {
  validateRequired,
  validateRange,
  validateEmail,
  validatePhone,
  validateDate,
  validateUUID,
  validateEnum,
  validateLiceCount
} = require('../utils/validation');

/**
 * Schema field types for validation
 */
const FieldTypes = {
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
  DATE: 'date',
  UUID: 'uuid',
  EMAIL: 'email',
  PHONE: 'phone',
  ENUM: 'enum',
  ARRAY: 'array',
  OBJECT: 'object',
  LICE_COUNT: 'lice_count'
};

/**
 * Validate a single field against its schema definition
 * @param {string} fieldName - Name of the field
 * @param {*} value - Value to validate
 * @param {Object} schema - Schema definition for the field
 * @returns {string[]} Array of error messages
 */
function validateField(fieldName, value, schema) {
  const errors = [];
  const isProvided = value !== undefined && value !== null && value !== '';

  // Required check
  if (schema.required && !isProvided) {
    errors.push(`${fieldName} er påkrevd`);
    return errors; // No point continuing if required field is missing
  }

  // If not provided and not required, skip other validations
  if (!isProvided) {
    return errors;
  }

  // Type-specific validation
  switch (schema.type) {
    case FieldTypes.STRING:
      if (typeof value !== 'string') {
        errors.push(`${fieldName} må være en tekststreng`);
      } else {
        if (schema.minLength && value.length < schema.minLength) {
          errors.push(`${fieldName} må være minst ${schema.minLength} tegn`);
        }
        if (schema.maxLength && value.length > schema.maxLength) {
          errors.push(`${fieldName} kan ikke være mer enn ${schema.maxLength} tegn`);
        }
        if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
          errors.push(schema.patternMessage || `${fieldName} har ugyldig format`);
        }
      }
      break;

    case FieldTypes.NUMBER:
    case FieldTypes.INTEGER:
      const numValue = schema.type === FieldTypes.INTEGER ? parseInt(value) : parseFloat(value);
      if (isNaN(numValue)) {
        errors.push(`${fieldName} må være et ${schema.type === FieldTypes.INTEGER ? 'heltall' : 'tall'}`);
      } else {
        if (schema.min !== undefined && numValue < schema.min) {
          errors.push(`${fieldName} må være minst ${schema.min}`);
        }
        if (schema.max !== undefined && numValue > schema.max) {
          errors.push(`${fieldName} kan ikke være mer enn ${schema.max}`);
        }
      }
      break;

    case FieldTypes.BOOLEAN:
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        errors.push(`${fieldName} må være true eller false`);
      }
      break;

    case FieldTypes.DATE:
      const dateResult = validateDate(value, fieldName);
      errors.push(...dateResult.errors);

      // Check for future dates if not allowed
      if (schema.noFuture && !dateResult.errors.length) {
        const inputDate = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (inputDate > today) {
          errors.push(`${fieldName} kan ikke være i fremtiden`);
        }
      }
      break;

    case FieldTypes.UUID:
      const uuidResult = validateUUID(value, fieldName);
      errors.push(...uuidResult.errors);
      break;

    case FieldTypes.EMAIL:
      const emailResult = validateEmail(value);
      errors.push(...emailResult.errors);
      break;

    case FieldTypes.PHONE:
      const phoneResult = validatePhone(value);
      errors.push(...phoneResult.errors);
      break;

    case FieldTypes.ENUM:
      if (!schema.values || !schema.values.includes(value)) {
        errors.push(`${fieldName} må være en av: ${schema.values?.join(', ') || 'ukjent'}`);
      }
      break;

    case FieldTypes.ARRAY:
      if (!Array.isArray(value)) {
        errors.push(`${fieldName} må være en liste`);
      } else {
        if (schema.minItems !== undefined && value.length < schema.minItems) {
          errors.push(`${fieldName} må ha minst ${schema.minItems} element(er)`);
        }
        if (schema.maxItems !== undefined && value.length > schema.maxItems) {
          errors.push(`${fieldName} kan ikke ha mer enn ${schema.maxItems} element(er)`);
        }
        // Validate array items if itemSchema is provided
        if (schema.itemSchema) {
          value.forEach((item, index) => {
            const itemErrors = validateObject(item, schema.itemSchema);
            itemErrors.forEach(err => {
              errors.push(`${fieldName}[${index}]: ${err}`);
            });
          });
        }
      }
      break;

    case FieldTypes.OBJECT:
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push(`${fieldName} må være et objekt`);
      } else if (schema.properties) {
        const objErrors = validateObject(value, schema.properties);
        objErrors.forEach(err => {
          errors.push(`${fieldName}.${err}`);
        });
      }
      break;

    case FieldTypes.LICE_COUNT:
      const liceResult = validateLiceCount(parseFloat(value), fieldName);
      errors.push(...liceResult.errors);
      break;
  }

  // Custom validator function
  if (schema.validator && typeof schema.validator === 'function') {
    const customResult = schema.validator(value, fieldName);
    if (customResult && customResult.errors) {
      errors.push(...customResult.errors);
    } else if (typeof customResult === 'string') {
      errors.push(customResult);
    }
  }

  return errors;
}

/**
 * Validate an object against a schema
 * @param {Object} data - Data object to validate
 * @param {Object} schema - Schema defining field rules
 * @returns {string[]} Array of error messages
 */
function validateObject(data, schema) {
  const errors = [];
  const dataObj = data || {};

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const fieldErrors = validateField(fieldName, dataObj[fieldName], fieldSchema);
    errors.push(...fieldErrors);
  }

  return errors;
}

/**
 * Create validation middleware for request body
 * @param {Object} schema - Schema for body validation
 * @returns {Function} Express middleware
 */
function validateBody(schema) {
  return (req, res, next) => {
    const errors = validateObject(req.body, schema);

    if (errors.length > 0) {
      return next(validationError(errors));
    }

    next();
  };
}

/**
 * Create validation middleware for query parameters
 * @param {Object} schema - Schema for query validation
 * @returns {Function} Express middleware
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const errors = validateObject(req.query, schema);

    if (errors.length > 0) {
      return next(validationError(errors));
    }

    next();
  };
}

/**
 * Create validation middleware for URL parameters
 * @param {Object} schema - Schema for params validation
 * @returns {Function} Express middleware
 */
function validateParams(schema) {
  return (req, res, next) => {
    const errors = validateObject(req.params, schema);

    if (errors.length > 0) {
      return next(validationError(errors));
    }

    next();
  };
}

// Common validation schemas for reuse
const CommonSchemas = {
  // UUID ID parameter
  idParam: {
    id: { type: FieldTypes.UUID, required: true }
  },

  // Pagination query params
  pagination: {
    page: { type: FieldTypes.INTEGER, min: 1, required: false },
    limit: { type: FieldTypes.INTEGER, min: 1, max: 100, required: false }
  },

  // Date range query params
  dateRange: {
    fromDate: { type: FieldTypes.DATE, required: false },
    toDate: { type: FieldTypes.DATE, required: false }
  },

  // Sample/lice count creation
  sampleCreate: {
    merdId: { type: FieldTypes.UUID, required: true },
    dato: { type: FieldTypes.DATE, required: true, noFuture: true },
    tidspunkt: { type: FieldTypes.STRING, required: false },
    temperatur: { type: FieldTypes.NUMBER, min: -2, max: 30, required: false },
    dodfisk: { type: FieldTypes.INTEGER, min: 0, required: false },
    notat: { type: FieldTypes.STRING, maxLength: 1000, required: false },
    observations: {
      type: FieldTypes.ARRAY,
      required: true,
      minItems: 1,
      maxItems: 100,
      itemSchema: {
        fishId: { type: FieldTypes.STRING, required: true },
        voksneHunnlus: { type: FieldTypes.INTEGER, min: 0, max: 50, required: false },
        bevegeligeLus: { type: FieldTypes.INTEGER, min: 0, max: 100, required: false },
        fastsittendeLus: { type: FieldTypes.INTEGER, min: 0, max: 100, required: false }
      }
    }
  },

  // Treatment creation
  treatmentCreate: {
    treatment_type: {
      type: FieldTypes.ENUM,
      values: ['Hydrogenperoksid', 'Termisk', 'Mekanisk', 'Rensefisk', 'Ferskvann', 'Imidakloprid', 'Azametifos', 'Annet'],
      required: true
    },
    scheduled_date: { type: FieldTypes.DATE, required: true },
    status: {
      type: FieldTypes.ENUM,
      values: ['planlagt', 'pågår', 'fullført', 'kansellert'],
      required: false
    },
    lice_before: { type: FieldTypes.LICE_COUNT, required: false },
    effectiveness_percent: { type: FieldTypes.NUMBER, min: 0, max: 100, required: false }
  },

  // Alert preferences
  alertPreferences: {
    email_notifications: { type: FieldTypes.BOOLEAN, required: false },
    sms_notifications: { type: FieldTypes.BOOLEAN, required: false },
    push_notifications: { type: FieldTypes.BOOLEAN, required: false },
    email_address: { type: FieldTypes.EMAIL, required: false },
    phone_number: { type: FieldTypes.PHONE, required: false },
    lice_threshold_warning: { type: FieldTypes.NUMBER, min: 0, max: 1, required: false },
    lice_threshold_critical: { type: FieldTypes.NUMBER, min: 0, max: 2, required: false }
  }
};

module.exports = {
  FieldTypes,
  validateField,
  validateObject,
  validateBody,
  validateQuery,
  validateParams,
  CommonSchemas
};
