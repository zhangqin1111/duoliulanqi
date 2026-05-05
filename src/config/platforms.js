const commonInputSelectors = [
  'textarea[placeholder*="输入"]',
  'textarea[placeholder*="发送"]',
  'textarea[placeholder*="问"]',
  'textarea[placeholder*="message"]',
  '[role="textbox"]',
  'textarea',
  '[contenteditable="true"]',
];

const commonSubmitButtonSelectors = [
  'button[aria-label*="发送"]',
  'button[aria-label*="Send"]',
  'button[type="submit"]',
  '[data-testid*="send"]',
];

const commonResponseSelectors = [
  '[class*="markdown"]',
  '[class*="message"]',
  '[class*="reply"]',
  '[class*="bubble"]',
  '[class*="segment"]',
  '[class*="chat"]',
  'article',
];

function platform(id, name, url, ui = {}, extra = {}) {
  return {
    id,
    name,
    url,
    partition: `persist:duoliulanqi-${id}`,
    submitViaEnter: true,
    preSubmitDelayMs: 300,
    settleMs: 1400,
    inputSelectors: commonInputSelectors,
    submitButtonSelectors: commonSubmitButtonSelectors,
    responseSelectors: commonResponseSelectors,
    defaultMode: 'visible',
    avatar: ui.avatar || name.slice(0, 1).toUpperCase(),
    logoUrl: ui.logoUrl || '',
    accent: ui.accent || '#4d7bff',
    avatarBg: ui.avatarBg || '#eef3ff',
    avatarFg: ui.avatarFg || '#315fcb',
    warnText: ui.warnText || '',
    ...extra,
  };
}

module.exports = [
  platform('kimi', 'Kimi', 'https://kimi.moonshot.cn/', {
    avatar: 'K',
    logoUrl: 'https://www.kimi.com/favicon.ico',
    accent: '#4d7bff',
    avatarBg: '#eef3ff',
    avatarFg: '#3167df',
  }),
  platform('doubao', 'Doubao', 'https://www.doubao.com/', {
    avatar: 'D',
    logoUrl: 'https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/doubao/chat/favicon.png',
    accent: '#ffb04c',
    avatarBg: '#fff3df',
    avatarFg: '#b86c10',
    warnText: 'Doubao may ask for human verification. Complete it in this slot first if needed.',
  }),
  platform('yuanbao', 'Yuanbao', 'https://yuanbao.tencent.com/', {
    avatar: 'Y',
    logoUrl: 'https://static.yuanbao.tencent.com/m/yuanbao-web/favicon_new@32.png',
    accent: '#67c082',
    avatarBg: '#eaf7ef',
    avatarFg: '#2d8a55',
  }),
  platform(
    'wenxin',
    'Wenxin',
    'https://yiyan.baidu.com/',
    {
      avatar: 'W',
      logoUrl: 'https://eb-static.cdn.bcebos.com/logo/favicon.ico',
      accent: '#f66a42',
      avatarBg: '#fff0ea',
      avatarFg: '#d45224',
      warnText: 'Wenxin may require Baidu login before chatting in this slot.',
    },
    {
      defaultMode: 'closed',
      submitViaEnter: false,
      useComposerSubmit: true,
      syncInputAggressive: true,
      minimalSubmitClicks: false,
      preSubmitDelayMs: 900,
      settleMs: 2800,
      inputSelectors: [
        'textarea[placeholder*="输入"]',
        'textarea[placeholder*="问"]',
        'textarea',
        '[role="textbox"]',
        '[contenteditable="true"]',
      ],
      submitButtonSelectors: [
        'button[aria-label*="发送"]',
        'button[aria-label*="send"]',
        'button[type="submit"]',
        '[role="button"][aria-label*="发送"]',
      ],
    }
  ),
  platform(
    'deepseek',
    'DeepSeek',
    'https://chat.deepseek.com/',
    {
      avatar: 'D',
      logoUrl: 'https://www.deepseek.com/favicon.ico',
      accent: '#7a70ff',
      avatarBg: '#f0efff',
      avatarFg: '#5c4fe0',
    },
    { defaultMode: 'closed' }
  ),
];
