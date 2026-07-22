# ⚔️ IrtiQa — Life RPG

Your real life, played as an RPG. Every real action — a habit, a work session, a journal entry, paying off a debt — earns your character XP and Gold. Neglect costs HP. The only way to soften a consequence is to spend Gold you actually earned.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm test         # vitest suite for the game engine + store rules
```

The game is local-first: it always runs off the save in your browser, so it works with zero setup and no network. Optionally, sign in (Settings → Account & cloud sync, or "Returning player?" on the start screen) to mirror your save to Supabase — every change auto-uploads a few seconds later, and signing in on any device restores your character. Manual export/import is still available in **Settings**.

## What's inside

| System | How it works |
|---|---|
| **Character** | Level + XP (steady curve), HP 0–100, Gold, rank titles from Weak → Legend. Low HP has teeth: at ≤25 HP XP gains drop 25% ("Weakened"); at 0 HP they're halved and priority quests lock ("Exhausted") |
| **7 classes** | Chosen at creation; each gives a permanent +10% XP boost to its life areas (e.g. Magician boosts Spirituality & Family). Changeable only via the Identity Scroll item |
| **8 attributes** | Health, Friends, Family, Money, Career, Spirituality, Development, Brightness — every action is tagged, XP flows to both character and attributes, imbalance shows on the dashboard radar |
| **Habits** | Good (do it) / bad (avoid it), daily/weekly/specific dates. Missing a day is detected **automatically** — but yesterday isn't judged until 9am, so you can still log it the next morning. Unlogged days take the lighter miss damage; a confessed relapse takes the heavier hit. Damage scales with the streak you broke |
| **Quests** | Time-tracked work: Start Session → live timer → Finish → "what did you do?" note → dated work log. Sessions earn nothing; one big XP/Gold payout on completion, scaled by hours actually logged. Single sessions cap at 4h so a forgotten timer can't mint XP |
| **Quick tasks** | Plain checkboxes for one-offs, small XP |
| **Journal** | Mood, stress, rotating reflection questions. Entries seal after 72h — only a Feather of Time reopens one, once |
| **Social Hub** | Contacts with groups/notes/birthdays, netted debts per person, events. All of it earns XP |
| **Finances** | Accounts, transactions, categories, auto-posting subscriptions, live net worth. Blowing a monthly category budget deals HP damage scaled to the overshoot |
| **Market** | 14 items, every one buyable **and** usable: potions, Streak Shield (auto-protects), Habit Pardon, Indulgence, Ghost Day, Feather of Time, Focus Unlock, Attribute Boost, Identity Scroll, and 3 purchasable UI themes |
| **Achievements** | 56 across 14 families, bronze/silver/gold/platinum, front-loaded so the early game showers you — each pays XP + Gold with a popup |
| **Themes** | Midnight (default), Parchment, Neon Grid, Sakura — bought with Gold, switchable anytime. Adding a theme = one CSS variable block in `src/styles.css` |
| **Juice** | XP/Gold toasts on every action, LEVEL UP / RANK UP / ACHIEVEMENT popup animations with spark bursts |

## Architecture

- **Vite + React + TypeScript**, single-page app
- **Zustand + Immer + persist** — one store (`src/store.ts`) holds all game state and rules; UI is a thin layer over it
- **Supabase cloud sync** (`src/lib/sync.ts`) — email/password auth; the whole save is one JSONB row per user in a `saves` table guarded by row-level security. Debounced push on change; on login the newer side wins (cloud if another device wrote since this one last synced, local otherwise). Game rules still run client-side — the cloud is a mirror, not a referee
- `src/game/engine.ts` — pure game math (leveling curves, damage formulas, payouts, date logic)
- `src/game/constants.ts` — classes, ranks, items, achievements, themes (data-driven; extend here)
- **Reconciliation** (`reconcile()` in the store) runs on load, on tab focus, and every minute: auto-fails missed habits for every unprocessed day, consumes Streak Shields/Indulgences/Ghost Days, and posts due subscriptions

## Design rules the code enforces

- No reward without an action; no HP restoration except items bought with earned Gold
- Missing a habit is recorded by the app, not confessed by the player
- Quest payouts are proportional to logged work — no partial credit, no dilution
- The past is sealed (journal locks) unless you pay
