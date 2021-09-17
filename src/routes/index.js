const { Router } = require('express');
const expressActuator = require('express-actuator');
const HealthController = require('../controllers/health');

const prometheusRouter = require('./prometheus');

const customRoutes = Router();
const healthController = new HealthController();

customRoutes.use('/actuator/prometheus', prometheusRouter);
// express-actuator defines 3 endpoints - /info, /metrics, /health
customRoutes.use('/actuator', expressActuator({
  infoGitMode: 'full',
  customEndpoints: [
    {
      id: 'health/readiness',
      controller: healthController.getReadinessState,
    },
    {
      id: 'health/liveness',
      controller: healthController.getLivenessState,
    },
  ],
}));

module.exports = customRoutes;
