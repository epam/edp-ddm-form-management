/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

module.exports = (model) => {
  const timestamps = require('../plugins/timestamps');

  // Add timestamps to the schema.
  model.schema.plugin(timestamps, { index: true });

  // Disable removal of empty objects
  model.schema.set('minimize', false);

  // Export the model.
  return model;
};
