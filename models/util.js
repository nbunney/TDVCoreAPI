const Return = require('../services/return');
const crypto = require('crypto');

require('dotenv').config(); // loads environment variables from .env file (if available - eg dev env)

class Util {

  static config() {
    return {
      host:     process.env.DB_HOST,
      port:     process.env.DB_PORT,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      charset:  'utf8mb4',
    };
  }

  static async version(ctx) {
    try {
      const [[data]] = await global.db.query(`select *
                                              from version
                                              order by id desc
                                              limit 1`);
      ctx.body = Return.setReturn(data);
    } catch (e) {
      ctx.body = Return.setReturn(null, false, e);
      throw e;
    }
  }

  static async getRoot(ctx) {
    // root element just returns uri's for principal resources (in preferred format)
    const authentication = '‘POST /auth’ to obtain JSON Web Token; subsequent requests require JWT auth as a bearer token.';
    ctx.body = {authentication: authentication};
  }

  static async validatePW(password, passwordHash, passwordSalt, passwordIterations) {
    const newHash = crypto.pbkdf2Sync(password, passwordSalt, passwordIterations, 64, 'sha512');
    return passwordHash === newHash.toString();
  }

  static async makePWHash(password) {
    const salt = crypto.randomBytes(128).toString('base64');
    const iterations = 10000 + getRandomInt(1000);
    const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512');

    return {
      salt: salt,
      hash: hash.toString(),
      iterations: iterations
    };
  }
}
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max)) + 1;
}

module.exports = Util;
