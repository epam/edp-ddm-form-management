/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

const _ = require('lodash');

module.exports = () => async (component, data, handler, action, { validation }) => {
  // Only perform before validation has occurred.
  if (validation && ['put', 'post', 'patch'].includes(action)) {
    let value = _.get(data, component.key);
    if (value) {
      value = _.isArray(value) ? value.map((val) => (val ? new Date(val) : '')) : new Date(value);
      _.set(data, component.key, value);
    } else if (value === '') {
      _.set(data, component.key, null);
    }
  }
};
