#!/usr/bin/env node
/**
 * scripts/extract-pdfs.mjs
 *
 * В index.html конспекты («шпаргалки» по параграфам) лежат как base64-строки
 * — так игра работает офлайн и одним файлом. Этот скрипт вытаскивает их в
 * обычные .pdf в assets/pdf/, чтобы файл можно было:
 *   • открыть/распечатать, не запуская игру;
 *   • приложить к уроку в LMS / мессенджере;
 *   • продублировать в репозитории как самостоятельный материал.
 *
 * Запуск: node scripts/extract-pdfs.mjs
 * Ничего в index.html не меняет — только читает.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = path.join(ROOT, 'index.html');
const OUT_DIR = path.join(ROOT, 'assets', 'pdf');

const FILES = [
  // Имена в репозитории — ASCII: без искажений в Windows, Actions и архиваторах. Внутри игры имена скачивания другие (русские).
  { variable: 'CONSPECT_PDF_BASE64', file: 'conspect-7-ru.pdf', lang: 'ru' },
  { variable: 'CONSPECT_PDF_BASE64_EN', file: 'conspect-7-en.pdf', lang: 'en' },
  { variable: 'CONSPECT_PDF_BASE64_KK', file: 'conspect-7-kk.pdf', lang: 'kk' },
];

const src = fs.readFileSync(HTML, 'utf8');
fs.mkdirSync(OUT_DIR, { recursive: true });

let ok = 0;
for (const { variable, file, lang } of FILES) {
  const re = new RegExp(`const ${variable}\\s*=\\s*"([A-Za-z0-9+/=]+)"`);
  const m = src.match(re);
  if (!m) {
    console.error(`✗ ${lang}: переменная ${variable} не найдена в index.html`);
    continue;
  }
  const buf = Buffer.from(m[1], 'base64');
  const isPdf = buf.subarray(0, 5).toString('latin1') === '%PDF-';
  const hasEof = buf.subarray(-80).toString('latin1').includes('%%EOF');
  if (!isPdf || !hasEof) {
    console.error(`✗ ${lang}: распаковалось, но это не похожий на PDF блок (${buf.length} B)`);
    continue;
  }
  const out = path.join(OUT_DIR, file);
  fs.writeFileSync(out, buf);
  const pages = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(
    `✓ ${lang} → assets/pdf/${file} (${(buf.length / 1024).toFixed(0)} KB${pages ? `, ${pages} стр.` : ''})`,
  );
  ok += 1;
}

console.log(ok === FILES.length ? `\nГотово: ${ok}/${FILES.length} файла в ${path.relative(ROOT, OUT_DIR)}/` : `\nВнимание: распаковано ${ok} из ${FILES.length}.`);
process.exit(ok === FILES.length ? 0 : 1);
