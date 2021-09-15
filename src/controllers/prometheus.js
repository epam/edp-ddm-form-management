const prometheusService = require('../services/prometheus');

class PrometheusController {
  async getMetrics(req, res) {
    res.setHeader('Content-Type', prometheusService.metricsRegistry.contentType);
    const metrics = await prometheusService.getMetrics();
    res.end(metrics);
  }
}

module.exports = PrometheusController;
