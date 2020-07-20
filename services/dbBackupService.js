const fs = require('fs');
const mysqldump = require('mysqldump');
const json2csv = require('json2csv').parse;
const AdmZip = require('adm-zip');
const rimraf = require("rimraf");

class DBBackupService {

  /* TODO:
  This has an issue when more than 6 calls are made at once.
  It looks like too many database connections at once.

  TODO:
  Still has issue of not deleting temp folders
  */
  static async startBackup(ctx) {

    const randNum = Math.floor(Math.random() * 10000000);
    // console.log(`Random Number:  ${randNum}`);
    const backupDir = `./databaseBackups`;
    const tempDir = `${backupDir}/dbTemp${randNum}`;
    // console.log(process.env.DB_DATABASE);


    // Create temp dir if not existing
    if (!fs.existsSync(tempDir)) {
      await fs.mkdirSync(tempDir);
    }

    let file = '';
    try {
      // Start sql and csv Backup in parallel
      // wait for the array of results
      const [backDir, csvDir] = await Promise.all([
        this.sqlBackup(tempDir),
        this.startBackupCSV(ctx, tempDir)
      ]);

      console.log("Starting Zip");

      // Zip temp folder
      file = await this.zipStart(backupDir, tempDir, randNum);

      console.log("Starting Delete");

      this.deleteTempDir(tempDir);

    } catch (err) {
      console.error(err);
    }

    console.log("Starting Encoding");


    const encoded = await new Promise((resolve, reject) => {
      fs.readFile(`${process.env.LOCAL_DIR}${file}`, {encoding: 'base64'}, (err, data) => {
        if (err) {
          throw err;
        }
        resolve(data);
      });
    });

    return {name: file, encoded: encoded};

  }

  static async sqlBackup(tempDir) {
    try {
      await mysqldump({
        connection: {
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_DATABASE
        },
        dump: {
          data: {
            maxRowsPerInsertStatement: 999
          }
        },
        dumpToFile: `${tempDir}/dump.sql`
      });

      return 'sql backup done';
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }

  }

  static async startBackupCSV(ctx, tempDir) {
    try {
      const tableNames = await this.getTableNames(ctx);
      // .then(() => {
      //   const tableNames = tableNames;
      //   console.log("getTableNames done successfully!");
      //   }).catch(function(err){
      //       console.log(err.toString());
      //   });

      // console.log(tableNames);

      // .map starts all in parallel
      // for loops execute sequentially
      console.time('the time');
      await Promise.all(
        tableNames.map(async (table, index) => {
          const tableName = table.table_name;
          // console.log(`15  `, tableName);
          const data = await this.getData(ctx, tableName);
          await this.csvBackup(data, tempDir, tableName);
        }), {concurrency: 2}
      );
      console.timeEnd('the time');

      // for (const table of tableNames) {
      //   const tableName = table.table_name;
      //   // console.log(`15  `, tableName);
      //   const data = await this.getData(ctx, tableName);
      //   await this.csvBackup(data, tempDir, tableName);
      // }
      return `table names ${tableNames}`;
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }

  static async getTableNames(ctx) {
    try {
      const [tableNames] = await ctx.state.db.query(/*sql*/`SELECT table_name 
                                                            FROM INFORMATION_SCHEMA.TABLES 
                                                            WHERE TABLE_TYPE = 'BASE TABLE' 
                                                            AND TABLE_SCHEMA='${process.env.DB_DATABASE}'`);
      // console.log(tableNames);
      return tableNames;
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }

  }

  static async getData(ctx, tableName) {
    try {
      // console.log(`Table Name:  `, tableName);
      const [data] = await ctx.state.db.query(/*sql*/`SELECT * FROM ${tableName};`);
      return data;
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }

  }

  static async csvBackup(data, tempDir, tableName) {

    // const fields = ['field1', 'field2', 'field3'];
    // const opts = { fields };

    try {
      const csv = await json2csv(data);
      // console.log(csv);
      await this.csvWrite(csv, tempDir, tableName);
    } catch (err) {
      // Logs error when table is empty
      // console.error(err);
    }

    return 'csv backup done';
  }

  static async csvWrite(csvData, tempDir, fileName) {

    if (!fileName) fileName = "dumpDefault";

    fs.writeFile(`${tempDir}/${fileName}.csv`, csvData, function (err) {
      if (err) {
        return console.log(err);
      }
      return true;
      // console.log("csv file was saved!");
    });

    return 'csv write done';
  }

  static async zipStart(backupDir, tempDir, randNum) {
    // creating archives
    const zip = new AdmZip();

    // add file directly
    // const content = "inner content of the file";
    // zip.addFile("test.txt", Buffer.alloc(content.length, content), "entry comment goes here");
    // add local file
    // zip.addLocalFile("./databaseBackups/databaseTemp/dump.sql");
    zip.addLocalFolder(tempDir);
    // get everything as a buffer
    // const willSendthis = zip.toBuffer();
    // or write everything to disk
    const date = new Date();
    const file_name = `${backupDir}/databaseBackup ${date} ${randNum}.zip`;
    await zip.writeZip(file_name /*target file name*/);

    return file_name;
  }

  static async deleteTempDir(tempDir) {
    // Delete temp files
    setTimeout(() => {
      rimraf(`${tempDir}`, () => {
        console.log("deleted temp folder");
      });
    }, 100000);
  }

}

module.exports = DBBackupService;
