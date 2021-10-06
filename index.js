// Setup the Form.IO server.
const express = require('express');
const cors = require('cors');

const router = express.Router();
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
const bodyParser = require('body-parser');
const _ = require('lodash');
const events = require('events');
const Q = require('q');
const nunjucks = require('nunjucks');
const log = require('./src/services/customDebug')('formio:log');
const util = require('./src/util/util');
const middleware = require('./src/middleware/middleware');
const { schema } = require('./package.json');
const hook = require('./src/util/hook');
const encrypt = require('./src/util/encrypt');
const dbIndex = require('./src/db/index');
const auth = require('./src/authentication/index');
const BaseModel = require('./src/models/BaseModel');
const plugins = require('./src/plugins/plugins');
const PermissionSchema = require('./src/models/PermissionSchema');
const AccessSchema = require('./src/models/AccessSchema');
const FieldMatchAccessPermissionSchema = require('./src/models/FieldMatchAccessPermissionSchema');
const modelsModule = require('./src/models/models');
const resources = require('./src/resources/resources');
const cache = require('./src/cache/cache');
const actions = require('./src/actions/actions');
const exportModule = require('./src/export/export');
const defaultTemplate = require('./src/templates/default.json');
const emptyTemplate = require('./src/templates/empty.json');
const template = require('./src/templates/index');
const swagger = require('./src/util/swagger');
const recaptcha = require('./src/middleware/recaptcha');
const { hasOwnProperty } = require('./src/util/helpers');

// Keep track of the formio interface.
router.formio = {};

// Allow libraries to use a single instance of mongoose.
router.formio.mongoose = mongoose;

// Use custom template delimiters.
_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

// Allow custom configurations passed to the Form.IO server.
module.exports = function main(config) {
  // Give app a reference to our config.
  router.formio.config = config;

  // Add the middleware.
  router.formio.middleware = middleware(router);

  // Configure nunjucks to not watch any files
  nunjucks.configure([], {
    watch: false,
  });

  // Allow events to be triggered.
  router.formio.events = new events.EventEmitter();
  router.formio.config.schema = schema;

  router.formio.log = (event, req, ...info) => {
    const result = router.formio.hook.alter('log', event, req, ...info);

    if (result) {
      log(event, ...info);
    }
  };

  router.formio.audit = (event, req, ...info) => {
    if (config.audit) {
      const result = router.formio.hook.alter('audit', info, event, req);

      if (result) {
        // eslint-disable-next-line no-console
        console.log(...result);
      }
    }
  };

  /**
   * Initialize the formio server.
   */
  router.init = function init(hooks) {
    const deferred = Q.defer();

    // Hooks system during boot.
    router.formio.hooks = hooks;

    // Add the utils to the formio object.
    router.formio.util = util;

    // Get the hook system.
    router.formio.hook = hook(router.formio);

    // Get the encryption system.
    router.formio.encrypt = encrypt;

    // Load the updates and attach them to the router.
    router.formio.update = dbIndex(router.formio);

    // Run the healthCheck sanity check on /health
    /* eslint-disable max-statements */
    router.formio.update.initialize((err, db) => {
      // If an error occurred, then reject the initialization.
      if (err) {
        return deferred.reject(err);
      }

      util.log('Initializing API Server.');

      // Add the database connection to the router.
      router.formio.db = db;

      // Ensure we do not have memory leaks in core renderer
      router.use((req, res, next) => {
        util.Formio.forms = {};
        util.Formio.cache = {};
        next();
      });

      // Establish our url alias middleware.
      if (!router.formio.hook.invoke('init', 'alias', router.formio)) {
        router.use(router.formio.middleware.alias);
      }

      // Establish the parameters.
      if (!router.formio.hook.invoke('init', 'params', router.formio)) {
        router.use(router.formio.middleware.params);
      }

      // Add the db schema sanity check to each request.
      router.use(router.formio.update.sanityCheck);

      // Add Middleware necessary for REST API's
      router.use(bodyParser.urlencoded({ extended: true }));
      router.use(bodyParser.json({
        limit: '16mb',
      }));

      // Error handler for malformed JSON
      router.use((jsonErr, req, res, next) => {
        if (jsonErr instanceof SyntaxError) {
          res.status(400).send(jsonErr.message);
        }

        next();
      });

      // CORS Support
      const corsRoute = cors(router.formio.hook.alter('cors'));
      router.use((req, res, next) => {
        if (req.url === '/') {
          return next();
        }

        if (res.headersSent) {
          return next();
        }

        return corsRoute(req, res, next);
      });

      // Import our authentication models.
      router.formio.auth = auth(router);

      // Perform token mutation before all requests.
      if (!router.formio.hook.invoke('init', 'token', router.formio)) {
        router.use(router.formio.middleware.tokenHandler);
      }

      // The get token handler
      if (!router.formio.hook.invoke('init', 'getTempToken', router.formio)) {
        router.get('/token', router.formio.auth.tempToken);
      }

      // The current user handler.
      if (!router.formio.hook.invoke('init', 'logout', router.formio)) {
        router.get('/logout', router.formio.auth.logout);
      }

      // The current user handler.
      if (!router.formio.hook.invoke('init', 'current', router.formio)) {
        router.get('/current', router.formio.hook.alter('currentUser', [router.formio.auth.currentUser]));
      }

      // The access handler.
      if (!router.formio.hook.invoke('init', 'access', router.formio)) {
        router.get('/access', router.formio.middleware.accessHandler);
      }

      // Authorize all urls based on roles and permissions.
      if (!router.formio.hook.invoke('init', 'perms', router.formio)) {
        router.use(router.formio.middleware.permissionHandler);
      }

      let mongoUrl = config.mongo;
      let mongoConfig = config.mongoConfig ? JSON.parse(config.mongoConfig) : {};
      if (!hasOwnProperty(mongoConfig, 'connectTimeoutMS')) {
        mongoConfig.connectTimeoutMS = 300000;
      }
      if (!hasOwnProperty(mongoConfig, 'socketTimeoutMS')) {
        mongoConfig.socketTimeoutMS = 300000;
      }
      if (!hasOwnProperty(mongoConfig, 'useNewUrlParser')) {
        mongoConfig.useNewUrlParser = true;
      }
      if (!hasOwnProperty(mongoConfig, 'keepAlive')) {
        mongoConfig.keepAlive = 120;
      }
      if (process.env.MONGO_HIGH_AVAILABILITY) {
        mongoConfig.mongos = true;
      }
      if (_.isArray(config.mongo)) {
        mongoUrl = config.mongo.join(',');
        mongoConfig.mongos = true;
      }
      if (config.mongoSA || config.mongoCA) {
        mongoConfig.sslValidate = true;
        mongoConfig.sslCA = config.mongoSA || config.mongoCA;
      }

      mongoConfig.useUnifiedTopology = true;
      mongoConfig.useCreateIndex = true;

      if (config.mongoSSL) {
        mongoConfig = {
          ...mongoConfig,
          ...config.mongoSSL,
        };
      }

      // Connect to MongoDB.
      mongoose.connect(mongoUrl, mongoConfig);
      mongoose.set('useFindAndModify', false);
      mongoose.set('useCreateIndex', true);

      // Trigger when the connection is made.
      mongoose.connection.on('error', (dbError) => {
        util.log(dbError.message);
        deferred.reject(dbError.message);
      });

      // Called when the connection is made.
      mongoose.connection.once('open', () => {
        util.log(' > Mongo connection established.');

        // Load the BaseModel.
        router.formio.BaseModel = BaseModel;

        // Load the plugins.
        router.formio.plugins = plugins;

        router.formio.schemas = {
          PermissionSchema: PermissionSchema(router.formio),
          AccessSchema: AccessSchema(router.formio),
          FieldMatchAccessPermissionSchema: FieldMatchAccessPermissionSchema(router.formio),
        };

        // Get the models for our project.
        const models = modelsModule(router);

        // Load the Schemas.
        router.formio.schemas = _.assign(router.formio.schemas, models.schemas);

        // Load the Models.
        router.formio.models = models.models;

        // Load the Resources.
        router.formio.resources = resources(router);

        // Load the request cache
        router.formio.cache = cache(router);

        // Return the form components.
        router.get('/form/:formId/components', (req, res, next) => {
          router.formio.resources.form.model
            .findOne({ _id: req.params.formId }, (findErr, form) => {
              if (findErr) {
                return next(findErr);
              }

              if (!form) {
                return res.status(404).send('Form not found');
              }
              // If query params present, filter components that match params
              const filter = Object.keys(req.query).length !== 0 ? _.omit(req.query, ['limit', 'skip']) : null;
              return res.json(
                _(util.flattenComponents(form.components))
                  .filter((component) => {
                    if (!filter) {
                      return true;
                    }
                    return _.reduce(filter, (prev, value, prop) => {
                      if (!value) {
                        return prev && _.has(component, prop);
                      }
                      const actualValue = _.property(prop)(component);
                      // loose equality so number values can match
                      return (prev && actualValue == value) // eslint-disable-line eqeqeq
                    || (value === 'true' && actualValue === true)
                    || (value === 'false' && actualValue === false);
                    }, true);
                  })
                  .values()
                  .value(),
              );
            });
        });

        // Import the form actions.
        router.formio.Action = router.formio.models.action;
        router.formio.actions = actions(router);

        // Add submission data export capabilities.
        exportModule(router);

        // Add the available templates.
        router.formio.templates = {
          default: _.cloneDeep(defaultTemplate),
          empty: _.cloneDeep(emptyTemplate),
        };

        // Add the template functions.
        router.formio.template = template(router);

        // Show the swagger for the whole site.
        router.get('/spec.json', (req, res) => {
          swagger(req, router, (spec) => {
            res.json(spec);
          });
        });

        // Show the swagger for specific forms.
        router.get('/form/:formId/spec.json', (req, res) => {
          swagger(req, router, (spec) => {
            res.json(spec);
          });
        });

        recaptcha(router);

        // Say we are done.
        deferred.resolve(router.formio);
      });
      return null;
    });
    /* eslint-enable max-statements */

    return deferred.promise;
  };

  // Return the router.
  return router;
};
