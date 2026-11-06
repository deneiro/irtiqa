# IrtiQa (repo IrtiQa-Tauri) — rules for this repo

Personal, local, non-commercial Mac app over Eldar's Obsidian vault. Read
`README.md` first. The product spec lives in the vault, not here:
`wiki/Business & career/Projects/IrtiQa-Tauri/Wiki/Спецификация v1 — одно приложение над vault (2026-09-11).md`.

## The one rule

**The vault is the only store.** The app keeps a cache it can throw away.
Anything the app persists is a markdown file in the vault. No localStorage
state beyond UI conveniences (vault path, language, open tab). No SQLite unless
it can be rebuilt from files at any time.

## Write boundary (mirrors the vault's `CLAUDE.md`, `## life/`)

The app writes:
- everything under `life/` (`days/`, `habits/`, `activities/`, `finance/`);
- on knowledge pages only what it owns: the frontmatter keys `read`, `applied`
  on `Resource/` pages and `learning`, `memorized` on sura pages, and the two
  last cells of a row on the 99 names page;
- `People/` pages in full (since 2026-11-02 all person pages live in
  `wiki/People/`): it creates, edits, renames and deletes them, and a rename or
  delete also edits the files that link to that person, `wiki/index.md` and
  `wiki/log.md` among them (`lib/renamePerson.ts`).

Beyond that the app never writes the body of a `wiki/` page, anything in `raw/`,
or the vault's `CLAUDE.md`. Since v2 (2026-10-11) the app is the display; since 2026-11-05 habit marks come from the bot's evening survey and «Главный» is a read-only dashboard (spec v3). Screens other than «Главный» and the theme pages still have input controls (Day, Habits, Quests, Finance, a theme's full screens `/theme/:name/:key`, People, Event, person and Resource pages); since spec v4 (2026-11-06) the theme page itself is read only and marks no habits. The Telegram bot in `bot/` is part of the app. It writes `life/days/` (habit
marks, meals, money, mood, stress, weight, sessions, the day's `## Задачи` — the
morning plan and the evening ticks — `## Сделано` and the `## Журнал` lines —
through `serializeDay`, never into a closed day), a line in an activity's journal, the day's «Встреча»
event (`/contact` only), an event folder with its photos under `life/events/`
(«📸 Воспоминание»: `event.md` as the app's own event form writes it, `photo-N.jpg`
beside it; `lib/memory.ts`), `last_contact`/`updated` on a person page
(`lib/contact.ts`, the same edit the Circle screen makes; a memory sets
`last_contact` to the day of the event and never moves it back) and a new person
page in `wiki/People/` («👤 Человек»: `personPage` in `lib/people.ts`, never the
keys the app and the owner fill in). Nothing else.
`src/lib/fs.ts` and `write_text` in `lib.rs` enforce the
coarse boundary; keep the fine one by hand.

## Stack

Tauri 2 + React 19 + TypeScript + Vite. Rust only for file I/O, the watcher and
running programs (`claude`; `open` for a tool's launch file). All parsing in the frontend (`src/lib/`).

## Working here

- One slice at a time (see README). Commit per slice. Do not stack features.
- No new screens or theme sections unless Eldar names one (freeze since
  2026-09-21, vault CLAUDE.md «Discipline»). Work goes into what exists.
  v2 menu is Главный · Темы (2026-11-02: «Посмотреть» left the menu, v1 routes still exist); «Главный» is a read-only dashboard in three tabs — Сегодня · Неделя · Месяц (spec v3 in the vault, 2026-11-05); its numbers and signals are pure functions in `src/lib/dashboard.ts`, tested with `npm test`. The theme pages (spec v4, 2026-11-06) show what an overview names — `## Цифры`, three columns, `sections:` — and nothing is named in code: the kinds of numbers and organs live in `src/lib/themeNumbers.ts`, `themeDays.ts`, `themeBoard.ts`, `themeOrgans.ts`, the overview format in `overview.ts`. The bot asks an evening survey (`eveningAskAt`, default 21:00) one question at a time — since 2026-11-05 every due habit too (prayer да · поздно · нет, others да · нет, text from the habit's `ask:` key), every open task of the day (да · нет) and four questions about the day into `## Журнал`; the morning summary is off (`morning`); after fajr it asks «что сегодня в планах?» (`plan`) and every message after it is one task in the day's `## Задачи` until «всё» or the evening survey; the bot only asks;
  nothing is deleted. Do not add input forms to the app: Claude is the input.
- The day is a calendar day since 2026-10-12; `dayToday()` still applies the
  maghrib rule to the files of 2026-09-22 … 2026-10-11 (`maghribDay`).
- UI language is Russian. The `en` dictionary in `src/lib/i18n.ts` is legacy
  from Second Brain and may be removed.
- IrtiQa (`~/Desktop/Projects/IrtiQa`) is a reference for the game screens,
  not a dependency. Port ideas and CSS, not the Zustand store.
- Numbers derived from days (streaks, XP, spending) are computed, never stored.
- `npx tsc --noEmit && npm test && npx vite build` must pass before a commit.

## Schema 4.1 of the vault (2026-11-02)

- `life/quests/` is `life/activities/` (`type: activity`, statuses `active | paused | done`,
  fields `goal:` and `cadence:`, one next step under `## Сейчас`). Code keeps the
  `Quest` names; `QUEST_DIR` points at `life/activities`; old statuses are still
  parsed for `life/archive/quests/`. `nowStep()` reads `## Сейчас`.
- The day's tasks are `## Задачи` in the day file, first in the body (`Day.tasks`,
  parsed and written by `parseDay`/`serializeDay`). There are no day-level goals
  files any more; «Главный» and the bot read the day file. `quests_closed:` is written
  only when non-empty.
- All person pages are in `wiki/People/`; `theme:` in frontmatter is the relationship.
  New people are created there.
- Projects are `Projects/Engliko` and `Projects/LazySMM`; the vault lives at
  `~/Desktop/personal-obsidian` (DEFAULT_ROOT). `wiki/index.md` is generated by the
  vault's own `scripts/vault-index.py`; `scripts/genindex.ts` here is legacy.
- The calendar column is «Деятельность». The vault's `CLAUDE.md` is the rule book.
