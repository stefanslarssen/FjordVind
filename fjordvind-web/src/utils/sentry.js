/**
 * Sentry Error Tracking Configuration
 *
 * Initializes Sentry for production error monitoring.
 * Only active in production builds.
 */

import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
const isProd = import.meta.env.PROD
const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0'

/**
 * Initialize Sentry error tracking
 */
export function initSentry() {
  // Only initialize in production with valid DSN
  if (!isProd || !SENTRY_DSN) {
    if (isProd && !SENTRY_DSN) {
      console.warn('[Sentry] No DSN configured. Error tracking disabled.')
    }
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: `fjordvind@${appVersion}`,

    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Session replay for debugging (optional)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Filter out noisy errors
    ignoreErrors: [
      // Network errors that are expected
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      // User-cancelled requests
      'AbortError',
      // Browser extension errors
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
    ],

    // Don't send PII
    beforeSend(event) {
      // Remove sensitive data from the event
      if (event.request?.cookies) {
        delete event.request.cookies
      }

      // Sanitize user data
      if (event.user) {
        // Only keep user ID, remove email/name
        event.user = { id: event.user.id }
      }

      return event
    },

    // Configure integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  })

  console.log('[Sentry] Error tracking initialized')
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(user) {
  if (!isProd || !SENTRY_DSN) return

  if (user) {
    Sentry.setUser({
      id: user.id,
      // Don't include email/name for privacy
    })
  } else {
    Sentry.setUser(null)
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(category, message, data = {}) {
  if (!isProd || !SENTRY_DSN) return

  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  })
}

/**
 * Capture exception manually
 */
export function captureException(error, context = {}) {
  if (!isProd || !SENTRY_DSN) {
    console.error('[Error]', error, context)
    return
  }

  Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * Capture message for logging
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (!isProd || !SENTRY_DSN) {
    console.log(`[${level.toUpperCase()}]`, message, context)
    return
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  })
}

export default {
  initSentry,
  setSentryUser,
  addBreadcrumb,
  captureException,
  captureMessage,
}
