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
const reviewDir = path.join(repoRoot, 'tmp_pdf_review');
const screenshotDir = path.join(reviewDir, 'screenshots');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function captureFixture(fixture) {
  const payload = createReportFixturePayload(fixture);
  const repaired = repairStructuredReport(payload);
  const html = reportTemplateRegistry.buildReportHtml(payload, repaired.structured);
  const htmlPath = path.join(reviewDir, `${fixture.id}.visual.html`);
  const pngPath = path.join(screenshotDir, `${fixture.id}.png`);
  fs.writeFileSync(htmlPath, html, 'utf8');

  const win = new BrowserWindow({
    show: false,
    width: 794,
    height: 1123,
    webPreferences: { javascript: false },
  });
  try {
    await win.loadURL(pathToFileURL(htmlPath).toString());
    await sleep(300);
    const image = await win.capturePage();
    const png = image.toPNG();
    fs.writeFileSync(pngPath, png);
    if (png.length < 20000) {
      throw new Error(`${fixture.id} screenshot is too small: ${png.length}`);
    }
    return { id: fixture.id, taskType: fixture.taskType, pngPath, bytes: png.length };
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

function writeContactSheet(results) {
  const cards = results
    .map((item) => {
      const rel = path.relative(reviewDir, item.pngPath).replace(/\\/g, '/');
      return `
        <article class="card">
          <div class="meta">${escapeHtml(item.id)} · ${escapeHtml(item.taskType)}</div>
          <img src="${escapeHtml(rel)}" alt="${escapeHtml(item.id)}" />
        </article>`;
    })
    .join('\n');
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>滤镜报告视觉回归 Contact Sheet</title>
  <style>
    body { margin: 0; padding: 28px; background: #ebe7e1; font-family: Arial, sans-serif; color: #171717; }
    h1 { margin: 0 0 18px; font-size: 24px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
    .card { background: white; border: 1px solid #ddd7cf; border-radius: 16px; padding: 12px; box-shadow: 0 12px 40px rgba(0,0,0,.08); }
    .meta { margin-bottom: 8px; font-size: 12px; color: #666; }
    img { width: 100%; display: block; border-radius: 10px; border: 1px solid #eee; }
  </style>
</head>
<body>
  <h1>滤镜报告视觉回归 Contact Sheet</h1>
  <section class="grid">${cards}</section>
</body>
</html>`;
  fs.writeFileSync(path.join(reviewDir, 'contact-sheet.html'), html, 'utf8');
}

async function main() {
  await app.whenReady();
  fs.mkdirSync(reviewDir, { recursive: true });
  fs.mkdirSync(screenshotDir, { recursive: true });
  const results = [];
  for (const fixture of readReportFixtures()) {
    const result = await captureFixture(fixture);
    results.push(result);
    console.log(`VISUAL ${result.id}: ${result.bytes} bytes`);
  }
  writeContactSheet(results);
  fs.writeFileSync(path.join(reviewDir, 'visual-manifest.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log(`Visual contact sheet: ${path.join(reviewDir, 'contact-sheet.html')}`);
  app.quit();
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  app.exit(1);
});
