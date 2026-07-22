# IrtiQa — What To Build

This is a brief for an AI coding agent (Fable 5 / Claude) to design and build from scratch. It describes **what the app is and how it should behave** — not how to build it. Pick your own architecture, stack, and structure. The only hard requirement: it has to actually work end to end, no dead-end buttons, no purchased items that can't be used, no rewards that silently don't pay out. Overall, I want to create a website first, then an application for mobile, but we're gonna focus on website first, that has everything and it's all connected. Finances, it's connected to a market, market connected to actually our, to my attribute finances. My quests are connected to each, like, attribute, and doing quests overall, it is like a personal development maybe. So, it has to be logically, everything is connected, nothing stands out from the whole platform. And also, I want you to make it that way so that in the beginning, when you authorize, you have to choose one of the seven characters, and each character will give you a boost. For example, if you choose Magician, Magician, for example, it may mean that like, okay, you have a 10% boost in XP for all quests related to, like, spiritual and family attributes, or like, something like that. So there are some kind of boosts of each class, so there has to be seven classes in the beginning, and you choose your class, and so on. And...

## The one-line idea

IrtiQa turns your real life into an RPG. Every real action you take — a habit, a task, a workout, a journal entry, paying off a debt — earns your character XP and Gold. Ignoring your responsibilities costs you HP. There are no cheat codes: the only legal way to soften a bad day is to spend Gold you actually earned on an in-game item.

## Who plays it

One player: the person running their own life through it. It's not a social app or a multiplayer game — it's a personal dashboard that happens to look and feel like a game.

## The character

- **Level and XP.** Every action gives XP. Leveling up should feel steady but require a bit more each time — not a flat grind, not exponential either.
- **HP (health bar).** Starts full. Goes down when you fail to do what you said you'd do (skip a habit, blow a budget). Doesn't go below zero — there's no "dying," just a bad state you have to climb out of.
- **Gold.** Earned from completing things. Spent in the shop (see below). This is the only currency.
- **Rank / Title.** A ladder of titles (something like Weak → Novice → Apprentice → ... → Legend) that levels roll up into every so often, so the player feels bigger milestones on top of individual level-ups.
- **Class.** At character creation, the player picks an identity (e.g. Warrior, Scholar, Mystic, Guardian, Merchant, Shadow-type archetypes) that reflects what part of life they care about most right now. This is mostly flavor/identity, not a hard mechanical restriction.

## The 8 life attributes

The player's life is broken into 8 areas, each leveling up independently as its own mini stat, the same way the main character level does:

1. Health
2. Friends
3. Family
4. Money
5. Career
6. Spirituality
7. Development (personal growth / learning)
8. Brightness (general joy / vibrance of life — a catch-all for things that don't fit elsewhere)

Every action in the app should be tagged to one or more of these 8, and the XP for that action should go into both the main character level and the specific attribute(s) it's tagged to. If a player is racking up Career XP but their Health attribute is stuck at level 1, that imbalance should be visible at a glance (this is the actual point of the whole app — surfacing which parts of life are being neglected).

## The modules (what the player actually does)

### 1. Habits
The daily discipline engine. The player defines habits — some **good** (things to do, like "read for 20 minutes"), some **bad** (things to avoid, like "no smoking"). Each habit has a frequency: every day, specific days of the week, or occasional/one-off dates.

- Checking in on a good habit: XP + a small amount of Gold, and the streak count goes up.
- Checking in on a bad habit (meaning "I successfully avoided it today"): a smaller XP reward, streak goes up.
- **Missing a habit is automatic, not optional.** If the player doesn't check in by end of day, the app should mark it failed on its own (no need for the player to manually confess) and deal HP damage — more damage the longer the streak that just broke, and worse damage for relapsing on a bad habit than for skipping a good one.
- Show streaks prominently (current and best) and some kind of visual history (a heatmap of the last couple months is a nice touch, not required).

### 2. Quests — redesigned as time-tracked work sessions (this is new, do not build the old hierarchy version)

- **Creating a quest:** the player writes what the quest is, and gives a rough estimate of how long they think it'll take to finish overall (a number of hours, or however that's best expressed — this estimate is just a reference point for the player, not a hard deadline).
- **Working a session:** on the quest's own screen, there's a **"Start Session"** button. Clicking it starts a timer, right there, running live while the player works.
- **Ending a session:** when the player is done working for now, they click **"Finish"**. The app stops the timer and immediately asks a short prompt: *"What did you do this session?"* — a brief free-text note. The player types something like "made the plan, outlined the structure" and submits.
- **The session gets logged** on the quest screen as a dated entry: date, how long that session ran, and the note the player wrote. E.g.: `July 5 — 3h 12m — "Made the plan, did the brainstorming."` Sessions stack up over time so the quest screen becomes a running work log — the player can scroll back and see exactly what got done, on which day, for how long.
- **A day/lifetime total** should be visible too — e.g. total hours worked on this quest so far, and how much was worked today specifically if the player did more than one session in a day.
- A player can start a new session on the same quest on a different day, as many times as needed, until the quest is done.
- **No XP or Gold for individual sessions.** Logging time and writing the note is just record-keeping — it earns nothing by itself.
- **The only reward is a single, large XP/Gold payout when the player marks the entire quest as finished.** That's it — one big reward at the very end, nothing along the way. This is intentional: the whole point is that the size of the payoff should match how big the quest actually was, not get chopped up and diluted across steps that may or may not have existed.
- A lightweight "quick task" option can still exist separately for simple one-off to-dos that don't need session tracking at all — just a plain checkbox that earns a small amount of XP when checked off. That's a different, simpler thing from a Quest and shouldn't be confused with it.

### 3. Journal
A daily reflection habit, separate from the Habits module because it's heavier: mood, a stress level, and a handful of reflection questions. Writing an entry gives a solid chunk of XP, mostly toward Spirituality/Development.

- **Old entries should lock after a few days** (72 hours felt right) — no editing the past to make yourself look better in hindsight. This is meant to be a real rule, not just a UI suggestion — if there's a way around the lock, it should cost Gold through the shop (see Feather of Time below), and that purchase should actually work.
- An archive to browse and search past entries.

### 4. Social Hub (personal CRM)
A place to track the people in the player's life — not a social network, just a private reference.

- Contact cards: name, groups (e.g. family, close friends, colleagues), personality notes, birthday, how to reach them.
- Debts: track money owed in either direction with any given contact, net it out per person (if you owe someone 100 and they owe you 20, show a clean net of "you owe 80").
- Logging a new contact, logging a debt, and settling a debt should each give a small XP reward — this module should feel like it counts toward progress, not just a spreadsheet bolted to the side.
- Events tied to contacts (birthdays, meetups, reminders).

### 5. Market (the in-game shop)
Where earned Gold gets spent. This is the pressure valve of the whole system — the *only* legal way to soften a consequence. Item ideas (from the last build, worth keeping):

- Health potions (small/medium/large) — restore HP.
- Streak Shield — protects a habit streak through one missed day.
- Habit Pardon — retroactively forgive one missed habit.
- Indulgence — ignore one bad-habit relapse today, no damage.
- Ghost Day — freeze everything for 24 hours (for real sick days / travel), no penalties accrue.
- Feather of Time — unlock one old journal entry for editing.
- Focus Unlock — let the player mark a second "priority quest" at once instead of just one.
- Attribute Boost — temporary XP multiplier for the next few actions.
- Identity Scroll — rename your character / change class.

**Every item that can be bought must also be usable.** Last build's biggest embarrassment: you could buy all twelve items, the Gold would leave your account, and then there was no way to actually activate a single one of them. Don't repeat that — build "buy" and "use" as one connected feature from day one, test that using each item actually does the thing it promises.

### 6. Finances
A simple personal-finance tracker layered with game consequences.

- Accounts (cash, bank, whatever), transactions (income/expense), categories, recurring subscriptions.
- Logging income gives a bit of XP toward Money.
- Logging an expense gives a bit of XP too, as long as it's within budget.
- The player can set a monthly budget limit per category. **Going over that limit should hurt** — HP damage that scales with how far over budget the player went (a small ding for barely over, a big hit for blowing it completely). This is meant to make overspending feel bad in the moment, the same way missing a habit does.
- Net worth should be visible and update automatically as accounts/transactions change.

### 7. Achievements
Achievements are the things that will keep the users motivated. So there has to be achievements for like three-tier achievements, which is bronze, silver, and, let's make it four, bronze, silver, and gold, and for each achievement gives also some kind of XP and some kind of gold. And achievements in the beginning must be a lot so that you can get easily a lot of achievements, like in games, in order to involve the user into process quickly, we have to make sure that he is interested, he sees a lot of achievements, not too many, but it has to be like in games in the beginning to get achievements are a lot easier than after that.

### 8. Dashboard (home screen)
The first thing the player sees. Should answer, at a glance: what's my status right now (level, HP, Gold, rank), what do I need to do today, and how balanced are my 8 attributes relative to each other (some kind of radar/wheel visual works well for this). Quick-action shortcuts for the most common things (log a habit, add a task, write in the journal) should live here too so the player isn't hunting through menus for daily-use actions.

## Visual feel

I want visual effect to be easily changeable. So, for example, if a person wants to buy a theme, like an anime-related theme, he can make it an anime-related theme. If he wants it like a basic theme, he can make it a basic theme. So, they are all practical, and the UI has to be easily changeable. And in future, right now we're gonna just add some, you know, like three, four themes based on popular things that can be interesting for users. But overall, we will add more and more in future. So, it's a UI, it has to be designed in a way that we can add a new theme for the UI and a person can change the theme anytime easily. So, like, also I want visual to be gamification. I want when XP, when you're done, when you click the habit done, when you're done the quests, there is an XP and coin reward. I want this a little animation, and whenever you level up, there is a pop-up animation to say like, okay, level up. And achievements, whenever you get an achievement, there is also pop-up animation of like, you get achievement, like in games. So, it should feel like a real game. In terms of visual, it has to give the user a dopamine of achieving something in a game, but we're actually achieving something in real life.

## The philosophy, in one paragraph

The whole point is: **real progress should feel exactly as satisfying as game progress, and real neglect should feel exactly as costly as failing in a game.** No participation trophies, no rewards for actions that didn't happen, no permanent softening of consequences except through Gold the player actually earned. If a feature can be "gamed" for free — checking something off without doing it, or accumulating rewards nothing is actually gating — that defeats the entire purpose of building this instead of just using a plain to-do list.

## What NOT to copy from last time

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
