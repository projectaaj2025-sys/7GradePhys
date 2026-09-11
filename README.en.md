# 🚀 Physics Quest: Energy Shield — English summary

> Полная версия — в [README.md](README.md). This file is the short English version of the same repository.

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey)](LICENSE)
[![single file, 0 dependencies](https://img.shields.io/badge/single%20file-0%20dependencies-brightgreen)](index.html)
[![works offline](https://img.shields.io/badge/works-offline-blue)](#run-it)

An educational RPG for 7th-grade physics (Kazakh school textbook “Физика 7”, Zakirova et al.).
Asteroids are falling on the city; the player destroys them by answering physics questions.
Shield energy grows with every correct answer, so the game is literally “grades as hit points”.

Everything — markup, styles, content and logic — is in a **single `index.html`** (~2 MB):
no build step, no npm dependencies, no CDN, works from `file://`. You can hand the file to a class
on a USB stick and it still runs.

## What's inside

| | |
|---|---|
| Levels | **50** — 1 lab-safety level, 39 per textbook section (§1–§39), 10 lab works |
| Tasks | **249** in four banks, **7 types** (numeric, single choice, multi-select, true/false, short answer, fill in the blanks, matching), 3 difficulty tiers |
| Languages | **3** — Russian, English, Kazakh; switchable in the menu (368 UI strings per language) |
| Theory | a theory block before every level: textbook extract + conspect (51 entries) + 29 home experiments |
| PDF | 3 conspect files, **69 pages each** (RU/EN/KK), embedded in the file and downloadable from the UI; also extracted into `assets/pdf/` |
| RPG layer | pilot profile, 8 rocket skins, records, per-level stats, pause, touch joystick |
| Teacher mode | author own tasks and lessons, view class statistics |
| Storage | `localStorage`, 6 `physicsquest_*` keys — nothing is sent anywhere |

Note: this is the **“all unlocked”** build — `const isUnlocked = true`, so all 50 levels are playable
in any order (progress and records are still tracked).

## Run it

```bash
# 1) no tooling: open index.html in a browser (double-click), it works offline

# 2) local server (Node.js 18+)
npm start                # http://localhost:8080

# 3) published link, if GitHub Pages is enabled (see docs/SETUP-GITHUB.md)
#    https://<username>.github.io/physics-quest/
```

Controls: `WASD` / arrows (works with Russian and Kazakh keyboard layouts too), `P` = pause,
`Enter` submits an answer in the input field. On phones: on-screen D-pad.

## Dev scripts

No install needed — the scripts run on plain Node.js 18+.

```bash
npm run check      # integrity of index.html: compiles AND executes every inline <script> in a
                   # sandbox, checks task translations, level↔topic references, embedded PDFs
npm run stats      # what is currently in the file: levels, task banks, types, difficulties
npm run schema     # field schema per task type — the shape the engine expects
npm run pdfs       # unpack the 3 conspect PDFs into assets/pdf/
npm run links      # regenerate docs/SOURCES.md (all outbound links in the game)
npm run smoke      # boots the game in jsdom and clicks through menu → levels → pause → language
npm run verify     # check + smoke + pdfs + links in one go
```

`scripts/check.mjs` is the project's test suite in the practical sense: since the game is one
monolithic HTML file, this is what stops a stray brace, an unbalanced `</div>`, a task missing its
Kazakh translation or a corrupted base64 PDF from reaching `main`. GitHub Actions runs it on every
push and PR (`.github/workflows/ci.yml`).

## Repository layout

```
index.html            the game, byte-identical to the original build
LICENSE / NOTICE      CC BY-NC-SA 4.0 + what you may/may not do
package.json          dev scripts only, no dependencies
assets/logo.svg       repository emblem
assets/pdf/           conspects extracted from the base64 blobs
docs/SETUP-GITHUB.md  publishing to GitHub: commands, Pages, what to fix first
docs/DEPLOY.md        Pages / Netlify / Vercel / serving from a school PC
docs/EDITING.md       how to edit a monolith without breaking it
docs/CONTENT.md       data structures: adding a task, a level, a translation
docs/CREDITS.md       textbook, PhET, videos, licensing
docs/SOURCES.md       generated list of all external links in the game
scripts/*.mjs         check, stats, extract-pdfs, list-links, serve, smoke
scripts/new-repo.sh   git init + first commit (+ push if you pass a remote)
.github/              CI, Pages deploy, issue and PR templates
```

## Verified before publishing

- `npm run check` → `ИТОГ: OK`: 5 inline `<script>` blocks compile and execute without throwing;
  249 tasks all carry `ru`/`en`/`kk`; 50 levels resolve to existing topics; 3 embedded PDFs intact
  (`%PDF-` … `%%EOF`, 69 pages each).
- `npm run smoke` (jsdom): the game boots, the menu renders, the level select builds exactly 50 cards,
  a level starts, canvas and HUD mount, `P` pauses and resumes, switching to Kazakh keeps the UI intact —
  no JS errors during the run.
- The checker was validated against deliberately broken copies of the file: unbalanced `<div>`,
  a syntax error in an inline script and a task with a missing translation were all caught.

## License

[CC BY-NC-SA 4.0](LICENSE): copy and adapt freely for teaching with attribution, non-commercial
only, derivatives under the same license. PhET simulations, the textbook itself and the embedded
video links remain under their own rights — see [NOTICE](NOTICE) and [docs/CREDITS.md](docs/CREDITS.md).
