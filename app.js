const Koa = require('koa'); // Koa framework
const body = require('koa-body'); // body parser
const mysql = require('mysql2/promise'); // fast mysql driver
const cors = require('koa2-cors'); // CORS for Koa 2
const util = require('./models/util');
const koaLogger = require('koa-bunyan'); // logging
const middleware = require('./services/middleware');
const app = new Koa();

// MySQL connection pool (set up on app initialisation)
global.connectionPool = mysql.createPool(util.config()); // put in global to pass to sub-apps

// return response time in X-Response-Time header
app.use(middleware.responseTime);

// only search-index www subdomain
app.use(middleware.robots);

// parse request body into ctx.request.body
app.use(body());

// handle thrown or uncaught exceptions anywhere down the line
app.use(middleware.handleErrors(app));

// default cors settings for now
app.use(cors());

// set up MySQL connection
app.use(middleware.sqlConnection);

// logging
const logger = middleware.makeLogger();
app.use(koaLogger(logger, {}));

app.use(require('./routes/routes-root.js'));
app.use(require('./routes/routes-auth.js'));

// Secure routes below here
app.use(require('./routes/routes-user.js'));
app.use(require('./routes/routes-dbBackup.js'));

/* create server - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

app.listen(process.env.PORT || 3000);
console.info(
  `${process.version} listening on port ${process.env.PORT || 3000} (${
    app.env
  }/${util.config().database})`
);

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


module.exports = app;
