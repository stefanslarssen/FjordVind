import { useState, useCallback } from 'react'
import { validateField, validateForm } from '../utils/validation'

/**
 * Custom hook for form validation
 * @param {Object} initialValues - Initial form values
 * @param {Object} validationSchema - Validation schema { fieldName: [validators] }
 * @param {Function} onSubmit - Submit handler called with validated data
 * @returns {Object} Form state and handlers
 */
export function useFormValidation(initialValues, validationSchema, onSubmit) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Handle field change
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value

    setValues(prev => ({ ...prev, [name]: newValue }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
    setSubmitError(null)
  }, [errors])

  // Set field value programmatically
  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }, [errors])

  // Handle field blur - validate single field
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target

    setTouched(prev => ({ ...prev, [name]: true }))

    // Validate field if schema exists for it
    if (validationSchema[name]) {
      const error = validateField(value, validationSchema[name], name)
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }, [validationSchema])

  // Validate all fields
  const validateAll = useCallback(() => {
    const result = validateForm(values, validationSchema)
    setErrors(result.errors)
    // Mark all fields as touched
    const allTouched = Object.keys(validationSchema).reduce((acc, key) => {
      acc[key] = true
      return acc
    }, {})
    setTouched(allTouched)
    return result.valid
  }, [values, validationSchema])

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault()

    setSubmitError(null)

    // Validate all fields
    if (!validateAll()) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(values)
    } catch (error) {
      // Handle API validation errors
      if (error.error?.errors && Array.isArray(error.error.errors)) {
        // Try to map API errors to fields
        const fieldErrors = {}
        error.error.errors.forEach(errMsg => {
          // Simple heuristic: check if error mentions a field name
          const fieldNames = Object.keys(validationSchema)
          const matchedField = fieldNames.find(f =>
            errMsg.toLowerCase().includes(f.toLowerCase())
          )
          if (matchedField) {
            fieldErrors[matchedField] = errMsg
          }
        })

        if (Object.keys(fieldErrors).length > 0) {
          setErrors(prev => ({ ...prev, ...fieldErrors }))
        } else {
          setSubmitError(error.error.errors.join('. '))
        }
      } else {
        setSubmitError(error.error?.message || error.message || 'En feil oppstod')
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [values, validationSchema, validateAll, onSubmit])

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setSubmitError(null)
    setIsSubmitting(false)
  }, [initialValues])

  // Check if field has error and has been touched
  const getFieldError = useCallback((name) => {
    return touched[name] ? errors[name] : null
  }, [errors, touched])

  // Check if form is valid
  const isValid = Object.keys(errors).every(key => !errors[key])

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    setValues,
    setErrors,
    getFieldError,
    validateAll,
    reset
  }
}

/**
 * Simple field error display component helper
 * @param {string} error - Error message
 * @returns {Object|null} Style object for error display
 */
export function getErrorStyle(error) {
  if (!error) return null
  return {
    color: '#ef4444',
    fontSize: '12px',
    marginTop: '4px'
  }
}

/**
 * Get input style with error state
 * @param {string} error - Error message
 * @param {Object} baseStyle - Base input style
 * @returns {Object} Combined style object
 */
export function getInputStyle(error, baseStyle = {}) {
  return {
    ...baseStyle,
    borderColor: error ? '#ef4444' : baseStyle.borderColor || 'var(--border)',
    outline: error ? '2px solid rgba(239, 68, 68, 0.2)' : 'none'
  }
}

export default useFormValidation
