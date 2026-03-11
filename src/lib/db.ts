import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

declare global {
  // eslint-disable-next-line no-var
  var __stonkTrackerDb: Database.Database | undefined;
}

function initDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      name TEXT,
      account_type TEXT NOT NULL,
      quantity REAL NOT NULL CHECK (quantity > 0),
      cost_basis REAL,
      last_price REAL,
      currency TEXT,
      last_price_updated_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS holdings_symbol_idx ON holdings(symbol);
    CREATE INDEX IF NOT EXISTS holdings_account_type_idx ON holdings(account_type);
  `);
}

export function getDb() {
  if (global.__stonkTrackerDb) {
    return global.__stonkTrackerDb;
  }

  const dataDirectory = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDirectory, { recursive: true });

  const db = new Database(path.join(dataDirectory, "stonktracker.sqlite"));
  db.pragma("journal_mode = WAL");
  initDatabase(db);

  global.__stonkTrackerDb = db;
  return db;
}
