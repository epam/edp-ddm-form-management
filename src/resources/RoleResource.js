const Resource = require('resourcejs');
const hookModule = require('../util/hook');

module.exports = function roleResource(router) {
  const hook = hookModule(router.formio);
  const handlers = {};

  handlers.before = [
    (req, res, next) => {
      // Disable Patch for roles for now.
      if (req.method === 'PATCH') {
        return res.sendStatus(405);
      }
      return next();
    },
    router.formio.middleware.filterIdCreate,
    router.formio.middleware.filterMongooseExists({ field: 'deleted', isNull: true }),
    router.formio.middleware.deleteRoleHandler,
    router.formio.middleware.sortMongooseQuery({ title: 1 }),
  ];
  handlers.after = [
    router.formio.middleware.bootstrapNewRoleAccess,
    router.formio.middleware.filterResourcejsResponse(['deleted', '__v']),
  ];

  return Resource(
    router,
    '',
    'role',
    router.formio.mongoose.model('role'),
  ).rest(hook.alter('roleRoutes', handlers));
};
