#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKEN_PREFIX = 'DUOLI1';
const APP_SCOPE = 'duoliulanqi';

function getArg(flag, fallback = '') {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return fallback;
  return process.argv[index + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function toBase64Url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function issueToken(privateKey, customer, options = {}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    app: APP_SCOPE,
    customer,
    sub: customer,
    iat: now,
  };
  if (options.permanent) {
    payload.permanent = true;
  } else {
    payload.exp = now + Math.round(Number(options.days) * 86400);
  }
  const payloadBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = crypto.sign(null, payloadBuffer, privateKey);
  return `${TOKEN_PREFIX}.${toBase64Url(payloadBuffer)}.${toBase64Url(signature)}`;
}

const prefix = getArg('--prefix', 'client').trim();
const count = Number(getArg('--count', '5'));
const days = Number(getArg('--days', '30'));
const permanent = hasFlag('--permanent');
const privateKeyPath = path.resolve(process.cwd(), getArg('--private', '.license/duoli-license-private.pem'));

if (!prefix) {
  console.error('Missing --prefix');
  process.exit(1);
}
if (!Number.isFinite(count) || count <= 0) {
  console.error('Invalid --count');
  process.exit(1);
}
if (!permanent && (!Number.isFinite(days) || days <= 0)) {
  console.error('Invalid --days');
  process.exit(1);
}
if (!fs.existsSync(privateKeyPath)) {
  console.error(`Private key not found: ${privateKeyPath}`);
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const rows = [];
for (let i = 1; i <= count; i += 1) {
  const label = `${prefix}-${String(i).padStart(3, '0')}`;
  rows.push({
    customer: label,
    token: issueToken(privateKey, label, { days, permanent }),
  });
}

console.log(JSON.stringify(rows, null, 2));
