const Database = require('better-sqlite3');
const db = new Database('./dev.db', { readonly: true });
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
