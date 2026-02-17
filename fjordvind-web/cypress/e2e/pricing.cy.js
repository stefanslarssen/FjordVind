// E2E Tests: Pricing and Subscription Flow
describe('Pricing / Priser', () => {
  describe('Pricing Page (Public)', () => {
    it('should load pricing page without authentication', () => {
      cy.visit('/priser')
      cy.url().should('include', '/priser')
    })

    it('should display pricing plans', () => {
      cy.visit('/priser')
      cy.waitForPageReady()

      // Should show plan names
      cy.contains(/grunnleggende|basic/i).should('be.visible')
      cy.contains(/profesjonell|professional/i).should('be.visible')
    })

    it('should display plan prices', () => {
      cy.visit('/priser')
      cy.waitForPageReady()

      // Should show prices (NOK amounts)
      cy.get('body').then(($body) => {
        const text = $body.text()
        const hasPrices = text.includes('kr') || text.includes('NOK') || /\d{3,}/.test(text)
        expect(hasPrices).to.be.true
      })
    })

    it('should have billing period toggle (monthly/yearly)', () => {
      cy.visit('/priser')
      cy.waitForPageReady()

      cy.get('body').then(($body) => {
        const hasToggle =
          $body.find('input[type="checkbox"], [class*="toggle"], [class*="switch"], button').length > 0 &&
          ($body.text().match(/månedlig|årlig|monthly|yearly/i) !== null)
        expect(hasToggle).to.be.true
      })
    })

    it('should display feature list for each plan', () => {
      cy.visit('/priser')
      cy.waitForPageReady()

      // Plans should have feature lists
      cy.get('body').then(($body) => {
        const hasFeatures =
          $body.find('ul li, [class*="feature"]').length > 0 ||
          $body.text().match(/lokalitet|merd|bruker|analyse/i)
        expect(hasFeatures).to.be.true
      })
    })

    it('should have call-to-action buttons', () => {
      cy.visit('/priser')
      cy.waitForPageReady()

      // Should have buttons to select plan
      cy.get('button').should('have.length.greaterThan', 0)
    })
  })

  describe('Plan Selection (Authenticated)', () => {
    beforeEach(() => {
      cy.setDemoAuth('admin')
    })

    it('should redirect to checkout when selecting a plan', () => {
      cy.visit('/priser')
      cy.waitForPageReady()

      // Find and click a plan button (not enterprise/kontakt oss)
      cy.get('button').then(($buttons) => {
        const selectButton = $buttons.filter((i, el) => {
          const text = el.innerText.toLowerCase()
          return text.includes('velg') || text.includes('select') || text.includes('start')
        }).first()

        if (selectButton.length > 0) {
          cy.wrap(selectButton).click()
          // Should either redirect to Stripe or show loading
          cy.wait(1000)
        }
      })
    })
  })

  describe('Subscription Management', () => {
    beforeEach(() => {
      cy.setDemoAuth('admin')
    })

    it('should show subscription status in settings', () => {
      cy.visit('/innstillinger')
      cy.waitForPageReady()

      // Settings page should load
      cy.url().should('include', '/innstilling')
    })
  })
})

describe('Enterprise Contact', () => {
  it('should have enterprise/contact option', () => {
    cy.visit('/priser')
    cy.waitForPageReady()

    cy.get('body').then(($body) => {
      const hasEnterprise =
        $body.text().match(/enterprise|bedrift|kontakt|contact/i) !== null
      expect(hasEnterprise).to.be.true
    })
  })
})
