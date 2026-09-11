#!/usr/bin/env node
/**
 * scripts/stats.mjs — считает статистику контента игры по index.html.
 * Используется в scripts/check.mjs и для цифр в README.
 *
 * Идея: вытаскивает все инлайновые <script> из index.html, выполняет их в
 * «песочнице» Node (vm) с заглушками document/window, и читает глобальные
 * структуры данных (базы заданий, конфиг уровней, словари конспектов).
 *
 * Запуск:  node scripts/stats.mjs [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = path.join(ROOT, 'index.html');

const noop = () => {};
const ctx2d = new Proxy({}, { get: () => noop });

function makeEl() {
  const el = {
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    style: {},
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    width: 800,
    height: 600,
    scrollTop: 0,
    scrollHeight: 0,
    appendChild: noop,
    removeChild: noop,
    remove: noop,
    click: noop,
    focus: noop,
    blur: noop,
    setAttribute: noop,
    getAttribute: () => null,
    addEventListener: noop,
    removeEventListener: noop,
    querySelector: () => null,
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    getContext: () => ctx2d,
    insertAdjacentHTML: noop,
    closest: () => null,
  };
  return el;
}

const doc = new Proxy(
  {
    getElementById: () => makeEl(),
    querySelector: () => makeEl(),
    querySelectorAll: () => [],
    createElement: () => makeEl(),
    createTextNode: () => makeEl(),
    addEventListener: noop,
    body: makeEl(),
    head: makeEl(),
    documentElement: makeEl(),
    title: '',
  },
  { get: (t, k) => (k in t ? t[k] : undefined) },
);

const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};

const sandbox = {
  console: { log: noop, warn: noop, error: noop, info: noop },
  document: doc,
  localStorage,
  navigator: { userAgent: 'node-stats', language: 'ru', vibrate: noop, share: undefined },
  location: { href: 'http://localhost/', origin: 'http://localhost', hash: '' },
  alert: noop,
  open: () => null,
  atob: (s) => Buffer.from(String(s), 'base64').toString('binary'),
  btoa: (s) => Buffer.from(String(s), 'binary').toString('base64'),
  fetch: () => Promise.reject(new Error('offline')),
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: noop,
  setTimeout: () => 0,
  clearTimeout: noop,
  setInterval: () => 0,
  clearInterval: noop,
  addEventListener: noop,
  removeEventListener: noop,
  matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
  ResizeObserver: class {
    observe() {}
    disconnect() {}
  },
  Image: class {
    constructor() {
      return makeEl();
    }
  },
  Blob: class {},
  URL: { createObjectURL: () => '', revokeObjectURL: noop },
  Math,
  Date,
  JSON,
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox, { name: 'index.html' });
const src = fs.readFileSync(HTML, 'utf8');
const blocks = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

const errors = [];
blocks.forEach((code, i) => {
  try {
    vm.runInContext(code, ctx, { timeout: 15000, filename: `inline-script-${i}.js` });
  } catch (e) {
    errors.push({ block: i, message: String(e && e.message).slice(0, 200) });
  }
});

// Топ-level `const` внутри vm попадает в глобальную лексическую область
// контекста, а не в объект globalThis. Поэтому значения читаем «изнутри»
// контекста — отдельным про́б-скриптом, который видит эти имена.
const declared = new Set();
for (const code of blocks) {
  for (const m of code.matchAll(/^const\s+([A-Za-z_$][\w$]*)\s*=/gm)) declared.add(m[1]);
  for (const m of code.matchAll(/^function\s+([A-Za-z_$][\w$]*)/gm)) declared.add(m[1]);
}
const probeExpr = `({
  present: [${[...declared]
    .map((n) => `'${n}'`)
    .join(',')}].filter(n => typeof eval(n) !== 'undefined'),
  counts: (() => {
    const out = {};
    ${[...declared]
      .map(
        (n) =>
          `try { const v = eval('${n}'); if (Array.isArray(v)) out['${n}'] = {kind:'array', len: v.length}; else if (v && typeof v === 'object') out['${n}'] = {kind:'object', keys: Object.keys(v).length}; else if (typeof v === 'string') out['${n}'] = {kind:'string', chars: v.length}; else if (typeof v === 'function') out['${n}'] = {kind:'function'}; } catch (e) {}`,
      )
      .join('\n')}
    return out;
  })(),
  data: (() => {
    const banks = ['TASKS_DATABASE','TASKS_DATABASE_EXT','TASKS_DATABASE_CH','TASKS_DATABASE_EXT2'];
    const topics = {}, types = {}, diff = {};
    let total = 0;
    const perBank = {};
    for (const b of banks) {
      let arr = null;
      try { arr = eval(b); } catch (e) {}
      if (!Array.isArray(arr)) continue;
      perBank[b] = arr.length;
      total += arr.length;
      for (const t of arr) {
        topics[t.topic] = (topics[t.topic] || 0) + 1;
        types[t.type] = (types[t.type] || 0) + 1;
        diff[t.difficulty] = (diff[t.difficulty] || 0) + 1;
      }
    }
    let levels = [];
    try { levels = eval('LEVELS_CONFIG') || []; } catch (e) {}
    const byChapter = {};
    let toWin = 0;
    for (const l of levels) {
      const k = (l.chapter || '?') + ':' + (l.kind || '?');
      byChapter[k] = (byChapter[k] || 0) + 1;
      toWin += l.tasksToWin || 0;
    }
    // схема полей по типам заданий — по ней удобно писать новые задания
    const all = [];
    for (const b of banks) { try { if (Array.isArray(eval(b))) all.push(...eval(b)); } catch (e) {} }
    const fieldsByType = {};
    const sampleByType = {};
    for (const t of all) {
      if (!t || !t.type) continue;
      fieldsByType[t.type] = [...new Set([...(fieldsByType[t.type] || []), ...Object.keys(t)])];
      if (!sampleByType[t.type]) sampleByType[t.type] = t;
    }
    const levelFields = levels.length ? Object.keys(levels[0]) : [];
    return { perBank, total, topics, types, diff, levels: levels.length, byChapter, tasksToWinTotal: toWin, fieldsByType, sampleByType, levelFields };
  })(),
})`;
const probe = vm.runInContext(probeExpr, ctx, { timeout: 15000 });

const { perBank: banks, total, topics, types, diff: difficulties, levels: levelCount, byChapter: chapterKinds } =
  probe.data;
const extras = {};
const pdfs = {};
for (const [name, info] of Object.entries(probe.counts)) {
  if (info.kind === 'array') extras[name] = info.len;
  else if (info.kind === 'object') extras[name] = info.keys;
  else if (info.kind === 'string' && /PDF_BASE64/.test(name)) {
    pdfs[name] = Math.round((info.chars * 3) / 4 / 1024);
  }
}
const localeDict = probe.counts.LOCALES || probe.counts.I18N || null;

const result = {
  inlineScripts: blocks.length,
  runtimeErrors: errors,
  topLevelDeclarations: [...declared].sort(),
  taskBanks: banks,
  totalTasks: total,
  taskTypes: types,
  topics,
  difficulties,
  levels: levelCount,
  levelsByChapter: chapterKinds,
  tasksToWinTotal: probe.data.tasksToWinTotal,
  dataDicts: extras,
  embeddedPdfKb: pdfs,
  localeKeys: localeDict ? localeDict.keys ?? localeDict.len : null,
  globalsFound: probe.present,
  fieldsByType: probe.data.fieldsByType,
};

if (process.argv.includes('--schema')) {
  console.log('Поля задания по типам (так их ждёт движок):\n');
  for (const [type, fields] of Object.entries(probe.data.fieldsByType)) {
    console.log(`  ${type}  (${result.taskTypes[type]} шт.)`);
    console.log(`    поля: ${fields.join(', ')}`);
    console.log(`    пример id: ${probe.data.sampleByType[type]?.id}\n`);
  }
  console.log('Поля уровня (LEVELS_CONFIG):\n    ' + (probe.data.levelFields || []).join(', '));
  process.exit(0);
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const line = (k, v) => console.log(k.padEnd(24, ' ') + ' ' + v);
  line('inline <script> блоков :', result.inlineScripts);
  line('ошибок выполнения     :', result.runtimeErrors.length, result.runtimeErrors.length ? JSON.stringify(result.runtimeErrors) : '');
  line('базы заданий          :', JSON.stringify(result.taskBanks));
  line('всего заданий         :', result.totalTasks);
  line('типы заданий          :', JSON.stringify(result.taskTypes));
  line('сложность             :', JSON.stringify(result.difficulties));
  line('тем (topics)          :', Object.keys(result.topics).length);
  line('уровней               :', result.levels);
  line('уровни по главам      :', JSON.stringify(result.levelsByChapter));
  line('минимумов до победы   :', result.tasksToWinTotal);
  line('словари контента      :', JSON.stringify(result.dataDicts));
  line('PDF, KB (base64)      :', JSON.stringify(result.embeddedPdfKb));
  line('строк i18n            :', result.localeKeys);
}
