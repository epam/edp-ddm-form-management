/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

const bcrypt = require('bcryptjs');

module.exports = function (text, next) {
  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return next(err);
    }

    bcrypt.hash(text, salt, (error, hash) => {
      if (error) {
        return next(error);
      }

      next(null, hash);
    });
  });
};
