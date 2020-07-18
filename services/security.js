const jwt = require('jsonwebtoken'); // JSON Web Token implementation

class Security {

  static async validUser(ctx, next) {
    console.log('testing user');
    ctx.state.user = await Security.valdateJWT(ctx);
    if (ctx.state.user.id > 0) {
      return next();
    }
    return false;
  }

  static async validAdmin(ctx, next) {
    ctx.state.user = await Security.valdateJWT(ctx);
    if (ctx.state.user.id > 0 && ctx.state.user.userRoleId >= 1) {
      return next();
    }
    return false;
  }

  static async valdateJWT(ctx) {
    let payload = {};
    if (!ctx.header.authorization) ctx.throw(401, 'Authorisation required');
    const [scheme, token] = ctx.header.authorization.split(' ');
    if (scheme !== 'Bearer') ctx.throw(401, 'Invalid authorisation');

    try {
      payload = jwt.verify(token, process.env.JWT_KEY); // throws on invalid token
      // valid token: accept it...

      let sqla = `select status from user where id = ${payload.id}`;
      const [[res]] = await global.db.query(sqla);

      if (res.status === 0) {
        ctx.body = "Account Disabled";
        const error = {status: 401, message: 'Account Disabled'};
        throw (error);
      }

    } catch (e) {
      if (e.message === 'invalid token') ctx.throw(401, 'Invalid JWT'); // Unauthorized
      ctx.throw(e.status || 401, e.message); // Internal Server Error
    }
    return payload;
  }
}

module.exports = Security;
