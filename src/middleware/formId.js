/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

/**
 * Middleware to set formId from params.
 *
 * @returns {Function}
 */
module.exports = () => (req, res, next) => {
  if (!req.formId && req.params.formId) {
    req.formId = req.params.formId;
  }
  next();
};
