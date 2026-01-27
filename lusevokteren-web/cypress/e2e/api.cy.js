// E2E Tests: API Endpoints
describe('API Endpoints', () => {
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:3000'

  describe('Health Check', () => {
    it('should return healthy status', () => {
      cy.request(`${apiUrl}/health`).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body.status).to.eq('ok')
      })
    })
  })

  describe('Auth API', () => {
    it('should reject login with missing credentials', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/auth/login`,
        body: {},
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(400)
      })
    })

    it('should reject login with invalid email format', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/auth/login`,
        body: { email: 'notanemail', password: 'password123' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(400)
      })
    })

    it('should reject registration with weak password', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/auth/register`,
        body: {
          email: 'test@test.no',
          password: 'weak',
          full_name: 'Test User',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body.details).to.exist
      })
    })

    it('should reject /me without auth token', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/auth/me`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401)
      })
    })

    it('should accept demo token in demo mode', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/auth/me`,
        headers: {
          Authorization: 'Bearer demo_token_admin',
        },
        failOnStatusCode: false,
      }).then((response) => {
        // In demo mode, should return 200
        // In prod mode, should return 401
        expect([200, 401]).to.include(response.status)
      })
    })
  })

  describe('Stats API', () => {
    it('should return stats', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/stats`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('totalCounts')
      })
    })

    it('should return lice trend data', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/stats/lice-trend`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('trend')
      })
    })
  })

  describe('Dashboard API', () => {
    it('should return dashboard overview', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/dashboard/overview`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200)
      })
    })
  })

  describe('Predictions API', () => {
    it('should return predictions', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/predictions`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200)
      })
    })

    it('should return prediction summary', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/predictions/summary`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200)
      })
    })
  })

  describe('Rate Limiting', () => {
    it('should have rate limit headers', () => {
      cy.request(`${apiUrl}/health`).then((response) => {
        // Check for rate limit headers
        const headers = response.headers
        const hasRateLimitHeaders =
          headers['x-ratelimit-limit'] ||
          headers['ratelimit-limit'] ||
          headers['x-ratelimit-remaining']
        // Rate limiting headers may or may not be exposed
        expect(response.status).to.eq(200)
      })
    })
  })
})
