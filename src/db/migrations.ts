import * as SQLite from 'expo-sqlite';

type Migration = {
  version: number;
  statements: string[];
};

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS customers (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL,
        phone      TEXT    NOT NULL,
        email      TEXT,
        address    TEXT,
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS staff (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL,
        role       TEXT,
        phone      TEXT,
        is_active  INTEGER NOT NULL DEFAULT 1,
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS repairs (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id       INTEGER NOT NULL REFERENCES customers(id),
        assigned_staff_id INTEGER REFERENCES staff(id),
        device_model      TEXT    NOT NULL,
        issue_desc        TEXT    NOT NULL,
        estimated_cost    REAL    NOT NULL DEFAULT 0,
        final_cost        REAL,
        status            TEXT    NOT NULL DEFAULT 'pending',
        notes             TEXT,
        started_at        TEXT,
        completed_at      TEXT,
        delivered_at      TEXT,
        created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS repair_notes (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        repair_id  INTEGER NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
        staff_id   INTEGER REFERENCES staff(id),
        content    TEXT    NOT NULL,
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS parts (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        name                 TEXT    NOT NULL,
        sku                  TEXT,
        quantity             INTEGER NOT NULL DEFAULT 0,
        low_stock_threshold  INTEGER NOT NULL DEFAULT 5,
        cost_price           REAL    NOT NULL DEFAULT 0,
        selling_price        REAL    NOT NULL DEFAULT 0,
        created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at           TEXT    NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS repair_parts (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        repair_id  INTEGER NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
        part_id    INTEGER NOT NULL REFERENCES parts(id),
        quantity   INTEGER NOT NULL DEFAULT 1,
        unit_price REAL    NOT NULL,
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS device_sales (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id  INTEGER NOT NULL REFERENCES customers(id),
        device_name  TEXT    NOT NULL,
        device_model TEXT    NOT NULL,
        imei         TEXT,
        sale_price   REAL    NOT NULL,
        notes        TEXT,
        sold_at      TEXT    NOT NULL DEFAULT (datetime('now')),
        created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS device_purchases (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id    INTEGER NOT NULL REFERENCES customers(id),
        device_name    TEXT    NOT NULL,
        device_model   TEXT    NOT NULL,
        imei           TEXT,
        purchase_price REAL    NOT NULL,
        notes          TEXT,
        purchased_at   TEXT    NOT NULL DEFAULT (datetime('now')),
        created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS invoices (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_no   TEXT    NOT NULL UNIQUE,
        type         TEXT    NOT NULL,
        ref_id       INTEGER NOT NULL,
        customer_id  INTEGER NOT NULL REFERENCES customers(id),
        total_amount REAL    NOT NULL,
        pdf_uri      TEXT,
        shared_at    TEXT,
        created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
      )`,
    ],
  },
];

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )`
  );

  for (const migration of MIGRATIONS) {
    const existing = await db.getFirstAsync<{ version: number }>(
      'SELECT version FROM schema_migrations WHERE version = ?',
      [migration.version]
    );
    if (!existing) {
      await db.withTransactionAsync(async () => {
        for (const sql of migration.statements) {
          await db.execAsync(sql);
        }
        await db.runAsync(
          'INSERT INTO schema_migrations (version) VALUES (?)',
          [migration.version]
        );
      });
    }
  }
}
