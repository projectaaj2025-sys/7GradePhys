# Варианты публикации

Игра — один статический `index.html`. Ей не нужны ни сборка, ни сервер, ни БД, поэтому
подходит любой из способов ниже. Все они дают одинаковый результат для ученика: открыл ссылку — играет.

## 1. GitHub Actions → GitHub Pages (то, что настроено в репозитории)

Workflow [`pages.yml`](../.github/workflows/pages.yml) копирует в каталог `public/` только
публичную часть (`index.html`, `assets/`), загружает её как Pages-artifact и деплоит.

Включить один раз:

1. Settings → Pages → **Source: GitHub Actions**.
2. Push в `main` (или кнопка *Run workflow* во вкладке Actions).
3. Ссылка: `https://<username>.github.io/<repo>/`.

Особенность: на Pages попадают `index.html` и `assets/`; `docs/`, `scripts/`, `.github/`
в сайт не деплоятся — они нужны только разработчику.

Что можно поменять в workflow:

| Нужно | Правка в `pages.yml` |
|---|---|
| Раздавать ещё и PDF из `assets/pdf/` | они уже включены (копируется весь `assets/`) |
| Публиковать и README как страницу | `cp README.md public/` не добавляйте — Pages без Jekyll отдаст `.md` текстом |
| Другая ветка для продакшена | `on.push.branches: [main]` → своя ветка |
| Кастомный домен | добавить `CNAME` в репозиторий и `echo "$DOMAIN" > public/CNAME` перед upload |

## 2. Pages напрямую с ветки (без Actions)

Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)`.

Плюс: ноль настройки. Минус: по ссылке доступен весь репозиторий целиком
(`docs/`, `scripts/`, `.gitignore`), а GitHub при этом игнорирует только файлы, начинающиеся
с `_` или `.`; `.nojekyll` в комплекте, чтобы сборку не ломало.

## 3. Netlify / Vercel / Cloudflare Pages

Ничего не собирается, поэтому:

- **Netlify**: *Add new site → Import an existing project*, Build command — пусто,
  Publish directory — `.` (или `public`, если хотите раздавать как в сценарии 1).
- **Vercel**: Framework Preset → **Other**, Build command — пусто, Output directory — `.`.
- **Cloudflare Pages**: build command — пусто, output — `.`.

Зато из коробки: превью-деплой на каждый PR, свои домены, HTTPS.

## 4. Просто отдать файл (без репозитория)

Для урока в кабинете информатики часто проще всего:

- положить `index.html` на сетевой диск/в общий каталог, открыть с любого ПК;
- или скачать из репозитория: *Code → Download ZIP* (ученику нужна именно ссылка на
  Pages/raw, а не на страницу файла в интерфейсе GitHub);
- или `git clone` и `python3 -m http.server 8000` на машинке учителя — вся локальная сеть
  получит игру по адресу `http://<ip-учителя>:8000`.

## 5. Проверка после деплоя

Быстрый чек-лист (2 минуты):

```bash
URL=https://<username>.github.io/<repo>/
curl -sI "$URL" | head -3                     # 200, content-type: text/html
curl -sL "$URL" | wc -c                       # ≈ 2 097 000 байт — файл доехал целиком
curl -sL "$URL" | grep -c 'ФИЗИКА-КВЕСТ'       # ≥ 1 — та же сборка, не битый редирект
curl -sIL "$URL/assets/pdf/" -o /dev/null -w '%{http_code}\n'   # 200/403 — на ваше усмотрение
```

В браузере: открыть игру → сменить язык на Қазақша → стартовать любой уровень →
ответить на одно задание → поставить на паузу. Если всё это работает, публикация удачна.

## Типовые проблемы

| Симптом | Причина и решение |
|---|---|
| Чёрная страница / «404 There isn't a Pages site here» | Pages ещё не включён (Settings → Pages) или ждёте первый успешный Actions-ран |
| Кириллица показывает « кракозябрами» | файл отдан без UTF-8: проверьте, что не перекодировали `index.html` при переносе; в файле есть `<meta charset="UTF-8">` |
| Страница сайта — оглавление репозитория вместо игры | в корне нет `index.html` (например, загрузили файлы в подпапку) |
| Изменения не видны | кэш: Ctrl+Shift+R, либо дождитесь успешного run'а workflow |
| `npm start` не поднимается | занят порт 8080 → `node scripts/serve.mjs 8081` |
| Игра открывается, но PDF не скачиваются | `npm run check` покажет, что base64-строка повреждена; восстановите `index.html` из исходника |
