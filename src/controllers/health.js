const healthService = require('../services/health');

class HealthController {
  getLivenessState(req, res) {
    res.send(healthService.getLivenessState());
  }

  getReadinessState(req, res) {
    const response = healthService.getReadinessState();
    if (response.status === 'DOWN') {
      res.status(503);
    }
    res.send(response);
  }
}

module.exports = HealthController;
