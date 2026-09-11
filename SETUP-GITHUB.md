# Публикация этого набора файлов на GitHub

Задача — выложить игру так, чтобы (а) репозиторий открывался и запускался, (б) по нему можно
было дать ссылку ученикам. Ниже — три сценария: с нуля, поверх существующего репо, и «я не люблю
терминал».

## 0. Перед тем как пушить

Проверьте, что в каталоге есть:

```
index.html   README.md   README.en.md   LICENSE   NOTICE   package.json
.gitignore   .gitattributes   .editorconfig   .nojekyll
assets/   docs/   scripts/   .github/
```

И что проверки зелёные (зависимости не нужны, нужен Node.js 18+):

```bash
npm run check
npm run smoke     # опционально: npm install && node scripts/smoke.mjs
```

Должно закончиться строкой `ИТОГ: OK`. Это главная гарантия, что `index.html` не повреждён
при переносе. Дополнительно (нужен `npm install`, ставится только jsdom):

```bash
npm install && npm run smoke   # игра реально загружается и «играет» в DOM
```

Отдельно полезно прогнать `npm run stats` и глазами сверить цифры в README (50 уровней,
249 заданий, 3 языка) — если цифра в README разошлась с реальностью, правьте README.

## 1. Новый репозиторий с нуля (рекомендую)

Быстрее всего — приложенным скриптом (он же прогонит `npm run check`, распакует PDF
и перегенерирует `docs/SOURCES.md` перед коммитом):

```bash
cd physics-quest
./scripts/new-repo.sh                                   # проверки + git init + коммит
./scripts/new-repo.sh git@github.com/<username>/physics-quest.git   # то же + push
```

Вручную то же самое выглядит так:

```bash
# 1. создайте пустой публичный репо на GitHub, например physics-quest
#    (без README, без .gitignore, без лицензии — всё это уже есть здесь)

cd physics-quest
git init -b main
git add .
git commit -m "feat: Физика-Квест: Энергетический Щит — игра по физике 7 класса

50 уровней (техника безопасности, §1–§39, 10 лабораторных), 249 задания,
7 типов, переводы RU/EN/KK, режим учителя, 3 PDF-конспекта.
Один HTML-файл, работает офлайн. Лицензия CC BY-NC-SA 4.0."

git remote add origin git@github.com:<username>/physics-quest.git   # или https://...
git push -u origin main
```

Есть `gh` CLI — можно одной командой (создаст репо и запушит):

```bash
gh repo create physics-quest --public --source=. --push \
  --description "Образовательная RPG по физике 7 класса: один HTML-файл, работает офлайн, RU/EN/KK"
```

Хотите приватный репо — добавьте `--private` вместо `--public`.

## 2. Если репозиторий уже создан через веб-интерфейс

GitHub не даст «закоммитить» каталог с подпапками через кнопку *Add file → Upload files* —
он не сохраняет вложенность, и `docs/`, `scripts/`, `.github/` развалятся. Варианты:

- **ZIP**: заархивируйте каталог (`zip -r ../physics-quest.zip .`) и перетащите архив в зону
  *Add file → Upload files* — GitHub умеет распаковывать такой архив и сохраняет вложенность
  каталогов. Если после загрузки `.github/` или `docs/` оказались свалены в корень —
  распаковка не сработала, переходите на git (вар. 1).
- **git** (надёжнее): см. раздел 1, но вместо `git init` —
  `git clone https://github.com/<username>/physics-quest.git`, скопировать туда файлы, `git add`, `commit`, `push`.

## 3. Включить GitHub Pages (чтобы дать ученикам ссылку)

**Вариант A — через workflow (уже настроен в этом наборе).**

Репозиторий → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
После этого каждый push в `main` запускает
[`.github/workflows/pages.yml`](../.github/workflows/pages.yml), и сайт доступен как:

```
https://<username>.github.io/physics-quest/
```

Плюс этого способа: на Pages улетает только `index.html` + `assets/` (скрипты, docs и `.github/`
в публичную раздачу не попадают), и кэширование контролируется `.nojekyll`.

**Вариант B — без Actions (быстро, для разового запуска).**

Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)` → Save.
Тогда по ссылке будет и `README.md` как файл, и `docs/` — работает, но менее аккуратно.

**Вариант C — репозиторий-файл.** Если Pages не нужен, достаточно отдать прямую ссылку на
raw-файл (ученик скачает игру и откроет локально):

```
https://raw.githubusercontent.com/<username>/physics-quest/main/index.html
```

⚠️ `raw.githubusercontent.com` отдаёт `Content-Type: text/plain`, поэтому в браузере файл
откроется как текст — это ссылка «скачать», а не «поиграть». Для «поиграть» нужен Pages.

## 4. Что настроить в самом репозитории

- **About / описание**: «Физика 7 класс — RPG-игра: 50 уровней, 249 задания, RU/EN/KK. Один HTML-файл, работает офлайн.»
- **Website**: `https://<username>.github.io/physics-quest/`
- **Topics**: `physics`, `game-based-learning`, `education`, `russia`/`kazakhstan`, `7-класс`,
  `single-file-app`, `gamification`, `stem`
- Если в README ещё остались заглушки `USERNAME` — замените на свой логин
  (иначе бейджи и ссылки на issues битые):

```bash
grep -rn "USERNAME" README.md README.en.md NOTICE docs/ .github/
sed -i "s/USERNAME/<username>/g" README.md README.en.md NOTICE docs/SETUP-GITHUB.md
```

## 5. Что и как обновлять потом

```bash
# поправили index.html
npm run check                 # не поехало? правьте, пока не OK
git commit -am "fix(tasks): §17 — неверный ответ в задаче k47" -a
git push
```

Правила гигиены для монолитного `index.html`:

- не форматируйте его Prettier/Beautifier (внутри три base64-PDF одной строкой);
- не меняйте `CONSPECT_PDF_BASE64*` вручную — пересоздавайте строку тем же способом, каким она
  получена, либо правьте PDF и заново кодируйте (`base64 -w0 file.pdf`);
- после изменения контента перегенерируйте `docs/SOURCES.md`: `npm run links`.

## Что делать, если GitHub ругается на размер

`index.html` весит ≈2 МБ, лимит GitHub на файл — 100 МБ (commit'иться будет молча),
поэтому проблем быть не должно. Git LFS подключать **не нужно**: с LFS игра перестанет
запускаться двойным щелчком из клонированного репозитория у тех, у кого LFS не установлен.
