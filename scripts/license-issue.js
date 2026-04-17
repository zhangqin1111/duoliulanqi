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

function toBase64Url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const customer = getArg('--customer', '').trim();
const isPermanent = hasFlag('--permanent');
const days = Number(getArg('--days', '30'));
const privateKeyPath = path.resolve(process.cwd(), getArg('--private', '.license/duoli-license-private.pem'));

if (!customer) {
  console.error('Missing --customer');
  process.exit(1);
}

if (!isPermanent && (!Number.isFinite(days) || days <= 0)) {
  console.error('Invalid --days');
  process.exit(1);
}

if (!fs.existsSync(privateKeyPath)) {
  console.error(`Private key not found: ${privateKeyPath}`);
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const payload = {
  app: APP_SCOPE,
  customer,
  sub: customer,
  iat: now,
};

if (isPermanent) {
  payload.permanent = true;
} else {
  payload.exp = now + Math.round(days * 86400);
}

const payloadBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const signature = crypto.sign(null, payloadBuffer, privateKey);
const token = `${TOKEN_PREFIX}.${toBase64Url(payloadBuffer)}.${toBase64Url(signature)}`;

console.log(token);
