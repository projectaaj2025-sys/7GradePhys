# CHANGELOG

Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/), версионирование —
[SemVer](https://semver.org/lang/ru/). Ведётся для репозитория целиком: игры, скриптов и документации.

## [1.0.0] — 2026-09-11

Первое публичное оформление проекта в репозиторий. Игра при этом не переписывалась:
`index.html` добавлен **побайтовой копией** сборки `physics-quest-all-unlocked (2).html`
(контрольная сумма `md5 0d92626285a3b49e746dfc7e7af4e7e7`, 2 097 691 байт, 12 381 строка).

### Added

- **Репозиторий под публикацию**: `README.md` (+ `README.en.md`), `LICENSE`, `NOTICE`,
  `.gitignore`, `.gitattributes`, `.editorconfig`, `.nojekyll`, `package.json`.
- **CI** (`.github/workflows/ci.yml`): прогон `scripts/check.mjs` на каждый push/PR, смоук-тест
  `scripts/smoke.mjs` в jsdom, статистика контента в summary сборки, артефакт `physics-quest-site`
  с публичной частью.
- **Деплой на GitHub Pages** (`.github/workflows/pages.yml`): в `public/` копируются
  `index.html` и `assets/`, публикация через `actions/deploy-pages`.
- **Проверка целостности** `scripts/check.mjs`: структура HTML, компиляция и исполнение всех
  инлайновых `<script>` в песочнице Node, переводы заданий `ru/en/kk`, согласованность
  `LEVELS_CONFIG` ↔ тем заданий, наличие теории перед уровнем, целостность трёх base64-PDF,
  баланс container-тегов в разметке, предупреждение о приватных ссылках.
- **Инструменты**: `scripts/stats.mjs` (сколько что весит и сколько его, `--json`, `--schema`),
  `scripts/extract-pdfs.mjs` (распаковка конспектов в `assets/pdf/`),
  `scripts/list-links.mjs` (генерация `docs/SOURCES.md`), `scripts/serve.mjs` (локальный сервер),
  `scripts/smoke.mjs` (смоук-тест игры в jsdom — единственная dev-зависимость, `npm run smoke`),
  `scripts/new-repo.sh` (инициализация git-репозитория и первый коммит).
- **Документация**: `docs/SETUP-GITHUB.md`, `docs/DEPLOY.md`, `docs/EDITING.md`,
  `docs/CONTENT.md`, `docs/CREDITS.md`, `docs/SOURCES.md`, `docs/img/README.md`.
- **Шаблоны GitHub**: `issues` (баг / ошибка в задании / предложение), PR-шаблон с чек-листом,
  `ISSUE_TEMPLATE/config.yml`.
- `assets/logo.svg` — эмблема для README (нарисована для репозитория, CC BY-NC-SA 4.0).
- `assets/pdf/` — те же 3 конспекта (RU/EN/KK, по 69 стр.) отдельными файлами: их можно
  распечатать, не запуская игру.

### Unchanged (намеренно)

- `index.html`: ни одной правки — код, стили, контент, переводы и внешние ссылки остались ровно
  теми, что были в присланной сборке.
- Поведение сборки «all unlocked»: `const isUnlocked = true` — все 50 уровней доступны сразу.

### Notes

- Проект распространяется под **CC BY-NC-SA 4.0** (см. `LICENSE` и `NOTICE`).
- В `index.html` остаются внешние ссылки на публичные шаринги `gemini.google.com/share/…` (11 шт.)
  и приватную страницу `vimeo.com/reviews/…`. Они сохранены по решению владельца проекта;
  перед публичной раздачей репозитория стоит решить, нужны ли они (см.
  `docs/EDITING.md`, раздел «Перед публикацией репозитория»). `npm run check` об этом напоминает.

[1.0.0]: https://github.com/USERNAME/physics-quest/releases/tag/v1.0.0
