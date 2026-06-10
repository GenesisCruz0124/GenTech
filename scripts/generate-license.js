#!/usr/bin/env node
/**
 * GenTech License Key Generator — DEVICE BOUND
 * Each key only works on the specific device it was generated for.
 *
 * Usage:
 *   Generate:  node scripts/generate-license.js <DEVICE_ID>
 *   Validate:  node scripts/generate-license.js validate <DEVICE_ID> <KEY>
 *
 * The DEVICE_ID is shown on the License screen inside the app (tap to copy).
 *
 * KEEP THIS FILE PRIVATE — it contains the SECRET salt.
 */

const SECRET = 'GT2025_GENTECH_SEC'; // must match licenseService.ts

function fnv32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function hex4(n) {
  return (n & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

function generateKey(deviceId) {
  const id = deviceId.trim().toUpperCase();
  const p1 = hex4(fnv32(id + SECRET));
  const p2 = hex4(fnv32(SECRET + id));
  const ck = hex4(fnv32(p1 + p2 + SECRET + id)); // device ID baked in
  return `GT-${p1}-${p2}-${ck}`;
}

function validateKey(deviceId, key) {
  const expected = generateKey(deviceId);
  const clean = key.trim().toUpperCase().replace(/[\s-]/g, '');
  const exp   = expected.replace(/[\s-]/g, '');
  return clean === exp;
}

// ── CLI ───────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args[0] === 'validate') {
  const deviceId = args[1];
  const key      = args[2];
  if (!deviceId || !key) {
    console.error('Usage: node generate-license.js validate <DEVICE_ID> <KEY>');
    process.exit(1);
  }
  const ok = validateKey(deviceId, key);
  console.log(ok
    ? `\n✅ VALID — Key "${key}" works on device "${deviceId}"\n`
    : `\n❌ INVALID — Key does not match device "${deviceId}"\n`
  );
  process.exit(ok ? 0 : 1);
}

const deviceId = args[0];
if (!deviceId) {
  console.log('\nUsage:');
  console.log('  Generate : node scripts/generate-license.js <DEVICE_ID>');
  console.log('  Validate : node scripts/generate-license.js validate <DEVICE_ID> <KEY>\n');
  console.log('The DEVICE_ID is shown on the License screen inside the app.\n');
  process.exit(1);
}

const key = generateKey(deviceId);
console.log('\n═══════════════════════════════════════════════');
console.log('  GenTech Pro — Device-Bound License Key');
console.log('═══════════════════════════════════════════════');
console.log(`  Device ID : ${deviceId.toUpperCase()}`);
console.log(`  Key       : ${key}`);
console.log('═══════════════════════════════════════════════');
console.log('  ⚠  This key ONLY works on the device above.');
console.log('     It will be rejected on any other device.');
console.log('═══════════════════════════════════════════════\n');
