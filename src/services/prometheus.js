/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

const client = require('prom-client');

const { NODE_APP_INSTANCE = 'form-management' } = process.env;

class PrometheusService {
  constructor() {
    // Create a Registry which registers the metrics
    const register = new client.Registry();
    // Add a default label which is added to all metrics
    client.collectDefaultMetrics({ register, labels: { NODE_APP_INSTANCE } });
    this.metricsRegistry = register;
  }

  getMetrics() {
    return this.metricsRegistry.metrics();
  }
}

module.exports = new PrometheusService();
