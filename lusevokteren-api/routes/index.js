// Route index for FjordVind/Lusevokteren API
// Exports all route modules for centralized registration

const authRoutes = require('./auth');
const samplesRoutes = require('./samples');
const treatmentsRoutes = require('./treatments');
const alertsRoutes = require('./alerts');
const mortalityRoutes = require('./mortality');
const environmentRoutes = require('./environment');
const locationsRoutes = require('./locations');
const merdsRoutes = require('./merds');

module.exports = {
  auth: authRoutes,
  samples: samplesRoutes,
  treatments: treatmentsRoutes,
  alerts: alertsRoutes,
  mortality: mortalityRoutes,
  environment: environmentRoutes,
  locations: locationsRoutes,
  merds: merdsRoutes
};
