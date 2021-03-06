/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

/* eslint-disable no-underscore-dangle */
const util = require('../util/util');

/**
 * Middleware to filter the request by owner.
 *
 * @param router
 * @returns {Function}
 */
module.exports = function ownerFilter() {
  return (req, res, next) => {
    // Convert any owner queries to ObjectId's.
    if (req.query && req.query.owner) {
      req.query.owner = util.ObjectId(req.query.owner);
    }

    // Skip this owner filter, if the user is the admin or owner.
    if (req.skipOwnerFilter || req.isAdmin) {
      return next();
    }

    if (!req.token || !req.token.user) {
      return res.sendStatus(401);
    }

    // The default ownerFilter query.
    let query = { owner: util.ObjectId(req.token.user._id) };

    // If the self access flag was enabled in the permissionHandler, allow resources to access themselves.
    if (req.selfAccess) {
      query = {
        $or: [
          query,
          { _id: req.token.user._id },
        ],
      };
    }

    req.countQuery = req.countQuery || req.model || this.model;
    req.countQuery = req.countQuery.find(query);

    req.modelQuery = req.modelQuery || req.model || this.model;
    req.modelQuery = req.modelQuery.find(query);
    return next();
  };
};
