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
const statsRoutes = require('./stats');
const barentswatchRoutes = require('./barentswatch');
const dashboardRoutes = require('./dashboard');
const predictionsRoutes = require('./predictions');
const companiesRoutes = require('./companies');
const zonesRoutes = require('./zones');
const notificationsRoutes = require('./notifications');
const uploadsRoutes = require('./uploads');
const weatherRoutes = require('./weather');
const reportsRoutes = require('./reports');
const supportRoutes = require('./support');

module.exports = {
  auth: authRoutes,
  samples: samplesRoutes,
  treatments: treatmentsRoutes,
  alerts: alertsRoutes,
  mortality: mortalityRoutes,
  environment: environmentRoutes,
  locations: locationsRoutes,
  merds: merdsRoutes,
  stats: statsRoutes,
  barentswatch: barentswatchRoutes,
  dashboard: dashboardRoutes,
  predictions: predictionsRoutes,
  companies: companiesRoutes,
  zones: zonesRoutes,
  notifications: notificationsRoutes,
  uploads: uploadsRoutes,
  weather: weatherRoutes,
  reports: reportsRoutes,
  support: supportRoutes
};
