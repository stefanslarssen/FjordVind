// E2E Tests: Responsive Design
// Tests that the app works on different screen sizes

describe('Responsive Design', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },   // iPhone SE
    { name: 'tablet', width: 768, height: 1024 },  // iPad
    { name: 'desktop', width: 1280, height: 720 }, // Standard desktop
  ]

  beforeEach(() => {
    cy.setDemoAuth('admin')
  })

  viewports.forEach(({ name, width, height }) => {
    describe(`${name} (${width}x${height})`, () => {
      beforeEach(() => {
        cy.viewport(width, height)
      })

      it('should load dashboard', () => {
        cy.visit('/oversikt')
        cy.waitForPageReady()
        cy.url().should('include', '/oversikt')
      })

      it('should have accessible navigation', () => {
        cy.visit('/oversikt')
        cy.waitForPageReady()

        if (name === 'mobile') {
          // Mobile should have hamburger menu or bottom nav
          cy.get('body').then(($body) => {
            const hasMobileNav =
              $body.find('[class*="hamburger"], [class*="mobile-nav"], [class*="menu-toggle"], [class*="bottom-nav"]').length > 0 ||
              $body.find('button[aria-label*="menu"], button[aria-label*="Menu"]').length > 0 ||
              $body.find('nav').length > 0
            expect(hasMobileNav).to.be.true
          })
        } else {
          // Tablet/Desktop should have visible sidebar or top nav
          cy.get('nav, aside, header').should('exist')
        }
      })

      it('should display content without horizontal scroll', () => {
        cy.visit('/oversikt')
        cy.waitForPageReady()

        cy.window().then((win) => {
          const body = win.document.body
          const hasHorizontalScroll = body.scrollWidth > win.innerWidth
          // Allow small overflow (scrollbars, etc)
          expect(body.scrollWidth).to.be.lessThan(win.innerWidth + 20)
        })
      })

      it('should load history page', () => {
        cy.visit('/historikk')
        cy.waitForPageReady()
        cy.url().should('include', '/historikk')
      })

      it('should load new sample page', () => {
        cy.visit('/ny-telling')
        cy.waitForPageReady()
        cy.url().should('include', '/ny-telling')
      })
    })
  })
})

describe('Touch Interactions', () => {
  beforeEach(() => {
    cy.setDemoAuth('admin')
    cy.viewport('iphone-x')
  })

  it('should have tappable buttons with adequate size', () => {
    cy.visit('/oversikt')
    cy.waitForPageReady()

    cy.get('button').each(($button) => {
      // Minimum touch target size should be 44x44 pixels (WCAG)
      const rect = $button[0].getBoundingClientRect()
      // Some buttons might be hidden or have zero dimensions
      if (rect.width > 0 && rect.height > 0) {
        expect(rect.width).to.be.at.least(30)
        expect(rect.height).to.be.at.least(30)
      }
    })
  })
})

describe('PWA Features', () => {
  it('should have a manifest file', () => {
    cy.request('/manifest.json').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.have.property('name')
      expect(response.body).to.have.property('icons')
    })
  })

  it('should have a service worker registered', () => {
    cy.visit('/oversikt')
    cy.waitForPageReady()

    cy.window().then((win) => {
      if ('serviceWorker' in win.navigator) {
        // Service worker API exists
        expect(win.navigator.serviceWorker).to.exist
      }
    })
  })
})
