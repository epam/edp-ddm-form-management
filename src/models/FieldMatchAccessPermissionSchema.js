/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

module.exports = function (formio) {
  const hook = require('../util/hook')(formio);
  const typeError = 'Value does not match a selected type';

  // Defines the permissions schema for field match access form's permissions.
  return new formio.mongoose.Schema(hook.alter('fieldMatchAccessPermissionSchema', {
    formFieldPath: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    operator: {
      type: String,
      enum: ['$eq', '$lt', '$gt', '$lte', '$gte', '$in'],
      default: '$eq',
    },
    valueType: {
      type: String,
      enum: ['string', 'number', 'boolean', '[string]', '[number]'],
      required: true,
      default: 'string',
      validate: [
        {
          validator(type) {
            // eslint-disable-next-line default-case
            switch (type) {
              case 'number':
                return Number.isFinite(Number(this.value));
              case 'boolean':
                return (this.value === 'true' || this.value === 'false');
              case '[number]':
                return this.value.replace(/(^,)|(,$)/g, '')
                  .split(',')
                  .map((val) => Number(val))
                  .every((val) => Number.isFinite(val));
            }
          },
          message: typeError,
        },
      ],
    },
    roles: {
      type: [formio.mongoose.Schema.Types.ObjectId],
      ref: 'role',
    },
  }), { _id: false });
};
