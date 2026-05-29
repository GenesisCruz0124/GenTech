# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (scan QR with Expo Go on phone)
npx expo start --go

# Install dependencies after pulling changes
npm install --legacy-peer-deps

# Check / fix package versions for the current Expo SDK
npx expo install --check
npx expo install --fix -- --legacy-peer-deps

# Build a shareable APK
eas build --platform android --profile preview
```

> **No test runner or linter is configured.** TypeScript type-checking is the only static analysis available (`tsc --noEmit`).

## Architecture

**Runtime:** Expo SDK 54 · React Native 0.81.5 · React 19 · TypeScript  
**Data:** `expo-sqlite` v16, local-only, no network required  
**UI:** React Native Paper (Material Design 3)  
**State:** Zustand stores — one per domain  
**Forms:** react-hook-form + zod  
**Navigation:** React Navigation v6 — root NativeStack wrapping a BottomTab

### Layer order (top → bottom)

```
Screen → useXxxStore() → xxxRepository.ts → getDB() → gentech.db
```

- **Screens** call store hooks only — never import repositories directly.
- **Stores** (`src/store/`) call repository functions and hold the in-memory list + loading state.
- **Repositories** (`src/repositories/`) contain all raw SQL. Each file exports typed async functions; no SQL appears outside this layer.
- **`getDB()`** (`src/db/database.ts`) is a promise-guarded singleton — safe for concurrent calls at app startup. Opening the DB also runs `runMigrations()`.
- **Migrations** (`src/db/migrations.ts`) are versioned. Each `CREATE TABLE` is a separate `execAsync` call (multi-statement strings cause `NullPointerException` on Android). New tables go in a new migration version.

### Navigation structure

```
RootNavigator (NativeStack)
└── MainTabs (BottomTab)
    ├── Dashboard
    ├── Repairs
    ├── Parts Stock
    ├── Devices
    └── More  ← links to CustomerList, StaffList, StaffPerformance, InvoiceHistory
```

Stack screens pushed over tabs: `NewRepair`, `RepairDetail`, `PartForm`, `DeviceSaleForm`, `DevicePurchaseForm`, `CustomerList`, `CustomerDetail`, `InvoicePreview`, `InvoiceHistory`, `StaffList`, `StaffPerformance`.

### Invoice PDF flow

```
RepairDetail / DeviceSaleDetail
  → InvoicePreviewScreen
      → buildInvoiceHtml()          (src/utils/invoiceHtmlTemplate.ts)
      → generateInvoicePDF()        (src/services/pdfService.ts — expo-print)
      → persist to documentDirectory/invoices/<invoice_no>.pdf
      → shareInvoicePDF()           (src/services/shareService.ts — expo-sharing)
      → OS share sheet → WhatsApp
```

`expo-file-system` must be imported from `expo-file-system/legacy` (the new `File`/`Directory` API is available but not yet used here).

### Database schema (9 tables)

`customers`, `staff`, `repairs`, `repair_notes`, `parts`, `repair_parts`, `device_sales`, `device_purchases`, `invoices` + `schema_migrations`.

Foreign keys are enforced (`PRAGMA foreign_keys = ON`). WAL mode is enabled for concurrent read performance. Repair status flows: `pending → in_progress → ready → delivered`.

### Key constants

- `src/constants/colors.ts` — single source of truth for all colours including per-status colours.
- `src/constants/statusOptions.ts` — `RepairStatus` type, `STATUS_LABELS`, `STATUS_NEXT` (next status in flow), `STATUS_COLORS`.
- Currency is formatted as Philippine Peso (₱) in `src/utils/formatters.ts`.
