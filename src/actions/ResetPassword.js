/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

const jwt = require('jsonwebtoken');
const _ = require('lodash');
const debug = require('../services/customDebug')('formio:action:passrest');

const util = require('../util/util');
const hookModule = require('../util/hook');
const emailModule = require('../util/email');
const { hasOwnProperty } = require('../util/helpers');

const LOG_EVENT = 'Reset Password Action';

module.exports = (router) => {
  const { Action } = router.formio;
  const hook = hookModule(router.formio);
  const emailer = emailModule(router.formio);
  const { errorCodes } = router.formio.util;
  const logOutput = router.formio.log || debug;
  const log = (...args) => logOutput(LOG_EVENT, ...args);

  /**
   * ResetPasswordAction class.
   *   This class is used to implement Forgot Password.
   */
  class ResetPasswordAction extends Action {
    static info(req, res, next) {
      next(null, {
        name: 'resetpass',
        title: 'Reset Password',
        description: 'Provides a way to reset a password field.',
        defaults: {
          handler: ['after', 'before'],
          method: ['form', 'create'],
        },
        access: {
          handler: false,
          method: false,
        },
      });
    }

    static settingsForm(req, res, next) {
      // Get the available email transports.
      emailer.availableTransports(req, (err, availableTransports) => {
        if (err) {
          log(req, errorCodes.emailer.ENOTRANSP, err);
          return next(err);
        }

        const basePath = hook.alter('path', '/form', req);
        const dataSrc = `${basePath}/${req.params.formId}/components`;

        // Return the reset password information.
        return next(null, [
          {
            type: 'select',
            input: true,
            label: 'Resources',
            key: 'resources',
            placeholder: 'Select the resources we should reset password against.',
            dataSrc: 'url',
            data: { url: `${basePath}?type=resource` },
            valueProperty: '_id',
            template: '<span>{{ item.title }}</span>',
            multiple: true,
            validate: {
              required: true,
            },
          },
          {
            type: 'select',
            input: true,
            label: 'Username Field',
            key: 'username',
            placeholder: 'Select the username field',
            template: '<span>{{ item.label || item.key }}</span>',
            dataSrc: 'url',
            data: { url: dataSrc },
            valueProperty: 'key',
            multiple: false,
            validate: {
              required: true,
            },
          },
          {
            type: 'select',
            input: true,
            label: 'Password Field',
            key: 'password',
            placeholder: 'Select the password field',
            template: '<span>{{ item.label || item.key }}</span>',
            dataSrc: 'url',
            data: { url: dataSrc },
            valueProperty: 'key',
            multiple: false,
            validate: {
              required: true,
            },
          },
          {
            label: 'Reset Link URL',
            key: 'url',
            inputType: 'text',
            defaultValue: '',
            input: true,
            placeholder: 'Enter the URL they should go to reset their password.',
            type: 'textfield',
            multiple: false,
            validate: {
              required: true,
            },
          },
          {
            label: 'Reset Password Button Label',
            key: 'label',
            inputType: 'text',
            defaultValue: 'Email Reset Password Link',
            input: true,
            placeholder: '',
            type: 'textfield',
            multiple: false,
          },
          {
            type: 'select',
            input: true,
            label: 'Transport',
            key: 'transport',
            placeholder: 'Select the email transport.',
            template: '<span>{{ item.title }}</span>',
            defaultValue: 'default',
            dataSrc: 'json',
            data: {
              json: JSON.stringify(availableTransports),
            },
            valueProperty: 'transport',
            multiple: false,
            validate: {
              required: true,
            },
          },
          {
            label: 'From:',
            key: 'from',
            inputType: 'email',
            defaultValue: 'no-reply@form.io',
            input: true,
            placeholder: 'Send the email from the following address',
            type: 'textfield',
            multiple: false,
          },
          {
            label: 'Subject',
            key: 'subject',
            inputType: 'text',
            defaultValue: 'You requested a password reset',
            input: true,
            placeholder: '',
            type: 'textfield',
            multiple: false,
          },
          {
            label: 'Message',
            key: 'message',
            type: 'textarea',
            defaultValue: '<p>Forgot your password? No problem.</p><p><a href="{{ resetlink }}">'
                          + 'Click here to reset your password</a></p> ',
            multiple: false,
            rows: 3,
            suffix: '',
            prefix: '',
            placeholder: '',
            input: true,
          },
        ]);
      });
    }

    /**
     * Return a submission based on the token.
     *
     * @param req
     * @param token
     * @param next
     */
    getSubmission(req, token, next) {
      // Only continue if the resources are provided.
      if (!token.resources || !token.resources.length) {
        return;
      }

      // Set the name of the key for the mongo query.
      const usernamekey = `data.${this.settings.username}`;

      // Create the query.
      const query = {
        deleted: { $eq: null },
      };

      query[usernamekey] = { $regex: new RegExp(`^${util.escapeRegExp(token.username)}$`), $options: 'i' };
      query.form = { $in: _.map(token.resources, router.formio.mongoose.Types.ObjectId) };

      // Perform a mongo query to find the submission.
      const submissionModel = req.submissionModel || router.formio.resources.submission.model;
      submissionModel.findOne(hook.alter('submissionQuery', query, req), (err, submission) => {
        if (err || !submission) {
          log(req, errorCodes.submission.ENOSUB, err);
          return next(errorCodes.submission.ENOSUB);
        }

        // Submission found.
        return next(null, submission);
      });
    }

    /**
     * Update a submission for the password.
     *
     * @param req
     * @param token
     * @param password
     * @param next
     */
    updatePassword(req, token, password, next) {
      // Get the submission.
      this.getSubmission(req, token, (err, submission) => {
        // Make sure we found the user.
        if (err || !submission) {
          log(req, errorCodes.user.ENOUSER, err);
          return next(errorCodes.user.ENOUSER);
        }

        // Get the name of the password field.
        if (!this.settings.password) {
          log(req, errorCodes.auth.EPASSFIELD, new Error(errorCodes.auth.EPASSFIELD));
          return next(errorCodes.auth.EPASSFIELD);
        }

        // Manually encrypt and update the password.
        return router.formio.encrypt(password, (encryptErr, hash) => {
          if (encryptErr) {
            log(req, errorCodes.auth.EPASSRESET, encryptErr);
            return next(errorCodes.auth.EPASSRESET);
          }

          const setValue = {
            [`data.${this.settings.password}`]: hash,
          };

          // Update the password.
          const submissionModel = req.submissionModel || router.formio.resources.submission.model;
          return submissionModel.updateOne(
            // eslint-disable-next-line no-underscore-dangle
            { _id: submission._id },
            { $set: setValue },
            (updateErr) => {
              if (updateErr) {
                log(req, errorCodes.auth.EPASSRESET, updateErr);
                return next(errorCodes.auth.EPASSRESET);
              }

              // The submission was saved!
              return next(null, submission);
            },
          );
        });
      });
    }

    /**
     * Initialize the action.
     */
    initialize(method, req, res, next) {
      // See if we have a reset password token.
      const hasResetToken = Boolean(req.tempToken && (req.tempToken.type === 'resetpass'));
      if (!hasResetToken && (method === 'create')) {
        // Figure out the username data.
        const username = _.get(req.body.data, this.settings.username);

        // Make sure they have a username.
        if (!username) {
          log(req, errorCodes.user.ENONAMEP, new Error(errorCodes.user.ENONAMEP));
          return res.status(400).send('You must provide a username to reset your password.');
        }

        // Create a token.
        const token = {
          username,
          form: req.formId,
          resources: this.settings.resources,
          temp: true,
          type: 'resetpass',
        };

        // Look up the user.
        this.getSubmission(req, token, (err, submission) => {
          if (err || !submission) {
            log(req, errorCodes.user.ENOUSER, err);
            return res.status(400).send(errorCodes.user.ENOUSER);
          }

          // Generate a temporary token for resetting their password.
          const resetToken = jwt.sign(token, router.formio.config.jwt.secret, {
            expiresIn: 5 * 60,
          });

          // Create the reset link and add it to the email parameters.
          const params = {
            resetlink: `${this.settings.url}?x-jwt-token=${resetToken}`,
          };

          const {
            transport,
            from,
            subject,
            message,
          } = this.settings;

          // Now send them an email.
          emailer.send(req, res, {
            transport,
            from,
            emails: username,
            subject,
            message,
          }, _.assign(params, req.body), (emailErr) => {
            if (emailErr) {
              log(req, errorCodes.emailer.ESENDMAIL, emailErr);
            }
            // Let them know an email is on its way.
            res.status(200).json({
              message: 'Password reset email was sent.',
            });
          });
          return null;
        });
      } else {
        // Set the username for validation purposes.
        if (req.tempToken && req.tempToken.type === 'resetpass') {
          _.set(req.body.data, this.settings.username, req.tempToken.username);
        }

        return next();
      }
      return null;
    }

    /**
     * Perform a forgot password implementation.
     *
     * @param handler
     * @param method
     * @param req
     *   The Express request object.
     * @param res
     *   The Express response object.
     * @param next
     *   The callback function to execute upon completion.
     *
     * @returns {*}
     */
    resolve(handler, method, req, res, next) {
      // See if we have a reset password token.
      const hasResetToken = Boolean(req.tempToken && (req.tempToken.type === 'resetpass'));

      // Only show the reset password username field on form get.
      if (
        (handler === 'after')
        && (method === 'form')
        && hasOwnProperty(req.query, 'live') && (parseInt(req.query.live, 10) === 1)
        && hasOwnProperty(res, 'resource')
        && hasOwnProperty(res.resource, 'item')
        // eslint-disable-next-line no-underscore-dangle
        && res.resource.item._id
      ) {
        // Modify the form based on if there is a reset token or not.
        util.eachComponent(res.resource.item.components, (component) => {
          if (
            !hasResetToken
            && (component.type === 'button')
            && (component.action === 'submit')
          ) {
            // eslint-disable-next-line no-param-reassign
            component.label = this.settings.label;
          } else if (
            (!hasResetToken && (component.key !== this.settings.username))
            || (hasResetToken && (component.key === this.settings.username))
          ) {
            // eslint-disable-next-line no-param-reassign
            component.type = 'hidden';
            if (component.validate) {
              // eslint-disable-next-line no-param-reassign
              component.validate.required = false;
            }
          }
        });

        return next();
      }

      // Handle the request after they have come back.
      if (
        hasResetToken
        && (handler === 'before')
        && (method === 'create')
      ) {
        if (
          !req.tempToken.username
          || !req.tempToken.form
        ) {
          debug(errorCodes.auth.ERESETTOKEN, req);
          return res.status(400).send(errorCodes.auth.ERESETTOKEN);
        }

        // Get the password
        const password = _.get(req.submission.data, this.settings.password);
        if (!password) {
          debug(errorCodes.auth.ENOPASSP);
          return next(errorCodes.auth.ENOPASSP);
        }

        // Update the password.
        this.updatePassword(req, req.tempToken, password, (err) => {
          if (err) {
            log(req, errorCodes.auth.EPASSRESET, new Error(errorCodes.auth.EPASSRESET));
            return res.status(400).send('Unable to update the password. Please try again.');
          }
          return res.status(200).send({
            message: 'Password was successfully updated.',
          });
        });
      } else {
        return next();
      }
      return null;
    }
  }

  ResetPasswordAction.access = {
    handler: false,
    method: false,
  };

  // Return the ResetPasswordAction.
  return ResetPasswordAction;
};
