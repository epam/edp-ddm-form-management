const { Router } = require('express');
const PrometheusController = require('../controllers/prometheus');

const prometheusRouter = Router();
const prometheusController = new PrometheusController();
prometheusRouter.get('/', prometheusController.getMetrics);

module.exports = prometheusRouter;
