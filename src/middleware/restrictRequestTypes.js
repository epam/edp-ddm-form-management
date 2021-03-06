/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

module.exports = function (router) {
  /**
   * Middleware to restrict incoming requests by method.
   *
   * @param req
   * @param res
   * @param next
   * @returns {*}
   */
  return function (req, res, next) {
    const hook = require('../util/hook')(router.formio);
    const methods = hook.alter('methods', ['OPTIONS', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
    if (methods.includes(req.method)) {
      return next();
    }

    return res.sendStatus(405);
  };
};
