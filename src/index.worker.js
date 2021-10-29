import initSqlJs from "@jlongster/sql.js";
import { SQLiteFS } from "absurd-sql";
import IndexedDBBackend from "absurd-sql/dist/indexeddb-backend";
import "regenerator-runtime/runtime";
import "core-js/stable";
import { openDB } from "idb";
import { openDatabase } from "./openDatabase";
import { fakeDBData } from "./fakeData";

async function initSQLite() {
  if(self.__sqlDB) return self.__sqlDB;
  let SQL = await initSqlJs({ locateFile: (file) => file });
  const FS = SQL.FS;
  global.SQL = SQL;
  require("./patchSQLJS");
  let sqlFS = new SQLiteFS(FS, new IndexedDBBackend());
  SQL.register_for_idb(sqlFS);
  SQL.FS.mkdir("/sql");
  SQL.FS.mount(sqlFS, {}, "/sql");

  let db = new SQL.Database("/sql/db.sqlite", { filename: true });
  self.__sqlDB = db;
  db.exec(`
    PRAGMA cache_size=-10000;
    PRAGMA page_size=8192;
    PRAGMA journal_mode=MEMORY;
  `);

  return db;
}

async function initAndRunSQLiteThroughIDBQueries() {
  const db = await initSQLite();
  const Dexie = require("dexie").default;
  // indexeddbshim is an indexeddb shim using WebSQL.
  // Here we shim the browser's idb to use the Fake IDB provided by indexeddbshim.
  // Then instruct indexeddbshim to use the SQLite instance we created.
  // We are creating a custom openDatabase method as WebSQL has one but not SQLite
  global.openDatabase = (...args) => openDatabase(db, ...args);
  require("indexeddbshim");
  global.shimIndexedDB.__useShim();

  // proxy Dexie use the fake idb instead of the browser's one
  Dexie.dependencies.indexedDB = global.shimIndexedDB;

  // clear the table if already exists
  try {
    await Dexie.delete("my_test_db_");
    db.exec(`
      BEGIN TRANSACTION;
      DROP TABLE IF EXISTS S_friends;
      COMMIT;
    `);
  } catch (e) {
    console.log("🚀 ~ file: index.worker.js ~ line 93 ~ init ~ e", e);
  }

  // from this point we can just use Dexie API and it will get proxied to use SQLite

  // create the table
  const dex = new Dexie("my_test_db_");

  performance.mark("idb_via_sql_test_start");
  dex.version(1).stores({
    friends: "name,age",
  });

  // populate the db with the data
  await dex.friends.bulkAdd(fakeDBData);
  // read the data
  const friends = await dex.friends.where("age").above(30).toArray();

  console.log(
    "🚀 ~ file: sql_db.worker.js ~ line 49 ~ initSQLDB ~ friends",
    friends
  );

  performance.mark("idb_via_sql_test_end");
  performance.measure(
    "idb_via_sql_test",
    "idb_via_sql_test_start",
    "idb_via_sql_test_end"
  );
  const duration = performance.getEntriesByName("idb_via_sql_test")[0].duration;
  console.log(
    `%c Dexie API going through SQLite Queries for reading and writing: ${duration}ms`,
    "color: white; font-family:monospace; font-size: 20px"
  );
}

async function initAndRunIDBQueries() {
  const Dexie = require("dexie").default;
  try {
    await Dexie.delete("my_test_db_");
  } catch (e) {
    console.log("🚀 ~ file: index.worker.js ~ line 93 ~ init ~ eee", e);
  }

  const dex = new Dexie("my_test_db_");

  performance.mark("indexedDB_test_start");
  dex.version(1).stores({
    friends: "name,age",
  });

  // populate the db with the data
  await dex.friends.bulkAdd(fakeDBData);

  const friends = await dex.friends.where("age").above(30).toArray();
  console.log(
    "🚀 ~ file: sql_db.worker.js ~ line 49 ~ initSQLDB ~ friends",
    friends
  );
  performance.mark("indexedDB_test_end");
  performance.measure(
    "indexedDB_test",
    "indexedDB_test_start",
    "indexedDB_test_end"
  );
  const duration = performance.getEntriesByName("indexedDB_test")[0].duration;
  console.log(
    `%cPure IDB Dexie Queries for reading and writing: ${duration}ms`,
    "color: white; font-family:monospace; font-size: 20px"
  );
}

async function initAndRunSQLiteQueries() {
  const db = await initSQLite();

  // create the table
  db.exec(`
      BEGIN TRANSACTION;
      DROP TABLE IF EXISTS S_friends;
      CREATE TABLE S_friends (name TEXT, age NUMBER);
      COMMIT;
    `);

  performance.mark("sql_test_start");
  // populate it with some data
  db.exec("BEGIN TRANSACTION");
  let stmt = db.prepare("INSERT INTO S_friends (name, age) VALUES (?, ?)");

  for (let i = 0; i < fakeDBData.length - 1; i++) {
    const obj = fakeDBData[i];
    stmt.run([obj["name"], obj["age"]]);
  }
  db.exec("COMMIT");

  // read the data
  const friends = __sqlDB.exec(`SELECT * FROM S_friends`);
  console.log(
    "🚀 ~ file: sql_db.worker.js ~ line 49 ~ initSQLDB ~ Friends",
    friends[0].values
  );

  performance.mark("sql_test_end");
  performance.measure("sql_test", "sql_test_start", "sql_test_end");
  const duration = performance.getEntriesByName("sql_test")[0].duration;
  console.log(
    `%cPure SQLite Queries for reading and writing: ${duration}ms`,
    "color: white; font-family:monospace; font-size: 20px"
  );
}

async function runQueries() {
  try{
    await initAndRunSQLiteQueries();
    await initAndRunIDBQueries();
    await initAndRunSQLiteThroughIDBQueries();
  } catch(err) {
  console.log("🚀 ~ file: index.worker.js ~ line 170 ~ runQueries ~ err", err)

  }
}

runQueries();
