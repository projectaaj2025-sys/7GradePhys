#!/usr/bin/env node
/**
 * scripts/serve.mjs — мини-сервер для локального предпросмотра (без зависимостей).
 *
 * Нужен только тем, кто хочет открыть игру как сайт (http://localhost:8080),
 * а не двойным кликом по index.html. Игра работает и по file://, но http
 * удобнее: корректные заголовки, кэш отключён, видно ошибки в консоли браузера.
 *
 * Запуск:  node scripts/serve.mjs [порт]     (по умолчанию 8080)
 *          npm run serve
 * Остановить: Ctrl+C
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || process.env.PORT || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json',
  '.pdf': 'application/pdf',
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.normalize(path.join(ROOT, url === '/' ? 'index.html' : url));

  // не пускаем за пределы репозитория и не отдаём служебные каталоги
  if (!file.startsWith(ROOT) || /(^|[\\/])(\.git|node_modules)[\\/]/.test(file)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404: нет файла ' + url);
    return;
  }
  const body = fs.readFileSync(file);
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'content-length': body.length,
    'cache-control': 'no-store',
  });
  res.end(body);
});

server.listen(PORT, () => {
  console.log(`\n  Физика-Квест доступен по адресу:  http://localhost:${PORT}/`);
  console.log(`  Каталог: ${ROOT}`);
  console.log('  Остановить: Ctrl+C\n');
});
