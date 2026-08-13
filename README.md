# ⚔️ IrtiQa — Life RPG

Your real life, played as an RPG. Every real action — a habit, a work session, a journal entry, paying off a debt — earns your character XP and Gold. Neglect costs HP. The only way to soften a consequence is to spend Gold you actually earned.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm test         # vitest suite for the game engine + store rules
```

The game is local-first: it always runs off the save in your browser, so it works with zero setup and no network. Cloud sync is **optional** and off until you configure it (see below) — when off, every sign-in / sync control hides itself and the app is purely local. When on, sign in (Settings → Account & cloud sync, or "Returning player?" on the start screen) to mirror your save to Supabase — every change auto-uploads a few seconds later, and signing in on any device restores your character. Manual export/import is always available in **Settings**.

## Deploy (Vercel + Supabase)

The app is a static Vite SPA. It deploys with **no backend at all** (local-first), or with cloud accounts once you set two env vars. Nothing in the code is hardcoded to a specific project — sync activates purely from env.

### 1. Provision the backend (enables accounts + cross-device sync)

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Run the migration in [`supabase/migrations/0001_saves.sql`](supabase/migrations/0001_saves.sql): Supabase dashboard → **SQL Editor** → paste & run. It creates the `saves` table, the `updated_at` trigger, and row-level-security policies so each user can only touch their own row. It's idempotent.
3. Grab **Project Settings → API**: the project **URL** and the **publishable (anon)** key. (Never use the `service_role`/secret key in client code.)

*Skip this whole step to ship local-first — the app builds and runs fine with the env vars unset.*

### 2. Deploy to Vercel

Import the repo at [vercel.com/new](https://vercel.com/new) (or run `npx vercel` from the project root). Vercel auto-detects Vite; [`vercel.json`](vercel.json) pins the build (`npm run build` → `dist/`), SPA rewrites, and asset caching.

Then, in **Vercel → Settings → Environment Variables**, add the two values from step 1 (leave unset for local-first):

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<your-project>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | your publishable/anon key |

Redeploy so the vars are baked into the client bundle (`VITE_*` vars are inlined at build time). Accounts + sync light up automatically — no code change.

### Local dev with sync

Copy [`.env.example`](.env.example) → `.env`, fill in the same two values, and `npm run dev`. `.env` is gitignored.

## What's inside

| System | How it works |
|---|---|
| **Character** | Level + XP (steady curve), HP 0–100, Gold, rank titles from Seeker → Legend. **Nothing gates on HP** — not payouts, not the chest, not priority quests, not the boss. It is a readout of the last rough stretch and nothing else; effort is worth the same at 3 HP as at 100 |
| **The Sigil** | The character as an emblem, drawn entirely from real state (`src/game/sigil.ts`): eight petals sized by attribute level so the asymmetry *is* your Wheel, overall size from character level, one ring per rank tier, inner facets every 5 levels, and a gold glow while a perfect-day streak runs. It cannot look earned unless it was. Shown large on the Profile, small in the sidebar, and exportable as a 1024px PNG |
| **7 classes** | Chosen at creation; each gives a permanent +10% XP boost to its life areas (e.g. Magician boosts Spirituality & Family). Changeable only via the Identity Scroll item |
| **8 attributes** | Health, Friends, Family, Money, Career, Spirituality, Development, Brightness — the eight sectors of the Wheel of Life from *Extreme Time Management* (Mrochkovskiy & Tolkachev, 2012), mapped 1:1. Every action is tagged, XP flows to both character and attributes, imbalance shows on the dashboard radar |
| **The Wheel** | A page per attribute (`/attributes/:key`): what the sector means and why it's on the wheel, sourced from the book, plus a library of ready-to-add habits and quests so "add a habit" never starts from a blank field. Each template carries its behaviour-design mechanism (Two-Minute Rule, Habit Stacking, Implementation Intention) and a citation |
| **Profile filtering** | Optionally set your radical profile in Settings (Ponomarenko's 7, the same vocabulary the Social hub uses for contacts). Templates then reorder to fit, and ones that reliably fail for your profile are hidden — a willpower-first habit is a good habit for an epileptoid and a trap without one. Unset means the full library, unfiltered |
| **Habits** | Good (do it) / bad (avoid it), daily/weekly/specific dates. Missing a day is detected **automatically** — but yesterday isn't judged until 9am, so you can still log it the next morning. Unlogged days cost a little HP; a confessed relapse costs a little more. Damage scales **down** with the streak you broke — a long run is credit that cushions the miss, not exposure that amplifies it |
| **Quests** | Time-tracked work: Start Session → live timer → Finish → "what did you do?" note → dated work log. Sessions earn nothing; one big XP/Gold payout on completion, scaled by hours actually logged. Single sessions cap at 4h so a forgotten timer can't mint XP |
| **Quick tasks** | Plain checkboxes for one-offs, small XP |
| **Journal** | Mood, stress, rotating reflection questions. Entries seal after 72h — only a Feather of Time reopens one, once |
| **The Chronicle** | Every Monday, last week written back to you as prose — the strongest thread named, the one that slipped, your own journal and session notes quoted, where the week's weight landed. Assembled entirely from logged data (`src/game/chronicle.ts`), no AI and no network. Every beat self-suppresses when the data is too thin to say anything true, and a week with nothing in it is reported as empty rather than narrated. The one surface that gives instead of asks |
| **Social Hub** | Contacts with groups/notes/birthdays, netted debts per person, events. All of it earns XP |
| **Finances** | Accounts, transactions, categories, auto-posting subscriptions, live net worth. Blowing a monthly category budget deals HP damage scaled to the overshoot |
| **Market** | Every item buyable **and** usable: potions, Streak Shield (auto-protects), Habit Pardon, Indulgence, Ghost Day, Feather of Time, Focus Unlock, Attribute Boost, Identity Scroll. Priced by what they save — a streak costs about a day of play (shield 30g, pardon 45g); HP is pocket change (potions 10/20/40g), because HP gates nothing |
| **Achievements** | 56 across 14 families, bronze/silver/gold/platinum, front-loaded so the early game showers you — each pays XP + Gold with a popup |
| **Themes** | Midnight (default), Parchment, Neon Grid, Sakura — bought with Gold, switchable anytime. Adding a theme = one CSS variable block in `src/styles.css` |
| **Juice** | XP/Gold toasts on every action, LEVEL UP / RANK UP / ACHIEVEMENT popup animations with spark bursts |

## Architecture

- **Vite + React + TypeScript**, single-page app
- **Zustand + Immer + persist** — one store (`src/store.ts`) holds all game state and rules; UI is a thin layer over it
- **Supabase cloud sync** (`src/lib/sync.ts`) — email/password auth; the whole save is one JSONB row per user in a `saves` table guarded by row-level security. Debounced push on change; on login the newer side wins (cloud if another device wrote since this one last synced, local otherwise). Game rules still run client-side — the cloud is a mirror, not a referee
- `src/game/engine.ts` — pure game math (leveling curves, damage formulas, payouts, date logic)
- `src/game/constants.ts` — classes, ranks, items, achievements, themes (data-driven; extend here)
- **Reconciliation** (`reconcile()` in the store) runs on load, on tab focus, and every minute: auto-fails missed habits for every unprocessed day, spends the Warden's weekly ward and then any Streak Shields/Indulgences/Ghost Days, and posts due subscriptions

## Design rules the code enforces

- **Integrity lives in what you earn, not in what gets taken away.** No reward without
  an action; no HP restoration except items bought with earned Gold. But nothing you
  earn is ever reduced or locked because of a bad stretch
- **HP is a readout, and that is the whole design.** It is the one number that moves
  down, so a rough fortnight stays visible instead of averaging away — but nothing
  reads it back. Any gate on HP is a punishment wearing a different hat, and framing
  it as a bonus above 75 rather than a penalty below 25 does not change how it lands
  on someone having a bad week. The bar diagnoses; it never charges
- **Prices track the stake, not the flavour.** A missed day costs a streak and a
  couple of HP. Only one of those is worth insuring, so the streak items sit near a
  day of play and the potions near nothing — a Streak Shield at 1.5 days to save two
  hit points is an item nobody would buy, which is worse than not shipping it
- **A bad day never makes the app worse to open.** Low HP costs nothing mechanically;
  a broken streak is cushioned by how long it ran; an unslain weekly boss just leaves
- **The Chronicle never invents.** Every sentence traces to logged data. A thin week
  says so rather than being padded into a story — a fabricated narrative would
  destroy the only thing the feature is for
- Missing a habit is recorded by the app, not confessed by the player — and it's
  reported as *missed*, never as *failed*
- Quest payouts are proportional to logged work — no partial credit, no dilution
- The past is sealed (journal locks) unless you pay
