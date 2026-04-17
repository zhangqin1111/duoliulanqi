#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { generateKeyPairSync } = require('crypto');

const projectRoot = process.cwd();
const privateOut = path.resolve(projectRoot, '.license', 'duoli-license-private.pem');
const publicOut = path.resolve(projectRoot, 'src', 'electron', 'license-public.pem');

fs.mkdirSync(path.dirname(privateOut), { recursive: true });
fs.mkdirSync(path.dirname(publicOut), { recursive: true });

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
fs.writeFileSync(publicOut, publicKey.export({ type: 'spki', format: 'pem' }), 'utf8');
fs.writeFileSync(privateOut, privateKey.export({ type: 'pkcs8', format: 'pem' }), 'utf8');

console.log(`Public key written to: ${publicOut}`);
console.log(`Private key written to: ${privateOut}`);
console.log('Keep the private key secret. Do not commit it.');
