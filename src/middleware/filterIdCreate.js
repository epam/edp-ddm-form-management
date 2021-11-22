/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

/**
 * Middleware function to filter _id on create.
 *
 * @param router
 *
 * @returns {Function}
 */
module.exports = () => function (req, res, next) {
  // Only run on create requests.
  if (req.method !== 'POST') {
    return next();
  }

  // Don't allow setting _id on create.
  delete req.body._id;
  return next();
};
