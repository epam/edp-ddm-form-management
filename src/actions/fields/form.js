/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

const _ = require('lodash');
const util = require('../../util/util');

module.exports = (router) => {
  /**
   * Perform hierarchial submissions of sub-forms.
   */
  const submitSubForms = function (component, data, validation, req, res, path, next) {
    // Only submit subforms after validation has occurred.
    if (!validation) {
      return next();
    }

    // Get the submission object.
    const subSubmission = _.get(data, component.key, {});

    // if there isn't a sub-submission or the sub-submission has an _id, don't submit.
    // Should be submitted from the frontend.
    if (
      (req.method === 'POST' && subSubmission._id)
      || (req.method === 'PUT' && !subSubmission._id)
      || (req.method === 'PUT' && subSubmission._id && _.isEmpty(subSubmission.data))
    ) {
      return next();
    }

    // Only execute if the component should save reference and conditions do not apply.
    if (
      (component.hasOwnProperty('reference') && !component.reference)
      || !util.FormioUtils.checkCondition(component, {}, req.body.data)
    ) {
      return next();
    }

    let url = '/form/:formId/submission';
    if (['PUT', 'PATCH'].includes(req.method)) {
      url += '/:submissionId';
    }
    const childRes = router.formio.util.createSubResponse((err) => {
      if (childRes.statusCode > 299) {
        // Add the parent path to the details path.
        if (err && err.details && err.details.length) {
          _.each(err.details, (details) => {
            if (details.path) {
              details.path = `${path}.data.${details.path}`;
              details.path = details.path.replace(/[[\]]/g, '.')
                .replace(/\.\./g, '.')
                .split('.')
                .map((part) => _.defaultTo(_.toNumber(part), part));
            }
          });
        }

        return res.headersSent ? next() : res.status(childRes.statusCode).json(err);
      }
    });
    const childReq = router.formio.util.createSubRequest(req);
    if (!childReq) {
      return res.headersSent ? next() : res.status(400).json('Too many recursive requests.');
    }
    childReq.body = subSubmission;

    // Make sure to pass along the submission state to the subforms.
    if (req.body.state) {
      childReq.body.state = req.body.state;
    }

    childReq.params.formId = component.form;
    if (subSubmission._id) {
      childReq.params.submissionId = subSubmission._id;
    }

    // Make the child request.
    const method = (req.method === 'POST') ? 'post' : 'put';

    if (req.method === 'PATCH') {
      childReq.subPatch = true;
    }

    router.resourcejs[url][method](childReq, childRes, (err) => {
      if (err) {
        return next(err);
      }

      if (!req.query.dryrun) {
        if (childRes.resource && childRes.resource.item) {
          _.set(data, component.key, childRes.resource.item);
        }
      }
      next();
    });
  };

  /*
   * Set parent submission id in externalIds of child form component's submission
   */
  const setChildFormParenthood = function (component, data, validation, req, res, path, next) {
    if (
      res.resource
      && res.resource.item
      && res.resource.item.data
      && (!component.hasOwnProperty('reference') || component.reference)
    ) {
      // Get child form component's value
      const compValue = _.get(res.resource.item.data, path);

      // Fetch the child form's submission
      if (compValue && compValue._id) {
        const submissionModel = req.submissionModel || router.formio.resources.submission.model;
        submissionModel.findOne(
          { _id: compValue._id, deleted: { $eq: null } },
        ).exec((err, submission) => {
          if (err) {
            return router.formio.util.log(err);
          }

          if (!submission) {
            return router.formio.util.log('No subform found to update external ids.');
          }

          // Update the submission's externalIds.
          let found = false;
          submission.externalIds = submission.externalIds || [];
          _.each(submission.externalIds, (externalId) => {
            if (externalId.type === 'parent') {
              found = true;
            }
          });
          if (!found) {
            submission.externalIds.push({
              type: 'parent',
              id: res.resource.item._id,
            });
            submission.save((err) => {
              if (err) {
                return router.formio.util.log(err);
              }
            });
          }
        });
      }
    }

    return next();
  };

  return async (component, data, handler, action, {
    validation, path, req, res,
  }) => {
    // eslint-disable-next-line default-case
    switch (handler) {
      case 'beforePut':
      case 'beforePost':
        return new Promise((resolve, reject) => {
          submitSubForms(component, data, validation, req, res, path, (err) => {
            if (err) {
              return reject(err);
            }
            return resolve();
          });
        });
      case 'afterPut':
      case 'afterPost':
        return new Promise((resolve, reject) => {
          setChildFormParenthood(component, data, validation, req, res, path, (err) => {
            if (err) {
              return reject(err);
            }
            return resolve();
          });
        });
    }
  };
};
