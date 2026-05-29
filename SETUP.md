# GenTech Repair Shop — Setup Instructions

## Prerequisites

1. **Install Node.js LTS (v20+)**
   - Download from: https://nodejs.org
   - After install, restart VS Code / terminal
   - Verify: `node --version` and `npm --version`

2. **Install Expo CLI**
   ```
   npm install -g expo-cli eas-cli
   ```

3. **Install Expo Go on your Android phone**
   - Search "Expo Go" on Google Play Store

---

## First-Time Setup

Open a terminal in `C:\Users\Genesis\Desktop\GenTech` and run:

```bash
npm install
```

This installs all dependencies listed in `package.json`.

---

## Running the App

```bash
npx expo start
```

- Scan the QR code with **Expo Go** on your phone
- The app will load on your device
- Changes auto-reload as you edit files

---

## Building an APK (to share / install directly)

1. Create an Expo account at https://expo.dev
2. Login: `eas login`
3. Configure: `eas build:configure`
4. Build APK:
   ```bash
   eas build --platform android --profile preview
   ```
5. Download the `.apk` file and install on your phone

---

## File Structure Quick Reference

```
src/
├── constants/     Colors, theme, status labels
├── db/            SQLite setup & all table migrations
├── repositories/  All database query functions (CRUD)
├── store/         Zustand state stores
├── navigation/    Screen routing & tab navigator
├── screens/       All app screens
│   ├── dashboard/     Home screen with stats & quick actions
│   ├── repairs/       New repair, repair list, repair detail
│   ├── parts/         Parts inventory list & add/edit form
│   ├── devices/       Device sales & purchases
│   ├── customers/     Customer list & history
│   ├── invoices/      Invoice preview & history
│   ├── staff/         Staff list & performance
│   └── more/          Navigation menu
├── components/    Reusable UI pieces
├── services/      PDF generation & WhatsApp sharing
└── utils/         Currency/date formatters, invoice HTML
```

---

## Adding a New Staff Member

Go to **More → Staff → tap +**

## Creating an Invoice

1. Open any repair → scroll down → tap **Create Invoice**
2. Review the invoice preview
3. Tap **Generate PDF Invoice**
4. Tap **Share via WhatsApp** — the OS share sheet opens; select WhatsApp
