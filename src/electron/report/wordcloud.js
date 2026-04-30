'use strict';

const { escapeXml, colorAt, pickModelName, chartFrame, emptyChart } = require('./chart-svg');

const STOPWORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '个', '上', '也', '很',
  '到', '说', '要', '去', '你', '会', '着', '看', '好', '这', '那', '它', '他', '她', '们', '之',
  '与', '及', '或', '而', '但', '是', '了', '吧', '呢', '吗', '啊', '哦', '嗯', '哈', '把', '被',
  '让', '使', '对', '于', '以', '从', '为', '由', '及', '即', '乃', '此', '其', '彼', '该', '某',
  '何', '何', '哪', '怎', '咋', '能', '可', '应', '该', '需', '可', '会', '将', '已', '曾', '正',
  '在', '过', '了', '着', '过', '么', '什', '请', '谢', '谢', '感', '希', '望', '一', '二', '三',
  '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', '号', '点', '日', '年', '月', '时',
  '分', '秒', '元', '块', '位', '次', '种', '类', '部', '层', '段', '项', '条', '种',
]);

const STOPGRAMS = new Set([
  '我们', '你们', '他们', '她们', '它们', '自己', '这个', '那个', '这种', '那种', '这些', '那些',
  '一个', '一些', '一种', '一类', '一样', '这样', '那样', '这里', '那里', '怎么', '什么', '为什么',
  '因此', '所以', '但是', '不过', '虽然', '然而', '因而', '从而', '于是', '比如', '例如', '此外',
  '另外', '同时', '一直', '一定', '有的', '有些', '没有', '不能', '不要', '不会', '可以', '应该',
  '需要', '可能', '一般', '通常', '主要', '其实', '其中', '其他', '也是', '就是', '只是', '也许',
  '或许', '可是', '可见', '由此', '至于', '而且', '况且', '或者', '还是', '还有', '已经', '即使',
  '即便', '哪怕', '由于', '关于', '对于', '基于', '通过', '根据', '按照', '依据', '通过', '由此',
  '存在', '具有', '进行', '提供', '进行', '使用', '采用', '采取', '认为', '建议', '指出', '表示',
  '意味', '说明', '展示', '展现', '呈现', '体现', '反映', '突出', '强调', '关注', '考虑', '分析',
  '研究', '发现', '看到', '看出', '看待',
]);

const ALPHA_RE = /[a-zA-Z][a-zA-Z0-9-]+/g;
const HAN_RE = /[一-鿿]+/g;

function tokenize(text) {
  const t = String(text || '').toLowerCase();
  const tokens = [];

  let m;
  while ((m = ALPHA_RE.exec(t)) !== null) {
    if (m[0].length >= 3) tokens.push(m[0]);
  }

  ALPHA_RE.lastIndex = 0;
  while ((m = HAN_RE.exec(t)) !== null) {
    const seg = m[0];
    for (let i = 0; i < seg.length - 1; i++) {
      const bigram = seg.slice(i, i + 2);
      if (STOPGRAMS.has(bigram)) continue;
      if (STOPWORDS.has(bigram[0]) && STOPWORDS.has(bigram[1])) continue;
      tokens.push(bigram);
    }
  }
  HAN_RE.lastIndex = 0;
  return tokens;
}

function mergeOverlappingBigrams(entries) {
  const sorted = entries.slice().sort((a, b) => b[1] - a[1]);
  const kept = [];
  const consumed = new Set();
  for (let i = 0; i < sorted.length; i++) {
    if (consumed.has(i)) continue;
    let [word, count] = sorted[i];
    if (word.length !== 2) {
      kept.push([word, count]);
      continue;
    }
    let extended = word;
    let extendedCount = count;
    let cursor = i;
    let attempts = 0;
    while (attempts < 4) {
      attempts++;
      const lastChar = extended[extended.length - 1];
      let bestIdx = -1;
      let bestCount = -1;
      for (let j = 0; j < sorted.length; j++) {
        if (j === cursor || consumed.has(j)) continue;
        const [w2, c2] = sorted[j];
        if (w2.length !== 2) continue;
        if (w2[0] !== lastChar) continue;
        const ratio = c2 / extendedCount;
        if (ratio < 0.5 || ratio > 1.6) continue;
        if (c2 > bestCount) {
          bestCount = c2;
          bestIdx = j;
        }
      }
      if (bestIdx < 0) break;
      consumed.add(bestIdx);
      const next = sorted[bestIdx][0];
      extended = extended + next[1];
      extendedCount = Math.min(extendedCount, sorted[bestIdx][1]);
      cursor = bestIdx;
    }
    consumed.add(i);
    kept.push([extended, extendedCount]);
  }
  return kept;
}

function topWords(text, k) {
  const counts = new Map();
  const tokens = tokenize(text);
  for (const tok of tokens) {
    counts.set(tok, (counts.get(tok) || 0) + 1);
  }
  const entries = Array.from(counts.entries()).filter(([, n]) => n >= 2);
  const merged = mergeOverlappingBigrams(entries);
  return merged
    .sort((a, b) => b[1] - a[1])
    .slice(0, k);
}

function renderWordcloud(rawReplies) {
  const replies = (Array.isArray(rawReplies) ? rawReplies : []).filter(
    (reply) => reply && String(reply.text || '').trim()
  );
  if (!replies.length) return emptyChart('无原始回复可供风格词云分析。');

  const perModelTop = replies.map((reply, idx) => ({
    name: pickModelName(reply, idx),
    color: colorAt(idx),
    words: topWords(reply.text, 14),
  }));

  if (perModelTop.every((m) => !m.words.length)) {
    return emptyChart('原始回复中未能抽取到足够的有意义词频。');
  }

  const minFont = 12;
  const maxFont = 28;
  const cols = perModelTop
    .map((m) => {
      if (!m.words.length) {
        return `
          <div class="cloud-col">
            <div class="cloud-col__head" style="border-color:${m.color}">
              <span class="cloud-col__dot" style="background:${m.color}"></span>${escapeXml(m.name)}
            </div>
            <div class="cloud-col__empty">未抽取到稳定高频词。</div>
          </div>
        `;
      }
      const maxN = m.words[0][1];
      const minN = m.words[m.words.length - 1][1];
      const span = Math.max(1, maxN - minN);
      const items = m.words
        .map(([word, n]) => {
          const ratio = (n - minN) / span;
          const size = Math.round(minFont + ratio * (maxFont - minFont));
          const opacity = (0.55 + ratio * 0.45).toFixed(2);
          return `<span class="cloud-word" style="font-size:${size}px;color:${m.color};opacity:${opacity}" title="${n}">${escapeXml(word)}</span>`;
        })
        .join(' ');
      return `
        <div class="cloud-col">
          <div class="cloud-col__head" style="border-color:${m.color}">
            <span class="cloud-col__dot" style="background:${m.color}"></span>${escapeXml(m.name)}
          </div>
          <div class="cloud-col__words">${items}</div>
        </div>
      `;
    })
    .join('');

  const body = `<div class="cloud-grid" data-cols="${perModelTop.length}">${cols}</div>`;
  return chartFrame('风格特征词云对比', '从模型原始回答中抽取高频二元词;字号正比频次,颜色对应模型', body);
}

module.exports = {
  renderWordcloud,
  tokenize,
  topWords,
};
