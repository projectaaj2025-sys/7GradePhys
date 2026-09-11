#!/usr/bin/env node
/**
 * scripts/list-links.mjs — собирает все внешние ссылки, «зашитые» в игру,
 * в один markdown-список (docs/SOURCES.md).
 *
 * Зачем: в двухмегабайтном HTML ссылки на симуляции PhET, видео и конспекты
 * разбросаны по десяткам блоков теории. Учителю удобно иметь их одним списком
 * (чтобы открыть/запретить/проверить доступность), а мейнтейнеру — видеть,
 * что ссылки не «протекли» в репозиторий лишним списком.
 *
 * Запуск:  node scripts/list-links.mjs            → docs/SOURCES.md
 *          node scripts/list-links.mjs --stdout   → только в консоль
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const SKIP = /^(https?:\/\/(www\.)?w3\.org|https?:\/\/localhost)/i;
const GROUPS = [
  { key: 'phet', title: 'Симуляции PhET (University of Colorado) — можно запускать прямо в браузере', re: /phet\.colorado\.edu/i },
  { key: 'video', title: 'Видеоуроки и опыты', re: /(rutube\.ru|vk\.com\/video|vkvideo\.ru|youtube\.com|youtu\.be|vimeo\.com|tiktok\.com)/i },
  { key: 'doc', title: 'Документы, книги, статьи', re: /(djvu\.online|ruwiki|wikipedia|physicsclassroom|vascak|new3jcn|lib\.|books)/i },
  { key: 'ai', title: 'Ссылки на разборы/диалоги (AI-чат)', re: /gemini\.google\.com/i },
];

// контекст: ближайший «ключ данных» перед ссылкой (§, тема, уровень)
const CONTEXT_LABELS = {
  safety: 'Техника безопасности',
  kinematics: 'Кинематика',
  density: 'Плотность',
  dynamics: 'Силы и динамика',
  pressure: 'Давление',
  energy: 'Работа, мощность, энергия',
  mechanical: 'Простые механизмы',
  solar: 'Космос и Земля',
  general: 'Введение, методы измерения',
};
const humanize = (key) => {
  const m = /^(p|lab)(\d+)$/.exec(key);
  if (m) return m[1] === 'p' ? `§${m[2]}` : `лабораторная ${m[2]}`;
  return CONTEXT_LABELS[key] || key;
};

const lines = src.split('\n');
const found = new Map();

lines.forEach((line, idx) => {
  for (const m of line.matchAll(/https?:\/\/[^\s"'`)\\<\]]+/g)) {
    let url = m[0].replace(/[.,;)]+$/, '');
    if (SKIP.test(url)) continue;
    const ctx = (() => {
      const keyMatch = line.match(/"(p\d+|lab\d+|safety|kinematics|density|dynamics|pressure|energy|mechanical|solar|general)"/);
      if (keyMatch) return keyMatch[1];
      const lvl = line.match(/id:\s*(\d+)/);
      if (lvl) return 'уровень ' + lvl[1];
      return `строка ${idx + 1}`;
    })();
    if (!found.has(url)) found.set(url, { contexts: new Set(), count: 0 });
    const rec = found.get(url);
    rec.count += 1;
    rec.contexts.add(humanize(ctx));
  }
});

const byGroup = new Map();
const rest = [];
for (const [url, rec] of found) {
  const g = GROUPS.find((grp) => grp.re.test(url));
  if (!g) rest.push([url, rec]);
  else {
    if (!byGroup.has(g.key)) byGroup.set(g.key, { title: g.title, items: [] });
    byGroup.get(g.key).items.push([url, rec]);
  }
}

const fmt = (url, rec) =>
  `- ${url}\n  — в ${rec.count} ${rec.count === 1 ? 'месте' : 'местах'}: ${[...rec.contexts].slice(0, 6).join(', ')}${rec.contexts.size > 6 ? ' …' : ''}`;

let out = `# Внешние ссылки, которые встречаются в игре

> Файл сгенерирован \`scripts/list-links.mjs\` — не редактируйте вручную:
> после правок в \`index.html\` запустите \`npm run links\`.

Всего уникальных ссылок: **${found.size}**. Всё остальное в игре работает офлайн:
картинок, скриптов и шрифтов из сети игра не подгружает.

`;
for (const g of GROUPS) {
  const grp = byGroup.get(g.key);
  if (!grp || !grp.items.length) continue;
  out += `## ${grp.title}\n\n`;
  out += grp.items
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .map(([u, r]) => fmt(u, r))
    .join('\n');
  out += '\n\n';
}
if (rest.length) {
  out += `## Прочее\n\n`;
  out += rest.map(([u, r]) => fmt(u, r)).join('\n');
  out += '\n\n';
}
out += `## Замечания для учителя

- Для офлайн-урока ссылки не нужны: механика и весь контент (249 заданий, 50 уровней,
  теория по параграфам и 3 конспекта PDF) лежат внутри \`index.html\`.
- Ссылки на видео и симуляции открываются в новой вкладке и требуют интернета.
- Ссылки вида \`vimeo.com/reviews/...\` — приватные ссылки-обзоры: ученик по ним видео
  не увидит. Нужен публичный ролик — замените на обычную ссылку.
`;

if (process.argv.includes('--stdout')) {
  console.log(out);
} else {
  const dest = path.join(ROOT, 'docs', 'SOURCES.md');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, out);
  console.log(`docs/SOURCES.md обновлён: ${found.size} уникальных ссылок, групп: ${byGroup.size}, прочих: ${rest.length}`);
}
