const DBBackupService = require('../services/dbBackupService.js');
const Return = require('../services/return');

class DBBackup {
  
  static async startBackup(ctx) {
    // Add random wait time to spread out database queries
    console.log('Starting Backup');
    const results = await DBBackupService.startBackup(ctx);
    console.log("Backup Completed", results.file);

    ctx.body = results;
  }

}

module.exports = DBBackup;
