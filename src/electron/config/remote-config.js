'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  version: 1,
  modelList: ['qwen', 'deepseek', 'openai', 'claude'],
  promptVersion: 'local-default',
  routingVersion: 'local-default',
  reportTemplateFlags: {
    factTemplate: true,
    scenarioProfiles: true,
  },
  highRiskRules: {
    enabled: true,
  },
};

function loadRemoteConfig(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return { ...DEFAULT_CONFIG };
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      reportTemplateFlags: {
        ...DEFAULT_CONFIG.reportTemplateFlags,
        ...(parsed.reportTemplateFlags || {}),
      },
      highRiskRules: {
        ...DEFAULT_CONFIG.highRiskRules,
        ...(parsed.highRiskRules || {}),
      },
    };
  } catch (error) {
    return { ...DEFAULT_CONFIG, loadError: error.message || String(error) };
  }
}

function configPathFor(userDataPath) {
  return path.join(userDataPath, 'remote-config.json');
}

module.exports = {
  DEFAULT_CONFIG,
  configPathFor,
  loadRemoteConfig,
};
