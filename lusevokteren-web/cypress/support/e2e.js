// Cypress E2E Support File
import '@testing-library/cypress/add-commands'

// Custom command: Login via API (for Supabase)
Cypress.Commands.add('login', (email = 'demo@fjordvind.no', password = 'Demo123!') => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/auth/login`,
    body: { email, password },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200 && response.body.token) {
      cy.window().then((win) => {
        win.localStorage.setItem('auth_token', response.body.token)
      })
    }
  })
})

// Custom command: Login via UI
Cypress.Commands.add('loginViaUI', (email = 'demo@fjordvind.no', password = 'Demo123!') => {
  cy.visit('/login')
  cy.get('input[type="email"], input[name="email"]').first().clear().type(email)
  cy.get('input[type="password"], input[name="password"]').first().clear().type(password)
  cy.get('button[type="submit"]').click()
  cy.url().should('not.include', '/login', { timeout: 10000 })
})

// Custom command: Set demo authentication state
Cypress.Commands.add('setDemoAuth', (role = 'admin') => {
  cy.window().then((win) => {
    const demoUser = {
      id: `demo-${role}-id`,
      email: `demo-${role}@fjordvind.no`,
      role: role,
      full_name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`
    }
    win.localStorage.setItem('auth_token', `demo_token_${role}`)
    win.localStorage.setItem('demo_user', JSON.stringify(demoUser))
  })
})

// Custom command: Logout
Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    win.localStorage.clear()
  })
  cy.visit('/login')
})

// Custom command: Check if logged in
Cypress.Commands.add('shouldBeLoggedIn', () => {
  cy.url().should('not.include', '/login')
})

// Custom command: Check if logged out
Cypress.Commands.add('shouldBeLoggedOut', () => {
  cy.url().should('include', '/login')
})

// Custom command: Wait for page to be ready
Cypress.Commands.add('waitForPageReady', () => {
  cy.get('body').should('be.visible')
  cy.window().its('document.readyState').should('eq', 'complete')
})

// Custom command: Check for element with retries
Cypress.Commands.add('getWithRetry', (selector, options = {}) => {
  const { timeout = 10000, retries = 3 } = options
  return cy.get(selector, { timeout })
})

// Preserve cookies/localStorage between tests
beforeEach(() => {
  cy.window().then((win) => {
    win.localStorage.clear()
  })
})

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent Cypress from failing the test
  // when there are uncaught exceptions from the app
  if (err.message.includes('ResizeObserver') ||
      err.message.includes('Network Error') ||
      err.message.includes('Failed to fetch') ||
      err.message.includes('Loading chunk') ||
      err.message.includes('dynamically imported module')) {
    return false
  }
  return true
})
