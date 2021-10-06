/**
 * This is the Form.io application server.
 */
const express = require('express');
const nunjucks = require('nunjucks');
const fs = require('fs-extra');
const path = require('path');
require('colors');
const Q = require('q');
const cors = require('cors');
const readLine = require('readline');
const nativeFs = require('fs');
const nodeConfig = require('config');

const mainModule = require('./index');
const util = require('./src/util/util');
const kongAuthHandler = require('./src/middleware/kongAuthHandler');
const installScript = require('./install');
const customRoutes = require('./src/routes');
const loggerService = require('./src/services/logger');

const test = process.env.TEST_SUITE;
const noInstall = process.env.NO_INSTALL;

module.exports = function serverModule(options = {}) {
  const q = Q.defer();

  util.log('');
  const rl = readLine.createInterface({
    input: nativeFs.createReadStream('logo.txt'),
  });

  // rl.on('line', (line) => {
  //   util.log(
  //     line.substring(0, 4)
  //     + line.substring(4, 30).cyan.bold
  //     + line.substring(30, 33)
  //     + line.substring(33, 42).green.bold
  //     + line.substring(42),
  //   );
  // });

  rl.on('close', () => {
    // Print the welcome screen.
    util.log('');
    util.log(fs.readFileSync('welcome.txt').toString().green);
  });

  // Use the express application.
  const app = options.app || express();

  // Non formio custom routes
  app.use(loggerService.middleware);
  app.use(customRoutes);

  // Use the given config.
  const config = options.config || nodeConfig;

  // Configure nunjucks.
  nunjucks.configure('client', {
    autoescape: true,
    express: app,
  });

  // cors configuration
  if (config.allowedOrigins) {
    app.use(cors({
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true);
        }
        if (config.allowedOrigins.indexOf(origin) === -1 && config.allowedOrigins.indexOf('*') === -1) {
          const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
          return callback(new Error(msg), false);
        }
        return callback(null, true);
      },
    }));
  }
  // Mount the client application.
  // app.use('/', express.static(path.join(__dirname, '/client/dist')));

  // Load the form.io server.
  const server = options.server || mainModule(config);
  const hooks = options.hooks || {};

  app.use(server.formio.middleware.restrictRequestTypes);
  server.init(hooks).then((formio) => {
    // Called when we are ready to start the server.
    function start() {
      // Start the application.
      if (fs.existsSync('app')) {
        const application = express();
        application.use('/', express.static(path.join(__dirname, '/app/dist')));
        config.appPort = config.appPort || 8080;
        application.listen(config.appPort);
        const appHost = `http://localhost:${config.appPort}`;
        util.log(` > Serving application at ${appHost.green}`);
      }

      // Mount the Form.io API platform.
      app.use(options.mount || '/', kongAuthHandler(['*']), server);

      // Allow tests access server internals.
      app.formio = formio;

      // Listen on the configured port.
      return q.resolve({
        server: app,
        config,
      });
    }

    // Which items should be installed.
    const install = {
      download: false,
      extract: false,
      import: false,
      user: false,
    };

    // Check for the client folder.
    // if (!fs.existsSync('client') && !test && !noInstall) {
    //   install.download = true;
    //   install.extract = true;
    // }

    // See if they have any forms available.
    formio.db.collection('forms').estimatedDocumentCount((err, numForms) => {
      // If there are forms, then go ahead and start the server.
      if ((!err && numForms > 0) || test || noInstall) {
        if (!install.download && !install.extract) {
          return start();
        }
      }

      // Import the project and create the user.
      install.import = true;
      install.user = true;

      // Install.
      return installScript(formio, install, (installErr) => {
        if (installErr && installErr !== 'Installation canceled.') {
          return util.log(installErr.message);
        }

        // Start the server.
        return start();
      });
    });
  });

  return q.promise;
};
