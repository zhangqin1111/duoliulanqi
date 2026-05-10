const crypto = require('crypto');
const {
  APP_SCOPE,
  CLOCK_ROLLBACK_GRACE_MS,
  TOKEN_PREFIX,
  verifyLicenseToken,
} = require('../src/electron/license');

function base64Url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createToken(payload, privateKey) {
  const payloadBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = crypto.sign(null, payloadBuffer, privateKey);
  return `${TOKEN_PREFIX}.${base64Url(payloadBuffer)}.${base64Url(signature)}`;
}

function expectCode(name, state, code) {
  if (!state || state.code !== code) {
    throw new Error(`${name}: expected code=${code}, got ${state && state.code}`);
  }
}

function expectOk(name, state) {
  if (!state || !state.ok) {
    throw new Error(`${name}: expected valid license, got ${state && state.code}`);
  }
}

function run() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const now = Date.UTC(2026, 4, 10);
  const issuedAt = Math.floor(now / 1000);
  const validExp = issuedAt + 30 * 86400;

  const validToken = createToken(
    { app: APP_SCOPE, sub: 'commercial-test', customer: '商业验收', iat: issuedAt, exp: validExp },
    privatePem
  );
  expectOk('monthly license', verifyLicenseToken(validToken, { now, publicKey: publicPem }));

  const permanentToken = createToken(
    { app: APP_SCOPE, sub: 'permanent-test', customer: '永久客户', iat: issuedAt, permanent: true },
    privatePem
  );
  const permanentState = verifyLicenseToken(permanentToken, { now, publicKey: publicPem });
  expectOk('permanent license', permanentState);
  if (!permanentState.permanent) throw new Error('permanent license: missing permanent flag');

  const expiredToken = createToken({ app: APP_SCOPE, iat: issuedAt - 86400 * 40, exp: issuedAt - 1 }, privatePem);
  expectCode('expired license', verifyLicenseToken(expiredToken, { now, publicKey: publicPem }), 'expired');

  const wrongScopeToken = createToken({ app: 'other-app', iat: issuedAt, exp: validExp }, privatePem);
  expectCode('wrong scope', verifyLicenseToken(wrongScopeToken, { now, publicKey: publicPem }), 'scope');

  const notReadyToken = createToken({ app: APP_SCOPE, iat: issuedAt, nbf: issuedAt + 3600, exp: validExp }, privatePem);
  expectCode('not ready', verifyLicenseToken(notReadyToken, { now, publicKey: publicPem }), 'not-ready');

  expectCode(
    'clock rollback',
    verifyLicenseToken(validToken, {
      now,
      previousSeenAt: now + CLOCK_ROLLBACK_GRACE_MS + 1000,
      publicKey: publicPem,
    }),
    'clock-rollback'
  );

  const tokenParts = validToken.split('.');
  tokenParts[2] = `${tokenParts[2].startsWith('A') ? 'B' : 'A'}${tokenParts[2].slice(1)}`;
  const tampered = tokenParts.join('.');
  expectCode('tampered signature', verifyLicenseToken(tampered, { now, publicKey: publicPem }), 'signature');
  expectCode('missing token', verifyLicenseToken('', { now, publicKey: publicPem }), 'missing');
  expectCode('bad format', verifyLicenseToken('bad-token', { now, publicKey: publicPem }), 'format');

  console.log('License check passed: monthly, permanent, expired, scope, not-ready, clock rollback, tamper, missing, format');
}

run();
