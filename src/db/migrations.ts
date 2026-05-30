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
        low_stock_threshold  INTEGER NOT NULL DEFAULT 2,
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
  {
    version: 2,
    statements: [
      `ALTER TABLE repairs ADD COLUMN is_paid INTEGER NOT NULL DEFAULT 1`,
    ],
  },
  {
    version: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS parts_purchases (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        part_id       INTEGER NOT NULL REFERENCES parts(id),
        quantity      INTEGER NOT NULL,
        cost_price    REAL    NOT NULL,
        supplier_name TEXT,
        notes         TEXT,
        image_uri     TEXT,
        purchased_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
      )`,
      `ALTER TABLE repairs ADD COLUMN image_uri TEXT`,
      `ALTER TABLE device_purchases ADD COLUMN image_uri TEXT`,
    ],
  },
  {
    version: 4,
    statements: [
      `ALTER TABLE parts_purchases ADD COLUMN supplier_name TEXT`,
    ],
  },
  {
    version: 5,
    statements: [
      `CREATE TABLE IF NOT EXISTS categories (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL UNIQUE,
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      )`,
      `ALTER TABLE parts ADD COLUMN category_id INTEGER REFERENCES categories(id)`,
      `INSERT OR IGNORE INTO categories (name) VALUES ('Display')`,
      `INSERT OR IGNORE INTO categories (name) VALUES ('Battery')`,
      `INSERT OR IGNORE INTO categories (name) VALUES ('Button')`,
      `INSERT OR IGNORE INTO categories (name) VALUES ('Back Glass')`,
    ],
  },
  {
    version: 6,
    statements: [
      `CREATE TABLE IF NOT EXISTS device_brands (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL UNIQUE,
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      )`,
      `ALTER TABLE parts ADD COLUMN brand_id INTEGER REFERENCES device_brands(id)`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Apple')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Huawei')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Infinix')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Oppo')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Poco')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Realme')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Redmi')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Samsung')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Sony')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Vivo')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Xiaomi')`,
    ],
  },
  {
    version: 7,
    statements: [
      `CREATE TABLE IF NOT EXISTS issues (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL UNIQUE,
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      )`,
      `INSERT OR IGNORE INTO issues (name) VALUES ('Battery Replace')`,
      `INSERT OR IGNORE INTO issues (name) VALUES ('Camera Repair')`,
      `INSERT OR IGNORE INTO issues (name) VALUES ('Charging Port Replace')`,
      `INSERT OR IGNORE INTO issues (name) VALUES ('Motherboard Repair')`,
      `INSERT OR IGNORE INTO issues (name) VALUES ('Other')`,
      `INSERT OR IGNORE INTO issues (name) VALUES ('Power Button Repair')`,
      `INSERT OR IGNORE INTO issues (name) VALUES ('Screen Replace')`,
      `INSERT OR IGNORE INTO issues (name) VALUES ('Software Issues')`,
      `INSERT OR IGNORE INTO issues (name) VALUES ('Speaker Replace')`,
      `INSERT OR IGNORE INTO issues (name) VALUES ('Volume Button Repair')`,
      `INSERT OR IGNORE INTO issues (name) VALUES ('Water Damage Repair')`,
    ],
  },
  {
    version: 8,
    statements: [
      `CREATE TABLE IF NOT EXISTS repair_payments (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        repair_id    INTEGER NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
        amount       REAL    NOT NULL,
        payment_date TEXT    NOT NULL DEFAULT (datetime('now')),
        notes        TEXT,
        created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
      )`,
    ],
  },
  {
    version: 9,
    statements: [
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Apple')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Huawei')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Infinix')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Oppo')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Poco')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Realme')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Redmi')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Samsung')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Sony')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Vivo')`,
      `INSERT OR IGNORE INTO device_brands (name) VALUES ('Xiaomi')`,
    ],
  },
  {
    version: 10,
    statements: [
      `CREATE TABLE IF NOT EXISTS repair_images (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        repair_id  INTEGER NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
        image_uri  TEXT    NOT NULL,
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      )`,
    ],
  },
  {
    version: 11,
    statements: [
      `CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT
      )`,
    ],
  },
  {
    version: 12,
    statements: [
      `ALTER TABLE customers ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0`,
    ],
  },
  {
    version: 13,
    statements: [
      `ALTER TABLE repair_payments ADD COLUMN payment_mode TEXT`,
      `ALTER TABLE repair_payments ADD COLUMN image_uri TEXT`,
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
          try {
            await db.execAsync(sql);
          } catch (e: any) {
            // Ignore "duplicate column name" — happens when a column was already
            // added in a prior CREATE TABLE but an ALTER TABLE also tries to add it.
            if (e?.message?.toLowerCase().includes('duplicate column')) continue;
            throw e;
          }
        }
        await db.runAsync(
          'INSERT INTO schema_migrations (version) VALUES (?)',
          [migration.version]
        );
      });
    }
  }
}
