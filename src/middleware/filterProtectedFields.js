/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

const util = require('../util/util');

/**
 * Middleware function to filter protected fields from a submission response.
 *
 * @param router
 *
 * @returns {Function}
 */
module.exports = function (router) {
  return function (action, getForm) {
    return function (req, res, next) {
      if (!res || !res.resource || !res.resource.item) {
        return next();
      }

      router.formio.cache.loadForm(req, null, getForm(req), (err, form) => {
        if (err) {
          return next(err);
        }

        util.removeProtectedFields(form, action, res.resource.item);
        next();
      });
    };
  };
};
