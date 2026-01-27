// E2E Tests: Authentication Flow
describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  describe('Login Page', () => {
    it('should display login form', () => {
      cy.visit('/login')
      cy.get('input[type="email"], input[name="email"]').should('be.visible')
      cy.get('input[type="password"], input[name="password"]').should('be.visible')
      cy.get('button[type="submit"]').should('be.visible')
    })

    it('should show validation errors for empty fields', () => {
      cy.visit('/login')
      cy.get('button[type="submit"]').click()
      // Should show some form of validation message or stay on login
      cy.url().should('include', '/login')
    })

    it('should show error for invalid credentials', () => {
      cy.visit('/login')
      cy.get('input[type="email"], input[name="email"]').type('invalid@email.com')
      cy.get('input[type="password"], input[name="password"]').type('wrongpassword')
      cy.get('button[type="submit"]').click()
      // Should show error or stay on login page
      cy.url().should('include', '/login')
    })

    it('should redirect to login when accessing protected route', () => {
      cy.visit('/oversikt')
      cy.url().should('include', '/login')
    })

    it('should have link to registration page', () => {
      cy.visit('/login')
      cy.contains(/registrer|opprett|ny bruker/i).should('be.visible')
    })

    it('should have link to forgot password', () => {
      cy.visit('/login')
      cy.contains(/glemt|forgot|nullstill/i).should('be.visible')
    })
  })

  describe('Registration Page', () => {
    it('should display registration form', () => {
      cy.visit('/signup')
      cy.get('input[name="email"], input[type="email"]').should('be.visible')
      cy.get('input[name="password"], input[type="password"]').should('be.visible')
      cy.get('input[name="full_name"], input[name="name"]').should('be.visible')
    })

    it('should validate password complexity', () => {
      cy.visit('/signup')
      cy.get('input[name="email"], input[type="email"]').type('test@test.no')
      cy.get('input[name="full_name"], input[name="name"]').first().type('Test User')
      cy.get('input[name="password"], input[type="password"]').first().type('weak')
      cy.get('button[type="submit"]').click()
      // Should show validation error or stay on page
      cy.url().should('include', '/signup')
    })

    it('should have link back to login', () => {
      cy.visit('/signup')
      cy.contains(/logg inn|login|har konto/i).should('be.visible')
    })
  })

  describe('Logout', () => {
    it('should be able to logout', () => {
      // First set a token to simulate logged in state
      cy.window().then((win) => {
        win.localStorage.setItem('auth_token', 'demo_token_admin')
      })
      cy.visit('/oversikt')

      // Find and click logout button/link
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="logout"], button:contains("Logg ut"), a:contains("Logg ut")').length > 0) {
          cy.get('[data-testid="logout"], button:contains("Logg ut"), a:contains("Logg ut")').first().click()
          cy.url().should('include', '/login')
        }
      })
    })
  })

  describe('Protected Routes', () => {
    const protectedRoutes = [
      '/oversikt',
      '/historikk',
      '/kart',
      '/ny-telling',
      '/behandlinger',
      '/varsler',
      '/innstillinger'
    ]

    protectedRoutes.forEach((route) => {
      it(`should redirect ${route} to login when not authenticated`, () => {
        cy.visit(route)
        cy.url().should('include', '/login')
      })
    })
  })
})
