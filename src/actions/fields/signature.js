/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

const _ = require('lodash');

module.exports = (formio) => async (component, data, handler, action, {
  path, req,
}) => {
  let value = _.get(data, component.key);
  // eslint-disable-next-line default-case
  switch (handler) {
    case 'beforePost':
      if (!req.body.data) {
        return;
      }

      // Coerse the value into an empty string.
      if (!value && value !== '') {
        _.set(data, component.key, '');
      }
      break;
    case 'beforePut':
      if (!req.body.data) {
        return;
      }

      // Ensure that signatures are not ever wiped out with a PUT request
      // of data that came from the index request (where the signature is not populated).

      // Coerse the value into an empty string.
      if (!value && (value !== '')) {
        value = '';
        _.set(data, component.key, '');
      }

      if (
        (typeof value !== 'string')
        || ((value !== '') && (value.substr(0, 5) !== 'data:'))
      ) {
        return new Promise((resolve, reject) => {
          formio.cache.loadCurrentSubmission(req, (err, submission) => {
            if (err) {
              return reject(err);
            }
            if (!submission) {
              return reject(new Error('No submission found.'));
            }

            _.set(data, component.key, _.get(submission.data, path));
            return resolve();
          });
        });
      }
  }
};
