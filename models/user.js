/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* User model; users allowed to access the system                                                 */
/*                                                                                                */
/* All database modifications go through the model; most querying is in the handlers.             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

const Lib = require('../lib/lib.js');
const ModelError = require('./modelerror.js');
const jwt = require('jsonwebtoken'); // JSON Web Token implementation
const randomstring = require('randomstring');
const utils = require('./util');

const MailComposer = require('nodemailer/lib/mail-composer');
const retSvc = require('../services/return');
const crypto = require('crypto');

class User {

  static async getAuth(ctx) {
    let user = null;
    if (ctx.request.body.refreshToken) {
      [user] = await User.getByToken(ctx.request.body.refreshToken);
      if (!user) {
        [user] = await User.getBy('refreshToken', ctx.request.body.refreshToken);
        if (!user) ctx.throw(401, 'Bad Token not found');
      }
    } else {
      [user] = await User.getBy('email', ctx.request.body.email);

      if (!user) ctx.throw(401, 'Username/password not found');

      try {
        const match = await utils.validatePW(ctx.request.body.password, user.passwordHash, user.passwordSalt, user.passwordIterations);
        if (!match) ctx.throw(401, 'Username/password not found.');
      } catch (e) {
        // e.g. "data is not a valid scrypt-encrypted block"
        //ctx.throw(404, e.message);
        ctx.throw(401, 'Username/password not found!');
      }
    }

    try {

      const payload = {
        id: user.id, // to get user details
        role: user.role, // make role available without db query
        dcomAsset: user.dcomAsset,
        dcomLoc: user.dcomLoc,
        updateAsset: user.updateAsset,
        forcePassword: user.forcePassword
      };

      const token = jwt.sign(payload, process.env.JWT_KEY, {
        expiresIn: process.env.TOKEN_TIME,
      });
      const refreshToken = randomstring.generate(50);
      const decoded = jwt.verify(token, process.env.JWT_KEY); // throws on invalid token
      const ret = User.addToken(user.id, refreshToken);

      const result = {
        jwt: token,
        role: user.role,
        fname: user.fname,
        lname: user.lname,
        id: user.id,
        dcomAsset: user.dcomAsset,
        dcomLoc: user.dcomLoc,
        updateAsset: user.updateAsset,
        refreshToken: refreshToken,
        forcePassword: user.forcePassword,
        moveAsset: user.moveAsset,
        approveAssets: user.approveAssets,
        purchasePrice: user.purchasePrice,
        expires: decoded.exp
      };
      ctx.body = retSvc.setReturn(result);
    } catch (e) {
      console.log(e);
      // e.g. "data is not a valid scrypt-encrypted block"
      //ctx.throw(401, e.message);
      ctx.throw(401, 'Username/password not found!');
    }
  }

  static async get(ctx) {
    const userId = ctx.state.user.id;
    const [[user]] = await global.db.query(
      `SELECT * FROM user WHERE id = :userId`, {
        userId
      }
    );
    delete user.password;
    delete user.passwordSalt;
    delete user.passwordHash;
    delete user.passwordIterations;
    ctx.body = retSvc.setReturn(user);
  }

  static async getAllAdmin(ctx) {
    const teamWhere = '';
    if (ctx.state.user.role === 1) {
      ctx.body = [];
      return;
    }
    const [users] = await global.db.query(`SELECT *
                                           FROM user
                                           ORDER BY fname, lname`);

    ctx.body = users;
  }

  static async getRoles(ctx) {
    const [roles] = await global.db.query(
      'Select * From userRole order by id asc;'
    );
    ctx.body = retSvc.setReturn(roles);
  }

  static async updatePassword(ctx) {
    const user = ctx.state.user ? await User.get(ctx.state.user.id) : null;
    if (ctx.request.body.password && ctx.request.body.password.length > 3) {

      const newPasswordInfo = await utils.makePWHash(ctx.request.body.password);

      const [res] = await global.db.query('update user set passwordHash = :passwordHash, passwordSalt = :passwordSalt, passwordIterations = :passwordIterations where id = :id', {
        id: user.id,
        passwordHash: newPasswordInfo.hash,
        passwordSalt: newPasswordInfo.salt,
        passwordIterations: newPasswordInfo.iterations,
      });
      ctx.body = res;
    } else {
      ctx.body = {
        error: "password must be set."
      };
    }
  }

  static async save(ctx) {
    const requestBody = ctx.request.body;
    const resultArray = [];

    if (ctx.request.body.password && ctx.request.body.password.length > 3) {
      const newPasswordInfo = await utils.makePWHash(requestBody.password);

      const resultPass = await global.db.query(
        'update user set passwordHash = :passwordHash, passwordSalt = :passwordSalt, passwordIterations = :passwordIterations where id = :id', {
          id: requestBody.id,
          passwordHash: newPasswordInfo.hash,
          passwordSalt: newPasswordInfo.salt,
          passwordIterations: newPasswordInfo.iterations,
        }
      );
      resultArray.push(resultPass);
    }
    if (requestBody.email && requestBody.fname && requestBody.lname && requestBody.status) {
      const resultUpdate = await global.db.query(`update user
                                            set email  = :email,
                                                fname  = :fname,
                                                lname  = :lname,
                                                phone  = :phone,
                                                status = :status
                                            where id = :id`, {
        id: ctx.params.userId,
        email: requestBody.email,
        fname: requestBody.fname,
        lname: requestBody.lname,
        phone: requestBody.phone,
        status: requestBody.status,
      });
      resultArray.push(resultUpdate);
    }

    ctx.body = retSvc.setReturn(resultArray);
  }

  static async deleteUser(ctx) {
    const result = await global.db.query('update user set status = 0 where id = :id', {
      id: ctx.params.userId,
    });
    ctx.body = result;
  }

  static async getBy(field, value) {
    try {
      const sql = `Select u.*
                     From user u 
                    Where u.${field} = :${field} 
                    Order By u.fname, u.lname`;
      const [users] = await global.db.query(sql, {
        [field]: value
      });

      return users;
    } catch (e) {
      switch (e.code) {
        case 'ER_BAD_FIELD_ERROR':
          throw new ModelError(403, 'Unrecognised User field ' + field);
        default:
          Lib.logException('User.getBy', e);
          throw new ModelError(500, e.message);
      }
    }
  }

  static async addToken(userId, refreshToken) {
    const sql = 'insert into userToken (userId, refreshToken) values (:userId, :refreshToken)';
    const ret = await global.db.query(sql, {
      userId: userId,
      refreshToken: refreshToken,
    });
    return ret;
  }

  static async getByToken(token) {
    const sql = `Select u.*
                 From user u
                 Where u.id in (select userId from userToken where refreshToken = :token)`;
    const [users] = await global.db.query(sql, {
      token: token
    });

    const sql2 = 'delete from userToken where refreshToken = :token'; //This token has been used, remove it.
    const res = await global.db.query(sql2, {
      token: token
    });

    return users;
  }

  static async register(ctx) {

    if (!ctx.request.body.password && !ctx.request.body.email) {
      ctx.request.body = JSON.parse(ctx.request.body);
    }

    let result = [];

    try {
      const newPasswordInfo = await utils.makePWHash(ctx.request.body.password);
      result = await global.db.query(
        `insert into user (fname, lname, email, phone, passwordHash, passwordSalt, passwordIterations, status) 
         values (:fname, :lname, :email, :phone, :passwordHash, :passwordSalt, :passwordIterations, :status)`, {
          fname: ctx.request.body.fname,
          lname: ctx.request.body.lname,
          email: ctx.request.body.email,
          phone: ctx.request.body.phone,
          passwordHash: newPasswordInfo.hash,
          passwordSalt: newPasswordInfo.salt,
          passwordIterations: newPasswordInfo.iterations,
          status: ctx.request.body.status
        }
      );

      ctx.body = retSvc.setReturn(result);

    } catch (e) {
      console.log('error', e);
      throw (e);
    }

  }

  static async sendUserEmail(email, mailOptions) {
    const mail = new MailComposer(mailOptions);

    mail.compile().build((err, message) => {

      const dataToSend = {
        to: email,
        message: message.toString('ascii')
      };

      // mailgun.messages().sendMime(dataToSend, (sendError, body) => {
      //   if (sendError) {
      //     console.log(sendError);
      //     return (sendError);
      //   }
      //   return ('okay');
      // });
    });
  }

}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = User;
