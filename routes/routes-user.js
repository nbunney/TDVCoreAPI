/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  User routes                                                                                  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

const sec = require('../services/security');
const router = require('koa-router')(); // router middleware for koa
const user = require('../models/user.js');

router.get('/user', sec.validUser, user.get); // get all users
router.get('/user/getalladmin', sec.validAdmin, user.getAllAdmin); // get all users
router.get('/user/getroles', sec.validAdmin, user.getRoles); // get all user roles

router.delete('/user/:userId', sec.validAdmin, user.deleteUser); // delete a user

router.put('/user/:userId', sec.validUser, user.update); // update a user
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = router.middleware();
