const _ = require('lodash');
const Entities = require('html-entities').AllHtmlEntities;
const { Formio } = require('../util/util');
const localization = require('../localization/ua.json');

const entities = new Entities();

const debug = {
  validator: require('../services/customDebug')('formio:validator'),
  error: require('../services/customDebug')('formio:error'),
};

let hook = null;

// Mock for Formio select requests
Object.assign(Formio, {
  makeRequest: () => Promise.resolve([]),
});

/**
 * @TODO: Isomorphic validation system.
 *
 * @param form
 * @param model
 * @constructor
 */
class Validator {
  constructor(form, model, token, decodedToken) {
    this.model = model;
    this.form = form;
    this.token = token;

    const self = this;
    const { evalContext } = Formio.Components.components.component.prototype;
    Formio.Components.components.component.prototype.evalContext = function (additional) {
      return evalContext.call(this, self.evalContext(additional));
    };

    // Change Formio.getToken to return the server decoded token.
    const { getToken } = Formio;
    Formio.getToken = (options) => (options.decode ? decodedToken : getToken(options));
  }

  evalContext(context) {
    context = context || {};
    context.form = this.form;
    return hook.alter('evalContext', context, this.form);
  }

  static setHook(_hook) {
    hook = _hook;
  }

  /**
   * Validate a submission for a form.
   *
   * @param {Object} submission
   *   The data submission object.
   * @param next
   *   The callback function to pass the results.
   */
  /* eslint-disable max-statements */
  validate(submission, next) {
    debug.validator('Starting validation');
    // Skip validation if no data is provided.
    if (!submission.data) {
      debug.validator('No data skipping validation');
      debug.validator(submission);
      return next();
    }

    const unsets = [];
    const emptyData = _.isEmpty(submission.data);
    let unsetsEnabled = false;

    // Create the form, then check validity.
    Formio.createForm(this.form, {
      server: true,
      hooks: {
        setDataValue(value, key, data) {
          if (!unsetsEnabled) {
            return value;
          }
          // Check if this component is not persistent.
          if (this.component.hasOwnProperty('persistent')
            && (!this.component.persistent || this.component.persistent === 'client-only')
          ) {
            unsets.push({ key, data });
            // Check if this component is conditionally hidden and does not set clearOnHide to false.
          } else if (
            (!this.component.hasOwnProperty('clearOnHide') || this.component.clearOnHide)
            && (!this.conditionallyVisible() || !this.parentVisible)
          ) {
            // unsets.push({ key, data });
          } else if (
            this.component.type === 'password' && value === this.defaultValue
          ) {
            unsets.push({ key, data });
          }
          return value;
        },
      },
      language: 'ua',
      i18n: {
        ua: localization,
      },
    }).then((form) => {
      // Set the validation config.
      form.validator.config = {
        db: this.model,
        token: this.token,
        form: this.form,
        submission,
      };

      // Set the submission data
      form.data = submission.data;

      // Perform calculations and conditions.
      form.calculateValue();
      form.checkConditions();

      // Reset the data
      form.data = {};

      // Set the value to the submission.
      unsetsEnabled = true;
      form.setValue(submission, {
        sanitize: true,
      });

      // Check the validity of the form.
      form.checkAsyncValidity(null, true).then((valid) => {
        if (valid) {
          // Clear the non-persistent fields.
          unsets.forEach((unset) => _.unset(unset.data, unset.key));
          submission.data = emptyData ? {} : form.data;
          return next(null, submission.data);
        }

        const details = [];
        form.errors.forEach((error) => error.messages.forEach(
          (message) => details.push({ ...message, message: entities.decode(message.message) }),
        ));

        // Return the validation errors.
        return next({
          name: 'ValidationError',
          details,
        });
      }).catch(next);
    }).catch(next);
  }
}

module.exports = Validator;
