const retSvc = require('./return'); // return formatter
const bunyan = require('bunyan'); // logging

class MiddleWare {
  static async responseTime(ctx, next) {
    const t1 = Date.now();
    await next();
    const t2 = Date.now();
    ctx.set('X-Response-Time', Math.ceil(t2 - t1) + 'ms');
  }

  static async robots(ctx, next) {
    await next();
    ctx.response.set('X-Robots-Tag', 'noindex, nofollow');
  }

  static async sqlConnection(ctx, next) {
    try {
      // keep copy of ctx.state.db in global for access from models
      ctx.state.db = global.db = await global.connectionPool.getConnection();
      ctx.state.db.connection.config.namedPlaceholders = true;
      // traditional mode ensures not null is respected for unsupplied fields, ensures valid JavaScript dates, etc
      await ctx.state.db.query('SET SESSION sql_mode = "TRADITIONAL"');
      await next();

      ctx.state.db.release();

    } catch (e) {
      // note if getConnection() fails we have no this.state.db, but if anything downstream throws,
      // we need to release the connection
      if (ctx.state.db) ctx.state.db.release();
      throw e;
    }
  }

  static makeLogger() {
    const access = {
      type:   'rotating-file',
      path:   './logs/api-access.log',
      level:  'trace',
      period: '1d',
      count:  4,
    };
    const error = {
      type:   'rotating-file',
      path:   './logs/api-error.log',
      level:  'error',
      period: '1d',
      count:  4,
    };
    return bunyan.createLogger({ name: 'gapi', streams: [ access, error ] });
  }

  static handleErrors(app) {
    return async function handleErrors(ctx, next) {
      try {
        await next();
      } catch (e) {
        ctx.status = e.status || 500;
        switch (ctx.status) {
          case 204: // No Content
            console.log('status', ctx.status);
            break;
          case 401: // Unauthorized
            ctx.set('WWW-Authenticate', 'Bearer');
            // ctx.body = { message: "login error"};
            break;
          case 403: // Forbidden
          case 404: // Not Found
          case 406: // Not Acceptable
          case 409: // Conflict
            ctx.body = {message: e.message};
            break;
          default:
          case 500: // Internal Server Error (for uncaught or programming errors)
            console.error(ctx.status, e.message);
            ctx.body = retSvc.setReturn({message: e.message}, false, e);
            if (app.env !== 'production') ctx.body.data.stack = e.stack;
            ctx.app.emit('error', e, ctx); // github.com/koajs/koa/wiki/Error-Handling
            break;
        }
      }
    };
  }
}

module.exports = MiddleWare;
