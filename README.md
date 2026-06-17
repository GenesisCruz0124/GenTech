# GenTech — Mobile Repair Shop Management

A local-first, offline Android app for running a phone/device repair shop — repairs, parts inventory, customers, staff, suppliers, and invoicing, all in one place.

## Overview

GenTech is built with Expo and React Native and stores everything in a local SQLite database — no server, no network dependency, no recurring costs. It covers the full repair lifecycle (pending → in progress → ready → delivered), tracks parts stock and restocking costs, manages customer and staff records, and generates shareable PDF invoices.

## Features

- **Repairs** — log new repairs, track status through the full lifecycle, attach notes/photos, record payments, warranty tracking
- **Parts Inventory** — stock levels with low-stock alerts, single and bulk restocking, cost/selling price tracking, price quotations
- **Devices** — record device sales and purchases tied to customers
- **Customers** — contact directory with full repair/transaction history per customer
- **Staff** — staff directory with performance metrics (repairs completed, revenue generated)
- **Suppliers** — supplier directory, price inquiries, Shopee price search integration
- **Invoices** — PDF invoice generation and one-tap sharing via WhatsApp
- **Reports & Dashboard** — gross income, expenses, net income, daily repair stats, with drill-down into expense detail
- **Backup & Restore** — export/import the local database

## Tech Stack

| Layer        | Technology                                  |
|--------------|----------------------------------------------|
| Runtime      | Expo SDK 54 · React Native 0.81.5 · React 19 · TypeScript |
| Database     | expo-sqlite (local-only, no network required) |
| UI           | React Native Paper (Material Design 3)       |
| State        | Zustand (one store per domain)                |
| Forms        | react-hook-form + zod                         |
| Navigation   | React Navigation v6 (NativeStack + BottomTab) |

## Getting Started

Requires Node.js LTS and the Expo Go app on an Android phone for development.

```bash
npm install --legacy-peer-deps
npx expo start --go
```

See **[SETUP.md](./SETUP.md)** for full first-time setup, building a shareable APK, and common how-tos (adding staff, creating invoices, etc).

## Project Structure

```
src/
├── screens/        Screens, organized by domain (repairs, parts, devices, customers, staff, suppliers, invoices, reports, more...)
├── store/           Zustand stores — one per domain
├── repositories/    All raw SQL lives here; one typed async function per query
├── db/              SQLite singleton + versioned migrations
├── navigation/       Root stack + bottom tab navigator
├── services/         PDF generation, WhatsApp sharing
└── utils/             Formatters, invoice HTML template
```

Screens call store hooks only; stores call repositories; repositories hold all SQL. See **[CLAUDE.md](./CLAUDE.md)** for the full architectural breakdown.

## Database

Local SQLite database with versioned migrations (`src/db/migrations.ts`), covering repairs, parts/inventory, devices, customers, staff, invoices, and lookup data (brands, models, categories, issues). Foreign keys and WAL mode are enabled. See `CLAUDE.md` for the complete schema.

## Building an APK

```bash
eas build --platform android --profile preview
```

See [SETUP.md](./SETUP.md#building-an-apk-to-share--install-directly) for the full walkthrough.
