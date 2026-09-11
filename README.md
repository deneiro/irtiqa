# IrtiQa-Tauri

Личное локальное приложение над vault `personal-obsidian`. Некоммерческое,
только Mac. Рабочее имя по папке; продукт ещё не назван.

У приложения **нет своей базы**. Всё состояние живёт в markdown-файлах vault,
в зоне `life/` (дни, привычки, квесты, финансы). Приложение читает vault с
диска, пишет в него, и подхватывает изменения, сделанные Claude Code или
Obsidian. Claude Code остаётся единственным LLM и запускается из приложения
как внешний процесс. Спецификация:
`wiki/Business & career/Projects/IrtiQa-Tauri/Wiki/Спецификация v1 — одно приложение над vault (2026-09-11).md`
в vault.

## Откуда что

- Оболочка, Rust-слой (`src-tauri/`), парсер vault, поиск, рендер страниц,
  графики, скрипты — из Second Brain (read-only viewer, который это приложение
  заменяет).
- Игровой слой (день, привычки, квесты, финансы, колесо) — переносится из
  IrtiQa по срезам. Референс: `~/Desktop/Projects/IrtiQa`. История IrtiQa в
  этом репо сохранена: коммит `296e48f` — последнее состояние перед перестройкой.

## Запуск

```bash
npm install
npm run tauri dev        # окно, live reload
npm run tauri build      # .app + .dmg в src-tauri/target/release/bundle/
```

Только UI, без Rust:

```bash
npx vite                 # http://localhost:1420
```

В этом режиме Vite-middleware `/__vault` читает vault, `/__vault/write` пишет.
`git` и `claude` из браузера недоступны — только из окна Tauri.

## Rust-команды (`src-tauri/src/lib.rs`)

- `scan_vault(root)` — все `.md` под `wiki/` и `life/`, список `raw/`, `log.md`, `CLAUDE.md`.
- `read_text(root, rel)`, `write_text(root, rel, content)` — внутри vault, атомарная запись, `raw/` и `CLAUDE.md` закрыты.
- `run_cmd(root, program, args)` — `git`, `claude -p` в папке vault.
- `watch_vault(root)` — событие `vault-changed` на любое изменение `.md` под `wiki/` или `life/`.

## Как устроен день

- `life/days/YYYY-MM-DD.md` пишется через 600 мс после любого изменения на экране. Внешние правки файла (Claude, Obsidian) подхватываются, если в приложении нет несохранённых изменений.
- «Закрыть день»: неотмеченные привычки → `failed`, `closed: true`, транзакции дня применяются к `life/finance/accounts.md`, строка `## [дата] day | …` дописывается в `wiki/log.md`, затем `git add` + `git commit -m "day <дата>"` в vault. В браузерном режиме всё то же без коммита.
- Стрики и XP считаются из файлов дней, не хранятся. Числа XP в `XP` внутри `src/lib/life.ts`.
- Плохая привычка (`kind: bad`): ✓ означает «удержался».

## Скрипты над vault

`scripts/` — lint, dead links, raw triage, relink, `genindex.ts` (генерирует
`wiki/index.md`). Запуск: `npx tsx scripts/<name>.ts "<путь к vault>"`.

## Срезы

0. ✅ Оболочка над vault: темы, страницы, поиск, watcher, запись, `life/` в скане.
1. ✅ День: экран (`src/pages/Day.tsx`), модель `life/` (`src/lib/life.ts`), закрытие с коммитом, автозакрытие незакрытых прошлых дней после 09:00. Быстрое добавление привычки прямо на экране дня; полный CRUD привычек — срез 2.
2. Привычки и квесты.
3. Финансы.
4. Vault: `read`, `applied`, привычка из Resource-страницы.
5. Люди.
6. Панель Claude.
7. Колесо и тренды.
