const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

const TOKEN_PREFIX = 'DUOLI1';
const APP_SCOPE = 'duoliulanqi';
const LICENSE_FILE = 'license-state.json';
const CLOCK_ROLLBACK_GRACE_MS = 6 * 60 * 60 * 1000;
const PUBLIC_KEY_PATH = path.join(__dirname, 'license-public.pem');

function readPublicKey() {
  return fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
}

function stateFilePath() {
  return path.join(app.getPath('userData'), LICENSE_FILE);
}

function readStateFile() {
  try {
    return JSON.parse(fs.readFileSync(stateFilePath(), 'utf8'));
  } catch (error) {
    return {};
  }
}

function writeStateFile(data) {
  const filePath = stateFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function clearStateFile() {
  try {
    fs.unlinkSync(stateFilePath());
  } catch (error) {
    /* ignore */
  }
}

function decodeBase64Url(input) {
  const normalized = String(input || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, 'base64');
}

function previewToken(token) {
  const text = String(token || '').trim();
  if (text.length < 16) return text;
  return `${text.slice(0, 8)}...${text.slice(-6)}`;
}

function summarizeValidLicense(payload, token) {
  const now = Date.now();
  const permanent = !!payload.permanent;
  const expiresAt = permanent ? null : Number(payload.exp) * 1000;
  const issuedAt = Number(payload.iat || 0) * 1000 || null;
  const customer = String(payload.customer || payload.sub || '').trim();
  return {
    ok: true,
    code: 'ok',
    customer,
    issuedAt,
    expiresAt,
    permanent,
    daysLeft: permanent ? null : Math.max(0, Math.ceil((expiresAt - now) / 86400000)),
    message: permanent ? (customer ? `已永久授权给 ${customer}` : '应用密钥永久有效') : (customer ? `已授权给 ${customer}` : '应用密钥有效'),
    tokenPreview: previewToken(token),
  };
}

function invalidState(code, message, token) {
  return {
    ok: false,
    code,
    message,
    tokenPreview: token ? previewToken(token) : '',
  };
}

function verifyLicenseToken(token, options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const previousSeenAt = Number(options.previousSeenAt || 0);
  const raw = String(token || '').trim();
  if (!raw) return invalidState('missing', '请先输入应用密钥。');

  const parts = raw.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
    return invalidState('format', '应用密钥格式不正确。', raw);
  }

  let payloadBuffer;
  let signatureBuffer;
  let payload;
  try {
    payloadBuffer = decodeBase64Url(parts[1]);
    signatureBuffer = decodeBase64Url(parts[2]);
    payload = JSON.parse(payloadBuffer.toString('utf8'));
  } catch (error) {
    return invalidState('format', '应用密钥内容无法识别。', raw);
  }

  try {
    const verified = crypto.verify(null, payloadBuffer, readPublicKey(), signatureBuffer);
    if (!verified) {
      return invalidState('signature', '应用密钥签名校验失败。', raw);
    }
  } catch (error) {
    return invalidState('signature', '应用密钥签名校验失败。', raw);
  }

  if (String(payload.app || '') !== APP_SCOPE) {
    return invalidState('scope', '应用密钥不属于当前应用。', raw);
  }

  if (!payload.permanent && !Number.isFinite(Number(payload.exp))) {
    return invalidState('payload', '应用密钥缺少有效期。', raw);
  }

  if (Number.isFinite(Number(payload.nbf)) && now < Number(payload.nbf) * 1000) {
    return invalidState('not-ready', '应用密钥还未到生效时间。', raw);
  }

  if (previousSeenAt && now + CLOCK_ROLLBACK_GRACE_MS < previousSeenAt) {
    return invalidState('clock-rollback', '检测到系统时间回拨，请校准时间后重试。', raw);
  }

  if (!payload.permanent && now >= Number(payload.exp) * 1000) {
    return invalidState('expired', '应用密钥已过期，请续费后更换新密钥。', raw);
  }

  return summarizeValidLicense(payload, raw);
}

function getLicenseState() {
  const stored = readStateFile();
  const token = String(stored.token || '').trim();
  if (!token) return invalidState('missing', '请先输入应用密钥。');

  const state = verifyLicenseToken(token, { now: Date.now(), previousSeenAt: stored.lastSeenAt });
  if (!state.ok) return state;

  const nextState = {
    token,
    activatedAt: Number(stored.activatedAt || Date.now()),
    lastSeenAt: Math.max(Date.now(), Number(stored.lastSeenAt || 0)),
  };
  writeStateFile(nextState);
  return {
    ...state,
    activatedAt: nextState.activatedAt,
    lastSeenAt: nextState.lastSeenAt,
  };
}

function activateLicense(token) {
  const cleaned = String(token || '').trim();
  const stored = readStateFile();
  const state = verifyLicenseToken(cleaned, { now: Date.now(), previousSeenAt: stored.lastSeenAt });
  if (!state.ok) return state;

  writeStateFile({
    token: cleaned,
    activatedAt: Date.now(),
    lastSeenAt: Date.now(),
  });
  return getLicenseState();
}

function clearLicense() {
  clearStateFile();
  return invalidState('missing', '应用密钥已清除。');
}

function assertLicenseValid() {
  const state = getLicenseState();
  if (!state.ok) {
    const error = new Error(state.message || 'License invalid.');
    error.code = state.code || 'license-invalid';
    error.licenseState = state;
    throw error;
  }
  return state;
}

module.exports = {
  APP_SCOPE,
  TOKEN_PREFIX,
  getLicenseState,
  activateLicense,
  clearLicense,
  assertLicenseValid,
};
