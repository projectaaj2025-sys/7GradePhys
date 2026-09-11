#!/usr/bin/env node
/**
 * scripts/smoke.mjs — смоук-тест в реальном DOM (jsdom).
 *
 * check.mjs проверяет файл статически; этот скрипт делает шаг дальше:
 * загружает index.html целиком, даёт игре отработать загрузку и «прокликивает»
 * путь ученика: меню → выбор уровня → старт уровня → пауза. Падение JS,
 * непостроившийся экран или пропавшие карточки уровней здесь видны сразу.
 *
 * Нужен jsdom — единственная зависимость в проекте, и та dev-only:
 *   npm i -D jsdom && npm run smoke
 * Са́ма игра зависимостей не имеет и работает по file://.
 *
 * 0 — прошло, 1 — есть ошибки, 2 — сам тест не смог запуститься.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'index.html');

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = createRequire(import.meta.url)('jsdom'));
} catch {
  console.error('✗ jsdom не установлен. Запустите: npm i -D jsdom');
  process.exit(2);
}

const errors = [];
const report = [];
const ok = (label, cond, extra = '') => {
  report.push(`${cond ? '✓' : '✗'} ${label}${extra ? ` — ${extra}` : ''}`);
  if (!cond) errors.push(label);
};
const info = (line) => report.push(`· ${line}`);

/* jsdom не умеет canvas: без мока игра упадёт на первом же рисовании.
   Мок принимает любые вызовы 2D-контекста и возвращает безобидные значения. */
const mockGradient = { addColorStop() {} };
function mockCtx(canvas) {
  const target = {
    canvas,
    createLinearGradient: () => mockGradient,
    createRadialGradient: () => mockGradient,
    createPattern: () => null,
    measureText: (t) => ({ width: String(t).length * 6 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    createImageData: (w = 1, h = 1) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  };
  return new Proxy(target, {
    get: (t, k) => (k in t ? t[k] : () => undefined),
    set: (t, k, v) => {
      t[k] = v;
      return true;
    },
  });
}

const html = fs.readFileSync(FILE, 'utf8');
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => {
  const msg = String(e?.detail?.message || e?.message || e);
  if (/Not implemented: (HTMLCanvasElement|HTMLMediaElement)/.test(msg)) return;
  if (/Could not load (img|iframe|link)/.test(msg)) return; // внешние картинки нам не нужны
  errors.push('jsdomError: ' + msg.slice(0, 200));
});
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ').slice(0, 200)));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost/',
  virtualConsole: vc,
  resources: undefined,
  beforeParse(window) {
    window.HTMLCanvasElement.prototype.getContext = function (type) {
      return type === '2d' ? mockCtx(this) : null;
    };
    window.Element.prototype.scrollIntoView = function () {};
    window.alert = () => {};
    window.matchMedia =
      window.matchMedia ||
      (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    class FakeParam {
      constructor() {
        this.value = 0;
      }
      setValueAtTime() {
        return this;
      }
      linearRampToValueAtTime() {
        return this;
      }
      exponentialRampToValueAtTime() {
        return this;
      }
    }
    const fakeNode = (extra = {}) => ({ connect() {}, disconnect() {}, start() {}, stop() {}, ...extra });
    window.AudioContext = class {
      constructor() {
        this.state = 'running';
        this.currentTime = 0;
        this.destination = fakeNode();
      }
      createOscillator() {
        return fakeNode({ frequency: new FakeParam(), type: 'sine', onended: null });
      }
      createGain() {
        return fakeNode({ gain: new FakeParam() });
      }
      createBiquadFilter() {
        return fakeNode({ frequency: new FakeParam() });
      }
      resume() {
        return Promise.resolve();
      }
      close() {
        return Promise.resolve();
      }
    };
    window.webkitAudioContext = window.AudioContext;
  },
});

const { window } = dom;
const doc = window.document;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const visible = (sel) => {
  const el = doc.querySelector(sel);
  return !!el && el.classList.contains('active');
};
const click = (el) => el && el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const key = (type, k) => window.dispatchEvent(new window.KeyboardEvent(type, { key: k, bubbles: true }));

const LEVEL_COUNT = 50;

(async () => {
  await wait(1200); // экран загрузки → меню

  ok('загрузка: меню активно, loading-экран снят', visible('#menu-screen') && !visible('#loading-screen'),
    `menu=${visible('#menu-screen')} loading=${visible('#loading-screen')}`);

  click(doc.querySelector('#btn-start'));
  await wait(400);
  ok('меню → экран выбора уровней', visible('#level-screen'));

  const grid = doc.querySelector('#levels-grid');
  const cards = grid ? grid.querySelectorAll('.level-card').length : 0;
  ok(`отрисовано ${LEVEL_COUNT} карточек уровней`, cards === LEVEL_COUNT, `фактически ${cards}`);

  click(grid?.querySelector('.level-card'));
  await wait(700);
  // перед уровнем может открыться теория — жмём «в бой», если кнопка есть
  const theoryBtn = doc.querySelector('#btn-theory-start, #theory-modal .btn-primary, #btn-theory-close');
  if (theoryBtn) {
    info('открыт блок теории перед уровнем — закрываем/стартуем');
    click(theoryBtn);
    await wait(500);
  }
  ok('игровой экран активен', visible('#game-screen'));
  ok('canvas создан', !!doc.querySelector('#game-screen canvas'));
  ok('HUD на месте', !!doc.querySelector('#hud-score') && !!doc.querySelector('#hud-time'));

  ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd'].forEach((k) => {
    key('keydown', k);
    key('keyup', k);
  });
  await wait(300);
  key('keydown', 'p');
  key('keyup', 'p');
  await wait(250);
  ok('пауза открывается по P', visible('#pause-overlay'));
  key('keydown', 'p');
  key('keyup', 'p');
  await wait(250);
  ok('пауза снимается по P', !visible('#pause-overlay'));

  if (visible('#task-modal')) {
    const input = doc.querySelector('#task-modal input, #task-modal textarea');
    if (input) {
      input.value = '1';
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    }
    click(doc.querySelector('#btn-submit'));
    await wait(400);
    info('модалка задания приняла ответ без падения');
  } else {
    info('за 2 секунды задание не успело выпасть — это нормально (интервал ~3–6 c)');
  }

  // смена языка не должна ронять интерфейс
  click(doc.querySelector('#menu-screen .lang-btn[data-lang="kk"]') || doc.querySelector('.lang-btn[data-lang="kk"]'));
  await wait(300);
  info(`язык переключён: html[data-lang]=${doc.documentElement.getAttribute('data-lang')}`);

  await wait(600);
  ok('ошибок JS за время прогона нет', errors.length === 0);

  console.log('Смоук-тест index.html в jsdom');
  console.log('─'.repeat(56));
  for (const line of report) console.log('  ' + line);
  console.log('─'.repeat(56));
  if (errors.length) {
    console.log(`ИТОГ: провалено (${errors.length}):`);
    for (const e of [...new Set(errors)]) console.log('  ✗ ' + e);
    window.close();
    process.exit(1);
  }
  console.log('ИТОГ: игра загружается и играет без ошибок JS.');
  window.close();
  process.exit(0);
})().catch((e) => {
  console.error('✗ смоук-тест упал:', e);
  process.exit(2);
});
