'use strict';

const fs = require('fs');
const path = require('path');

function redact(value) {
  return String(value || '')
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-***')
    .replace(/(api[_-]?key["']?\s*[:=]\s*["']?)[^"',\s]+/gi, '$1***')
    .replace(/(authorization["']?\s*[:=]\s*["']?bearer\s+)[^"',\s]+/gi, '$1***');
}

function writeDiagnosticPackage(outputDir, data) {
  fs.mkdirSync(outputDir, { recursive: true });
  const files = {
    'task.json': JSON.stringify(data.task || {}, null, 2),
    'environment.json': JSON.stringify(data.environment || {}, null, 2),
    'report-structured.json': JSON.stringify(data.structuredReport || {}, null, 2),
    'app.log': redact(data.log || ''),
  };
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(outputDir, name), redact(content), 'utf8');
  }
  return Object.keys(files).map((name) => path.join(outputDir, name));
}

module.exports = {
  redact,
  writeDiagnosticPackage,
};
