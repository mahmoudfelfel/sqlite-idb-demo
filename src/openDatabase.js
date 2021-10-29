import customOpenDatabase from "./customOpenDB"

export function openDatabase(db, name, version, description, size, callback) {
  const openDB = customOpenDatabase(db)
  if (name && typeof name === 'object') {
    // accept SQLite Plugin 1-style object here
    callback = version
    size = name.size
    description = name.description
    version = name.version
    name = name.name
  }
  if (!size) {
    size = 1
  }
  if (!description) {
    description = name
  }
  if (!version) {
    version = '1.0'
  }
  if (typeof name === 'undefined') {
    throw new Error('please be sure to call: openDatabase("myname.db")')
  }
  return openDB(name, version, description, size, callback)
}
