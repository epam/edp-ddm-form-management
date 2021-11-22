/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

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
