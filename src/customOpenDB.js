'use strict';

var immediate = require('immediate');
var argsarray = require('argsarray');

var WebSQLDatabase = require('./WebSQLDatabase');
var SQLiteDatabase = require('./SQLiteDatabase');

export default function customOpenDatabase(sql) {

  function createDb(dbName, dbVersion) {
    var sqliteDatabase = new SQLiteDatabase(sql);
    return new WebSQLDatabase(dbVersion, sqliteDatabase);
  }

  function openDatabase(args) {

    if (args.length < 4) {
      throw new Error('Failed to execute \'openDatabase\': ' +
        '4 arguments required, but only ' + args.length + ' present');
    }

    var dbName = args[0];
    var dbVersion = args[1];
    // db description and size are ignored
    var callback = args[4];

    var db = createDb(dbName, dbVersion);

    if (typeof callback === 'function') {
      immediate(function () {
        callback(db);
      });
    }

    return db;
  }

  return argsarray(openDatabase);
}
