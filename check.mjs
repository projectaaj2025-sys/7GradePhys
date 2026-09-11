#!/usr/bin/env node
/**
 * scripts/check.mjs — офлайн-проверка целостности index.html.
 *
 * Игра намеренно лежит в одном файле (чтобы её можно было скинуть ученикам
 * на флешку и запускать без интернета). Такой файл легко повредить случайным
 * редактированием, поэтому перед коммитом и в CI прогоняем проверки:
 *
 *   1. Структура HTML: doctype, закрытые </html>, все <script>/</script> парные.
 *   2. Синтаксис каждого инлайнового <script> (компиляция без выполнения).
 *   3. Выполнение всех скриптов в песочнице Node с DOM-заглушками — ловим
 *      падения на старте (ReferenceError и т. п.).
 *   4. Инварианты контента: уникальность id заданий, наличие ru/en/kk
 *      переводов, корректность ссылок уровней на темы, tasksToWin <= tasksTotal.
 *
 * Ни один из шагов не изменяет index.html.
 * Выход: 0 — всё в порядке (возможны предупреждения), 1 — найдена проблема.
 *
 * Запуск: node scripts/check.mjs   (или: npm run check)
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML_PATH = path.join(ROOT, 'index.html');
const MAX_HTML_BYTES = 25 * 1024 * 1024; // лимит одного файла в GitHub
const LANGS = ['ru', 'en', 'kk'];

const problems = [];
const warnings = [];
const info = [];
const fail = (msg) => problems.push(msg);
const warn = (msg) => warnings.push(msg);
const note = (msg) => info.push(msg);

/* ---------- 1. базовая структура HTML ---------- */
if (!fs.existsSync(HTML_PATH)) {
  console.error('✗ index.html не найден в корне репозитория');
  process.exit(1);
}
const src = fs.readFileSync(HTML_PATH, 'utf8');
const bytes = Buffer.byteLength(src, 'utf8');
note(`index.html: ${(bytes / 1024 / 1024).toFixed(2)} МБ, ${src.split('\n').length} строк`);
if (bytes > MAX_HTML_BYTES) fail(`index.html больше лимита GitHub на файл (${MAX_HTML_BYTES} МБ)`);
if (!/^\s*<!DOCTYPE html>/i.test(src)) fail('нет <!DOCTYPE html> в начале файла');
if (!/<\/html>\s*$/i.test(src.trimEnd() + '\n') && !src.trimEnd().endsWith('</html>')) fail('файл не заканчивается тегом </html>');
if (!src.includes('<meta charset="UTF-8"') && !/<meta charset=["']?utf-8/i.test(src)) {
  fail('нет <meta charset="UTF-8"> — кириллица может открыться «кракозябрами»');
}
if (/<script\b[^>]*\bsrc=/i.test(src)) warn('есть внешние <script src=...> — игра перестанет быть офлайн-файлом');

const opens = (src.match(/<script\b[^>]*>/gi) || []).length;
const closes = (src.match(/<\/script>/gi) || []).length;
if (opens !== closes) fail(`<script> не сбалансирован: открыто ${opens}, закрыто ${closes}`);
else note(`инлайновых блоков <script>: ${opens}`);

const styleOpens = (src.match(/<style\b[^>]*>/gi) || []).length;
const styleCloses = (src.match(/<\/style>/gi) || []).length;
if (styleOpens !== styleCloses) fail(`<style> не сбалансирован: ${styleOpens} / ${styleCloses}`);

// Баланс ключевых container-тегов — грубая, но полезная проверка после правок.
// Считаем по разметке БЕЗ содержимого <script>: в строках JS и HTML-шаблонов
// теги встречаются постоянно, и без вырезания счёт давал бы ложные цифры.
const markup = src
  .replace(/<script>[\s\S]*?<\/script>/g, '')
  .replace(/<style>[\s\S]*?<\/style>/g, '')
  .replace(/<!--[\s\S]*?-->/g, '');
for (const tag of ['div', 'section', 'main', 'header', 'button', 'span', 'p']) {
  const o = (markup.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length;
  const c = (markup.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
  if (o !== c) fail(`<${tag}> в разметке: открыто ${o}, закрыто ${c} — сломанная вёрстка`);
}

/* ---------- 2. вычленяем скрипты и стили ---------- */
const scripts = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (!scripts.length) fail('не найдено ни одного инлайнового <script>');

const css = [...src.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
for (const [name, count] of Object.entries({ '{': '}', '(': ')' })) {
  const a = (css.match(new RegExp(`\\${name}`, 'g')) || []).length;
  const b = (css.match(new RegExp(`\\${count}`, 'g')) || []).length;
  if (a !== b) warn(`в CSS дисбаланс ${name}/${count}: ${a} против ${b}`);
}
if (/@media[^{]*$/.test(css.replace(/\s+/g, ' '))) warn('похоже, незакрытый блок @media в CSS');

/* ---------- 3. синтаксис + запуск в песочнице ---------- */
const noop = () => {};
const ctx2d = new Proxy(
  {},
  {
    get: (t, k) => (k === 'canvas' ? makeEl() : k === 'measureText' ? () => ({ width: 10 }) : noop),
  },
);
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
    tagName: 'DIV',
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
const documentStub = {
  getElementById: () => makeEl(),
  querySelector: () => makeEl(),
  querySelectorAll: () => [],
  createElement: () => makeEl(),
  createTextNode: () => makeEl(),
  addEventListener: noop,
  removeEventListener: noop,
  body: makeEl(),
  head: makeEl(),
  documentElement: makeEl(),
  cookie: '',
  title: '',
};
const sandbox = {
  console: { log: noop, warn: noop, error: noop, info: noop },
  document: documentStub,
  localStorage,
  navigator: { userAgent: 'node-check', language: 'ru', vibrate: noop },
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
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
const context = vm.createContext(sandbox, { name: 'index.html:scripts' });

let syntaxErrors = 0;
scripts.forEach((code, i) => {
  try {
    // только компиляция — ловит синтаксические ошибки без побочных эффектов
    new vm.Script(code, { filename: `inline-script-${i}.js` });
  } catch (e) {
    syntaxErrors += 1;
    fail(`синтаксис, блок <script> №${i + 1}: ${e.message}`);
  }
});
if (!syntaxErrors) note(`синтаксис: все ${scripts.length} блоков <script> компилируются`);

let runtimeErrors = 0;
scripts.forEach((code, i) => {
  try {
    vm.runInContext(code, context, { timeout: 15000, filename: `inline-script-${i}.js` });
  } catch (e) {
    runtimeErrors += 1;
    fail(`исполнение, блок <script> №${i + 1}: ${String(e && e.message).slice(0, 300)}`);
  }
});
if (!runtimeErrors) note('исполнение: все блоки отработали без ошибок (DOM-заглушки)');

/* ---------- 4. инварианты контента (через про́б в том же контексте) ---------- */
const declared = new Set();
for (const code of scripts) {
  for (const m of code.matchAll(/^const\s+([A-Za-z_$][\w$]*)\s*=/gm)) declared.add(m[1]);
}
const BANKS = ['TASKS_DATABASE', 'TASKS_DATABASE_EXT', 'TASKS_DATABASE_CH', 'TASKS_DATABASE_EXT2'];

const probeSource = `(() => {
  const banks = [];
  ${BANKS.map((b) => `try { if (Array.isArray(${b})) banks.push([${JSON.stringify(b)}, ${b}]); } catch (e) {}`).join('\n')}
  let levels = [];
  try { if (Array.isArray(LEVELS_CONFIG)) levels = LEVELS_CONFIG; } catch (e) {}
  let theory = null;
  try { theory = typeof LEVEL_THEORY === 'object' ? LEVEL_THEORY : null; } catch (e) {}
  return { banks, levels, theory };
})()`;

let probe = { banks: [], levels: [] };
try {
  probe = vm.runInContext(probeSource, context, { timeout: 20000 });
} catch (e) {
  fail(`не удалось прочитать данные игры: ${e.message}`);
}

const allTasks = [];
for (const [bankName, arr] of probe.banks) {
  note(`банк «${bankName}»: ${arr.length} заданий`);
  for (const t of arr) allTasks.push({ ...t, __bank: bankName });
}

if (!allTasks.length) {
  fail('не найдена ни одна база заданий (TASKS_DATABASE и компании) — файл повреждён?');
} else {
  const ids = new Map();
  for (const t of allTasks) {
    if (!t.id) fail(`задание без id в банке ${t.__bank}`);
    ids.set(t.id, (ids.get(t.id) || 0) + 1);
  }
  const dup = [...ids.entries()].filter(([, n]) => n > 1);
  if (dup.length) warn(`дубли id заданий (${dup.length}): ${dup.slice(0, 8).map(([id, n]) => `${id}×${n}`).join(', ')}`);

  const noLang = [];
  for (const t of allTasks) {
    const q = t.question || {};
    if (!LANGS.every((l) => typeof q[l] === 'string' && q[l].trim())) noLang.push(t.id);
  }
  if (noLang.length) fail(`задания без полного перевода ru/en/kk (${noLang.length}): ${noLang.slice(0, 10).join(', ')}`);
  else note('переводы: у всех заданий есть ru/en/kk');

  const badAnswer = allTasks.filter(
    (t) =>
      t.correctAnswer === undefined &&
      t.correctAnswers === undefined &&
      t.answers === undefined &&
      t.pairs === undefined &&
      t.matching === undefined,
  );
  if (badAnswer.length)
    warn(`задания без поля ответа (${badAnswer.length}): ${badAnswer.slice(0, 10).map((t) => t.id).join(', ')}`);

  const types = {};
  for (const t of allTasks) types[t.type] = (types[t.type] || 0) + 1;
  note(`всего заданий: ${allTasks.length}, типов: ${Object.keys(types).length}`);
  for (const t of allTasks) {
    if (t.type === 'multiple-choice' || t.type === 'multi-select') {
      const opts = t.options && (t.options.ru || t.options);
      if (!Array.isArray(opts) || opts.length < 2) {
        fail(`задание ${t.id}: у типа «${t.type}» меньше двух вариантов ответа`);
        break;
      }
    }
  }
}

if (!probe.levels.length) {
  fail('LEVELS_CONFIG пуст — экран выбора уровней не соберётся');
} else {
  const topics = new Set(allTasks.map((t) => t.topic));
  const orphans = [];
  for (const l of probe.levels) {
    if (!(l.tasksToWin <= l.tasksTotal)) orphans.push(`${l.id}: tasksToWin > tasksTotal`);
    for (const tp of l.topics || []) if (!topics.has(tp)) orphans.push(`${l.id}: тема «${tp}» без заданий`);
  }
  if (orphans.length) warn(`уровни с расхождениями (${orphans.length}): ${orphans.slice(0, 8).join('; ')}`);
  else note(`уровни: ${probe.levels.length}, все ссылки на темы разрешаются`);

  const ids = probe.levels.map((l) => l.id);
  if (new Set(ids).size !== ids.length) fail('в LEVELS_CONFIG дублируются id уровней');

  if (probe.theory) {
    // Повторяем логику theoryKeyFor() из игры, иначе проверка врёт.
    const keyFor = (l) => {
      if (l.chapter === 'lab') return l.kind || 'lab1';
      if (l.kind === 'safety' || l.chapter === 'bonus') return 'bonus';
      if (l.chapter && /^p\d+$/.test(l.chapter)) return l.chapter;
      return 'custom';
    };
    const missingTheory = probe.levels.map((l) => l.id).filter((id) => {
      const l2 = probe.levels.find((x) => x.id === id);
      return !(keyFor(l2) in probe.theory);
    });
    if (missingTheory.length) warn(`без теоретического блока перед уровнем: ${missingTheory.slice(0, 10).join(', ')}`);
    else note(`теория перед уровнем: есть у всех ${probe.levels.length} уровней`);
  }
}

/* ---------- 5. зашитые PDF ---------- */
const pdfVars = [...declared].filter((n) => /PDF_BASE64/.test(n));
for (const v of pdfVars) {
  const m = src.match(new RegExp(`const ${v}\\s*=\\s*"([A-Za-z0-9+/=]+)"`));
  if (!m) {
    fail(`переменная ${v} объявлена, но её base64-строка не найдена`);
    continue;
  }
  const buf = Buffer.from(m[1], 'base64');
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') fail(`${v}: это не похоже на PDF (битый base64?)`);
  else if (!buf.subarray(-80).toString('latin1').includes('%%EOF')) warn(`${v}: нет маркера %%EOF — PDF может быть обрезан`);
  else note(`${v}: PDF ${(buf.length / 1024).toFixed(0)} KB, целостен`);
}

/* ---------- 6. ссылки наружу (только информация) ---------- */
const urls = [...new Set([...src.matchAll(/https?:\/\/[^\s"'`)\\]+/g)].map((m) => m[0].replace(/[.,;)]+$/, '')))];
const unreachable = urls.filter((u) => /vimeo\.com\/reviews\/|docs\.google\.com\/(document|spreadsheets)\/d\/[^/]+\/edit/.test(u));
if (unreachable.length)
  warn(`ссылки, требующие доступа (ученик увидит «нет доступа»): ${unreachable.slice(0, 5).join(', ')}`);

/* ---------- итог ---------- */
console.log('\nПроверка index.html');
console.log('─'.repeat(60));
for (const line of info) console.log('  · ' + line);
for (const line of warnings) console.log('  ⚠ ' + line);
for (const line of problems) console.log('  ✗ ' + line);
console.log('─'.repeat(60));
if (problems.length) {
  console.log(`ИТОГ: провалено (${problems.length} ошибок, ${warnings.length} предупреждений)`);
  process.exit(1);
}
console.log(`ИТОГ: OK — ошибок нет, предупреждений: ${warnings.length}`);
