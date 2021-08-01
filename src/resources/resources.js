const hookModule = require('../util/hook');
const formResource = require('./FormResource');
const submissionResource = require('./SubmissionResource');
const roleResource = require('./RoleResource');

module.exports = function resources(router) {
  const hook = hookModule(router.formio);
  return hook.alter('resources', {
    form: formResource(router),
    submission: submissionResource(router),
    role: roleResource(router),
  });
};
