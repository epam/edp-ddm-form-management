/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

module.exports = (router) => ({
  import: require('./import')(router),
  export: require('./export')(router),
});
