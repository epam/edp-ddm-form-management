/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

/**
 * Middleware function to filter index if option is set.
 *
 * @param router
 * @param {array} settings
 *
 * @returns {Function}
 */
module.exports = () => (settings) => (req, res, next) => {
  if (
    req.method !== 'GET'
    || !req.filterIndex
    || !res.resource
    || !res.resource.item
  ) {
    return next();
  }

  // Handle single items
  if (!Array.isArray(res.resource.item)) {
    settings.forEach((setting) => {
      delete res.resource.item[setting];
    });
    return next();
  }

  // Handle arrays.
  res.resource.item.forEach((item) => {
    settings.forEach((setting) => {
      delete item[setting];
    });
  });

  next();
};
