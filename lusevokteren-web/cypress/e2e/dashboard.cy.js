// E2E Tests: Dashboard
describe('Dashboard', () => {
  beforeEach(() => {
    // Set demo token to simulate logged in state
    cy.window().then((win) => {
      win.localStorage.setItem('auth_token', 'demo_token_admin')
    })
  })

  describe('Overview Page', () => {
    it('should load dashboard overview', () => {
      cy.visit('/oversikt')
      // Should not redirect to login
      cy.url().should('include', '/oversikt')
    })

    it('should display key statistics', () => {
      cy.visit('/oversikt')
      // Look for common dashboard elements
      cy.get('body').should('be.visible')
      // Dashboard should have some content after loading
      cy.wait(1000)
      cy.get('body').then(($body) => {
        // Check for stats cards, numbers, or dashboard content
        const hasContent =
          $body.find('[class*="stat"], [class*="card"], [class*="metric"]').length > 0 ||
          $body.text().includes('lus') ||
          $body.text().includes('merd') ||
          $body.text().includes('lokalitet')
        expect(hasContent).to.be.true
      })
    })

    it('should have navigation menu', () => {
      cy.visit('/oversikt')
      cy.get('nav, [role="navigation"], aside, header').should('exist')
    })
  })

  describe('Navigation', () => {
    it('should navigate to history page', () => {
      cy.visit('/oversikt')
      cy.contains(/historikk|history|tellinger/i).click()
      cy.url().should('match', /historikk|history/)
    })

    it('should navigate to map page', () => {
      cy.visit('/oversikt')
      cy.contains(/kart|map/i).click()
      cy.url().should('match', /kart|map/)
    })

    it('should navigate to treatments page', () => {
      cy.visit('/oversikt')
      cy.contains(/behandling|treatment/i).click()
      cy.url().should('match', /behandling|treatment/)
    })

    it('should navigate to alerts page', () => {
      cy.visit('/oversikt')
      cy.contains(/varsle|alert/i).click()
      cy.url().should('match', /varsle|alert/)
    })

    it('should navigate to settings page', () => {
      cy.visit('/oversikt')
      cy.contains(/innstilling|setting/i).click()
      cy.url().should('match', /innstilling|setting/)
    })
  })
})
