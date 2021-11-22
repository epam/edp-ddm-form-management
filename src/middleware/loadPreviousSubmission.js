/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

module.exports = (router) => (req, res, next) => {
  if (!['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  router.formio.cache.loadSubmission(
    req,
    req.body.form,
    req.body._id,
    (err, previousSubmission) => {
      if (err) {
        return next(err);
      }

      req.previousSubmission = previousSubmission;
      return next();
    },
  );
};
