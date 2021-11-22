/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

const healthService = require('./src/services/health');
const util = require('./src/util/util');
require('colors');
require('./server')().then((state) => {
  util.log(` > Serving the Form.io API Platform at ${state.config.domain.green}`);
  healthService.setReadiness(true);
  state.server.listen(state.config.port);
});
