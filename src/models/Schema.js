/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

module.exports = function (formio) {
  /**
   * The Schema for Schema.
   *
   * @type {exports.Schema}
   */
  const SchemaSchema = new formio.mongoose.Schema({
    key: {
      type: String,
      required: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    version: {
      type: String,
      default: null,
    },
    value: {
      type: String,
      default: null,
    },
  }, { collection: 'schema' });

  return { schema: SchemaSchema };
};
