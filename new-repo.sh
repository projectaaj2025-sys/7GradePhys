#!/usr/bin/env bash
# new-repo.sh — подготовить и отправить этот репозиторий на GitHub.
#
# Делает: проверки → git init → первый коммит → (опционально) remote + push.
# Ничего не отправляет без явного подтверждения и не создаёт репозиторий сам:
# сначала его нужно завести на GitHub (кнопка New repository или `gh repo create`).
#
#   ./scripts/new-repo.sh                     # только проверки + init + коммит
#   ./scripts/new-repo.sh git@github.com:me/physics-quest.git
#   BRANCH=master ./scripts/new-repo.sh <url>
#
set -euo pipefail
cd "$(dirname "$0")/.."

REMOTE="${1:-}"
BRANCH="${BRANCH:-main}"
NODE_OK="$(node -v 2>/dev/null || true)"

echo "── 1/4  окружение"
if [ -z "$NODE_OK" ]; then
  echo "⚠️  node не найден — пропускаю проверки. Рекомендую всё же прогнать 'npm run check'."
else
  echo "   node $NODE_OK"
  echo "── 2/4  проверки целостности"
  node scripts/check.mjs
  node scripts/extract-pdfs.mjs
  node scripts/list-links.mjs
fi

if [ -d .git ]; then
  echo "── 3/4  .git уже есть — инициализацию пропускаю"
else
  echo "── 3/4  git init (ветка $BRANCH)"
  git init -b "$BRANCH" >/dev/null
fi

git add -A
if git diff --cached --quiet; then
  echo "   нечего коммитить (рабочее дерево совпадает с индексом)"
else
  git -c user.name="${GIT_NAME:-$(git config user.name 2>/dev/null || echo '')}" \
      -c user.email="${GIT_EMAIL:-$(git config user.email 2>/dev/null || echo '')}" \
      commit -q -F - <<'MSG'
feat: Физика-Квест: Энергетический Щит — игра по физике 7 класса

Игра: 50 уровней (техника безопасности, §1–§39, 10 лабораторных),
249 заданий 7 типов, переводы RU/EN/KK, режим учителя, рекорды,
сенсорное управление, 3 PDF-конспекта встроены в файл.

Репозиторий: один index.html без сборки и зависимостей + скрипты
проверок, документация, CI и деплой на GitHub Pages.

Лицензия: CC BY-NC-SA 4.0
MSG
  echo "   коммит готов: $(git rev-parse --short HEAD)"
fi

if [ -z "$REMOTE" ]; then
  echo "── 4/4  удалённый репозиторий не указан. Дальше вручную:"
  echo "      git remote add origin <url> && git push -u origin $BRANCH"
  echo "      Settings → Pages → Source: GitHub Actions  (чтобы игра появилась по ссылке)"
  exit 0
fi

echo "── 4/4  push в $REMOTE"
git remote get-url origin >/dev/null 2>&1 && git remote set-url origin "$REMOTE" || git remote add origin "$REMOTE"
git push -u origin "$BRANCH"
echo
echo "Готово. Через 1–2 минуты: https://github.com/<owner>/<repo>/actions — дождитесь зелёного"
echo "pages.yml, затем игра будет по адресу https://<owner>.github.io/<repo>/"
