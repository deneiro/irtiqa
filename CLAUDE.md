# IrtiQa-Tauri — rules for this repo

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
- everything under `life/` (`days/`, `habits/`, `quests/`, `finance/`);
- one `## [YYYY-MM-DD] day | …` line appended to `wiki/log.md` on day close;
- only these frontmatter keys on knowledge pages: `read`, `applied` on
  `Resource/` pages; `phone`, `telegram`, `whatsapp`, `instagram`, `email`,
  `birthday`, `last_contact` on `People/` pages.

The app never writes the body of a `wiki/` page, anything in `raw/`, or the
vault's `CLAUDE.md`. Since v2 (2026-10-11) the app is the display: the only
input left in it is the morning marking of yesterday on «Утро» (prayers with
`habits_late`, kinds `prayer | bad | good`; one-button habits — an untouched
good habit closes as failed, an untouched bad one as held, `impliedMarks` in
`lib/life.ts`) and the reading actions on a
Resource page; everything else is said to Claude. The Telegram bot in `bot/` is part of the app. It writes `life/days/` (habit
marks, meals, money, mood, stress, weight, sessions — through `serializeDay`,
never into a closed day), a line in a quest's journal, the day's «Встреча»
event, and `last_contact`/`updated` on a person page (`lib/contact.ts`, the
same edit the Circle screen makes). Nothing else.
`src/lib/fs.ts` and `write_text` in `lib.rs` enforce the
coarse boundary; keep the fine one by hand.

## Stack

Tauri 2 + React 19 + TypeScript + Vite. Rust only for file I/O, the watcher and
running `git` / `claude`. All parsing in the frontend (`src/lib/`).

## Working here

- One slice at a time (see README). Commit per slice. Do not stack features.
- No new screens or theme sections unless Eldar names one (freeze since
  2026-09-21, vault CLAUDE.md «Discipline»). Work goes into what exists.
  v2 menu is Утро · Темы · Посмотреть; v1 screens stay under «Посмотреть»,
  nothing is deleted. Do not add input forms to the app: Claude is the input.
- The day is a calendar day since 2026-10-12; `dayToday()` still applies the
  maghrib rule to the files of 2026-09-22 … 2026-10-11 (`maghribDay`).
- UI language is Russian. The `en` dictionary in `src/lib/i18n.ts` is legacy
  from Second Brain and may be removed.
- IrtiQa (`~/Desktop/Projects/IrtiQa`) is a reference for the game screens,
  not a dependency. Port ideas and CSS, not the Zustand store.
- Numbers derived from days (streaks, XP, spending) are computed, never stored.
- `npx tsc --noEmit && npx vite build` must pass before a commit.
