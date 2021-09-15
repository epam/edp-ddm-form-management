const { Router } = require('express');
const prometheusRouter = require('./prometheus');

const customRoutes = Router();

customRoutes.use('/actuator/prometheus', prometheusRouter);

module.exports = customRoutes;
