'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { repairStructuredReport } = require('../report/report-json-repair');
const { applyHighRiskPolicy } = require('../report/high-risk-report-policy');
const { bindEvidenceToReport } = require('../evidence/evidence-claim-linker');
const { enrichReportOutcome } = require('../report/report-outcome-enricher');
const { applyReportQualityGate } = require('../report/report-quality-gate');

const REPORT_BASENAME = '滤镜·多源大模型内容对比分析';

function extractStructuredJson(summaryText) {
  const text = String(summaryText || '');
  if (!text) return null;
  const re = /```json\s*([\s\S]*?)```/gi;
  let last = null;
  let match;
  while ((match = re.exec(text)) !== null) {
    last = match[1];
  }
  if (!last) {
    const start = text.lastIndexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) last = text.slice(start, end + 1);
  }
  if (!last) return null;
  try {
    const parsed = JSON.parse(last.trim());
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    try {
      const cleaned = last
        .trim()
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/(['"])\s*\n\s*\+\s*['"]/g, '');
      return JSON.parse(cleaned);
    } catch (fallbackError) {
      return null;
    }
  }
}

function jsonPathForPdf(filePath) {
  return /\.pdf$/i.test(filePath) ? filePath.replace(/\.pdf$/i, '.json') : `${filePath}.json`;
}

function writeStructuredSidecar(filePath, payload, structured, repaired) {
  const structuredPath = jsonPathForPdf(filePath);
  fs.writeFileSync(
    structuredPath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        question: payload.question || '',
        taskRoute: payload.taskRoute || null,
        analysisSession: payload.analysisSession || null,
        structuredReport: structured,
        repairWarnings: repaired.warnings || [],
      },
      null,
      2
    ),
    'utf8'
  );
  return structuredPath;
}

function prepareStructuredReport(payload = {}) {
  const repaired = repairStructuredReport(payload);
  const structuredWithPolicy = applyHighRiskPolicy(
    repaired.structured,
    payload && payload.analysisSession ? payload.analysisSession.highRisk : null
  );
  const structured = applyReportQualityGate(
    enrichReportOutcome(
      bindEvidenceToReport(structuredWithPolicy, payload && payload.analysisSession ? payload.analysisSession.evidencePack : null)
    ),
    { analysisSession: payload && payload.analysisSession ? payload.analysisSession : null }
  );
  return { repaired, structured };
}

function registerPdfExportIpc({ ipcMain, app, BrowserWindow, dialog, getMainWindow, assertLicenseValid, reportTemplateRegistry }) {
  ipcMain.handle('duoli:render-report-html', async (_event, payload = {}) => {
    assertLicenseValid();
    const summaryText = String(payload && payload.summaryText ? payload.summaryText : '').trim();
    const rawReplies = Array.isArray(payload && payload.rawReplies) ? payload.rawReplies : [];
    const hasRawReply = rawReplies.some((reply) => String(reply && reply.text ? reply.text : '').trim());
    if (!summaryText && !hasRawReply) return { ok: false, error: 'Nothing to render.' };

    const { structured } = prepareStructuredReport(payload);
    return {
      ok: true,
      html: reportTemplateRegistry.buildReportHtml(payload, structured),
      structured,
    };
  });

  ipcMain.handle('duoli:export-pdf', async (_event, payload = {}) => {
    assertLicenseValid();
    const summaryText = String(payload && payload.summaryText ? payload.summaryText : '').trim();
    const rawReplies = Array.isArray(payload && payload.rawReplies) ? payload.rawReplies : [];
    const hasRawReply = rawReplies.some((reply) => String(reply && reply.text ? reply.text : '').trim());
    if (!summaryText && !hasRawReply) return { ok: false, error: 'Nothing to export.' };

    const { filePath, canceled } = await dialog.showSaveDialog(getMainWindow(), {
      title: `保存${REPORT_BASENAME}`,
      defaultPath: path.join(app.getPath('documents'), `${REPORT_BASENAME}-${new Date().toISOString().slice(0, 10)}.pdf`),
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    });
    if (canceled || !filePath) return { ok: false, error: 'canceled' };

    const { repaired, structured } = prepareStructuredReport(payload);
    const html = reportTemplateRegistry.buildReportHtml(payload, structured);
    const tmpHtml = path.join(os.tmpdir(), `duoli_pdf_${Date.now()}.html`);
    fs.writeFileSync(tmpHtml, html, 'utf8');

    const win = new BrowserWindow({ show: false, webPreferences: { javascript: false } });
    await win.loadFile(tmpHtml);
    try {
      const pdfBuf = await win.webContents.printToPDF({
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        printBackground: true,
        preferCSSPageSize: true,
      });
      fs.writeFileSync(filePath, pdfBuf);
      const structuredPath = writeStructuredSidecar(filePath, payload, structured, repaired);
      return { ok: true, filePath, structuredPath };
    } finally {
      win.destroy();
      try {
        fs.unlinkSync(tmpHtml);
      } catch (error) {
        /* ignore */
      }
    }
  });
}

module.exports = {
  extractStructuredJson,
  prepareStructuredReport,
  registerPdfExportIpc,
};
