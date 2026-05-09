const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const reviewDir = path.join(repoRoot, 'tmp_pdf_review');
const manifestPath = path.join(reviewDir, 'manifest.json');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function main() {
  if (!fs.existsSync(manifestPath)) {
    fail('Missing tmp_pdf_review/manifest.json. Run npm run render:report-fixtures first.');
    return;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(manifest) || manifest.length < 6) {
    fail('Expected at least 6 rendered report fixtures.');
    return;
  }

  for (const item of manifest) {
    const html = fs.existsSync(item.htmlPath) ? fs.readFileSync(item.htmlPath, 'utf8') : '';
    const pdfExists = fs.existsSync(item.pdfPath);
    const pdfSize = pdfExists ? fs.statSync(item.pdfPath).size : 0;
    const problems = [];
    if (!html) problems.push('missing html');
    if (!pdfExists) problems.push('missing pdf');
    if (pdfSize < 20000) problems.push(`pdf too small: ${pdfSize}`);
    if (/undefined|null|\[object Object\]/i.test(html)) problems.push('html contains undefined/null/object placeholder');
    if (!/EXECUTIVE WAR ROOM/.test(html)) problems.push('missing executive page marker');
    if (!/Evidence|璇佹嵁|证据/.test(html)) problems.push('missing evidence marker');
    if (problems.length) {
      fail(`LAYOUT ${item.id}: ${problems.join(', ')}`);
    } else {
      console.log(`LAYOUT ${item.id}: ok size=${pdfSize}`);
    }
  }

  if (!process.exitCode) {
    console.log(`Report layout check passed: ${manifest.length} fixtures`);
  }
}

main();
