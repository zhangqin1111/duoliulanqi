'use strict';

const fs = require('fs');
const path = require('path');

function createReportHistoryStore(filePath) {
  function read() {
    if (!fs.existsSync(filePath)) return [];
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function write(items) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
  }

  function add(item) {
    const items = read();
    const next = {
      id: item.id || `report_${Date.now()}`,
      question: item.question || '',
      taskType: item.taskType || 'general_compare',
      createdAt: item.createdAt || new Date().toISOString(),
      models: Array.isArray(item.models) ? item.models : [],
      reportPath: item.reportPath || '',
      structuredPath: item.structuredPath || '',
      status: item.status || 'draft',
      note: item.note || '',
    };
    write([next, ...items.filter((old) => old.id !== next.id)].slice(0, 200));
    return next;
  }

  function list() {
    return read();
  }

  function remove(id) {
    const before = read();
    const after = before.filter((item) => item.id !== id);
    write(after);
    return before.length !== after.length;
  }

  return { add, list, remove };
}

module.exports = {
  createReportHistoryStore,
};
