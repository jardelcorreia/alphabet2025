import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import path from 'path';
import { DatabaseSchema } from './schema.js';

const dbPath = path.join(process.env.DATA_DIRECTORY || './data', 'database.sqlite');
console.log('Database path:', dbPath);

const sqliteDb = new Database(dbPath);

export const db = new Kysely<DatabaseSchema>({
  dialect: new SqliteDialect({
    database: sqliteDb,
  }),
  log: ['query', 'error']
});

// Enable foreign key constraints
sqliteDb.pragma('foreign_keys = ON');

console.log('Database connection established');
