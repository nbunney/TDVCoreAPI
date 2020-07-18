const router = require('koa-router')(); // router middleware for koa
const DBBackup = require('../models/dbBackup');

router.get('/startbackup', DBBackup.startBackup); // Starts the Database Backup


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = router.middleware();
