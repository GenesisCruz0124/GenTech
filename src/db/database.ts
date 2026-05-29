import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function initDB(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync('gentech.db');
  await database.execAsync('PRAGMA foreign_keys = ON');
  await database.execAsync('PRAGMA journal_mode = WAL');
  await runMigrations(database);
  db = database;
  return database;
}

export function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) return Promise.resolve(db);
  if (!initPromise) {
    initPromise = initDB().catch(err => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}
