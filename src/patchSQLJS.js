"use strict";

var lib = global.SQL;

lib._Database = global.SQL.Database;
lib.Database = class Database extends (
  lib._Database
) {
//   constructor(filename, mode, cb) {
//     super();
//     cb && queueMicrotask(cb);
//   }

  //I'm not 100% sure what this was supposed to do on node-sqlite3, heh.
//   serialize(cb) {
//     cb && queueMicrotask(cb);
//   }

  run(sql, params, cb) {
    super.run(sql, params);
    var ctx = {};
    if (sql.toLowerCase().indexOf("insert") !== -1) {
      var rez = this.exec("select last_insert_rowid();");
      ctx.lastID = rez[0].values[0][0];
    }
    if (cb) {
      queueMicrotask(cb.bind(ctx));
    }
    return this;
  }

  all(sql, params, cb) {
    var result = [];
    this.each(
      sql,
      params,
      function (r) {
        result.push(r);
      },
      function () {
        cb(null, result);
      }
    );
    return this;
  }

//   close() {}
};
