/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

// const jwt = require('jsonwebtoken');

// eslint-disable-next-line no-unused-vars
const kongAuthHandler = (allowedRoles) => (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (!token) {
    // return res.sendStatus(401);
  }
  // console.log('req.headers - ', req.headers);
  // console.log('allowedRoles - ', allowedRoles);
  if (token) {
    // realm_access: { roles: [ 'developer', 'uma_authorization' ] },
    // resource_access: { test: { roles: [Array] }, account: { roles: [Array] } },
    // role: [ 'offline_access', 'developer', 'uma_authorization' ],
    // preferred_username: 'test',
    // client_role: [ 'test-role' ]
    // const { realm_access, resource_access, role, client_role } = jwt.decode(token);
    // console.log('realm_access - ', realm_access);
    // console.log('resource_access - ', resource_access);
    // console.log('role - ', role);
    // console.log('client_role - ', client_role);
  }
  return next();
};

module.exports = kongAuthHandler;
