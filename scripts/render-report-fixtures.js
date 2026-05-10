const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawnSync } = require('child_process');

const electron = require('electron');

if (typeof electron === 'string') {
  const result = spawnSync(electron, [__filename], { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  process.exit(result.status || 0);
}

const { app, BrowserWindow } = electron;
const reportTemplateRegistry = require('../src/electron/report/report-template-registry');
const { repairStructuredReport } = require('../src/electron/report/report-json-repair');
const { createReportFixturePayload, readReportFixtures } = require('./report-fixture-utils');

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.join(repoRoot, 'tmp_pdf_review');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function renderOneAttempt(fixture) {
  const payload = createReportFixturePayload(fixture);
  const repaired = repairStructuredReport(payload);
  const html = reportTemplateRegistry.buildReportHtml(payload, repaired.structured);
  const htmlPath = path.join(outputDir, `${fixture.id}.html`);
  const pdfPath = path.join(outputDir, `${fixture.id}.pdf`);
  fs.writeFileSync(htmlPath, html, 'utf8');

  const win = new BrowserWindow({ show: false, webPreferences: { javascript: false } });
  try {
    await win.loadURL(pathToFileURL(htmlPath).toString());
    await sleep(200);
    const pdf = await win.webContents.printToPDF({
      pageSize: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
      preferCSSPageSize: true,
    });
    fs.writeFileSync(pdfPath, pdf);
    return { id: fixture.id, taskType: fixture.taskType, htmlPath, pdfPath, bytes: pdf.length };
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

async function renderOne(fixture) {
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await renderOneAttempt(fixture);
    } catch (error) {
      lastError = error;
      if (attempt < 2) await sleep(500);
    }
  }
  throw lastError;
}

async function main() {
  await app.whenReady();
  fs.mkdirSync(outputDir, { recursive: true });
  const fixtures = readReportFixtures();
  const manifest = [];
  for (const fixture of fixtures) {
    const result = await renderOne(fixture);
    manifest.push(result);
    console.log(`RENDER ${result.id}: ${result.bytes} bytes`);
  }
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  app.quit();
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  app.exit(1);
});
