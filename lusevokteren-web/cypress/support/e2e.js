// Cypress E2E Support File
import '@testing-library/cypress/add-commands'

// Custom command: Login via API
Cypress.Commands.add('login', (email = 'demo@fjordvind.no', password = 'Demo123!') => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/auth/login`,
    body: { email, password },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200 && response.body.token) {
      window.localStorage.setItem('auth_token', response.body.token)
    }
  })
})

// Custom command: Login via UI
Cypress.Commands.add('loginViaUI', (email = 'demo@fjordvind.no', password = 'Demo123!') => {
  cy.visit('/login')
  cy.get('input[type="email"], input[name="email"]').type(email)
  cy.get('input[type="password"], input[name="password"]').type(password)
  cy.get('button[type="submit"]').click()
})

// Custom command: Logout
Cypress.Commands.add('logout', () => {
  window.localStorage.removeItem('auth_token')
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
      err.message.includes('Failed to fetch')) {
    return false
  }
  return true
})
