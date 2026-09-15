# Graph Report - .  (2026-09-15)

## Corpus Check
- Corpus is ~43,673 words - fits in a single context window. You may not need a graph.

## Summary
- 619 nodes · 1643 edges · 27 communities (22 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.86)
- Token cost: 0 input · 439,590 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Shell UI Components|App Shell UI Components]]
- [[_COMMUNITY_Day & Life Data Model|Day & Life Data Model]]
- [[_COMMUNITY_People & Resource Editing|People & Resource Editing]]
- [[_COMMUNITY_Tauri Capabilities & Permissions|Tauri Capabilities & Permissions]]
- [[_COMMUNITY_Project Rules & Build Config|Project Rules & Build Config]]
- [[_COMMUNITY_NPM Dependencies|NPM Dependencies]]
- [[_COMMUNITY_Filesystem Write Boundary|Filesystem Write Boundary]]
- [[_COMMUNITY_Claude Agent Runner|Claude Agent Runner]]
- [[_COMMUNITY_Vault Lint Script|Vault Lint Script]]
- [[_COMMUNITY_Day Overview & Profile|Day Overview & Profile]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Skills Tracking|Skills Tracking]]
- [[_COMMUNITY_Log & Vault Check|Log & Vault Check]]
- [[_COMMUNITY_Vault Path Utilities|Vault Path Utilities]]
- [[_COMMUNITY_Raw-to-Resource Relinker|Raw-to-Resource Relinker]]
- [[_COMMUNITY_Wiki Index Generator|Wiki Index Generator]]
- [[_COMMUNITY_Raw Triage Script|Raw Triage Script]]
- [[_COMMUNITY_Shared walk() Duplication|Shared walk() Duplication]]
- [[_COMMUNITY_Node TS Config|Node TS Config]]
- [[_COMMUNITY_Dead Link Checker|Dead Link Checker]]
- [[_COMMUNITY_Debug Launch Config|Debug Launch Config]]
- [[_COMMUNITY_Tauri Tech Stack|Tauri Tech Stack]]
- [[_COMMUNITY_Vault-Only Store Rule|Vault-Only Store Rule]]
- [[_COMMUNITY_App Entry Point|App Entry Point]]
- [[_COMMUNITY_Slice 0 Vault Shell|Slice 0: Vault Shell]]

## God Nodes (most connected - your core abstractions)
1. `useStore()` - 55 edges
2. `useT()` - 47 edges
3. `todayStr()` - 33 edges
4. `useVault()` - 30 edges
5. `String` - 20 edges
6. `PersonActions()` - 19 edges
7. `Page` - 17 edges
8. `pageUrl()` - 17 edges
9. `ThemePage()` - 17 edges
10. `THEMES` - 16 edges

## Surprising Connections (you probably didn't know these)
- `App write boundary` --rationale_for--> `write_text()`  [EXTRACTED]
  CLAUDE.md → src-tauri/src/lib.rs
- `Day file lifecycle & close process` --references--> `write_text()`  [INFERRED]
  README.md → src-tauri/src/lib.rs
- `Tauri 2 + React 19 + TS + Vite stack` --references--> `@tauri-apps/api dependency`  [INFERRED]
  CLAUDE.md → package.json
- `Launch instructions (npm install / tauri dev / vite)` --references--> `vaultDevServer() Vite plugin`  [EXTRACTED]
  README.md → vite.config.ts
- `Vault maintenance scripts overview` --references--> `check.ts vault audit script`  [EXTRACTED]
  README.md → scripts/check.ts

## Import Cycles
- 1-file cycle: `src-tauri/src/lib.rs -> src-tauri/src/lib.rs`

## Hyperedges (group relationships)
- **Write boundary enforced consistently across Rust, dev server, and frontend** — claude_write_boundary, src_lib_write_text, vite_config_write_middleware, src_lib_rename_file, lib_fs [INFERRED 0.85]
- **Duplicated directory-walk helper across scripts and dev server** — scripts_check_walk, scripts_deadlinks_walk, scripts_genindex_walk, scripts_lint_walk, scripts_rawtriage_walk, scripts_relink_walk, vite_config_walk [INFERRED 0.85]
- **Shared dev-server port 1420 contract across launch config, Vite, and Tauri** — claude_launch_vite_debug_config, vite_config_define_config, src_tauri_tauri_conf_build [INFERRED 0.75]
- **Vault entity edit-and-save pattern** — components_personactions_personactions, components_resourceactions_resourceactions, components_skillssection_skillssection, components_eventform_eventform [INFERRED 0.85]
- **Shared quest timer flow** — src_store_usestore, components_questrows_questrows, components_sidebar_sidebar [EXTRACTED 1.00]
- **App shell composition** — src_app_shell, components_sidebar_sidebar, components_back_back, components_commandpalette_commandpalette [EXTRACTED 1.00]
- **Duplicated str()/asString() unknown-to-date-string coercion helper** — lib_vault_asstring, lib_life_str, lib_events_str, lib_people_str, lib_skills_str [INFERRED 0.85]
- **MdFile -> parseFrontmatter -> typed struct parse pattern (habit/event/skill)** — lib_life_parsehabit, lib_events_parseevent, lib_skills_parseskill [INFERRED 0.85]
- **Claude panel run-streaming pipeline (startRun/addRun/patchRun/inTauri)** — lib_claude_startrun, lib_clauderuns_addrun, lib_clauderuns_patchrun, lib_native_intauri [INFERRED 0.85]
- **Feed aggregates activity from Day, Habits, Quests, Finance and Claude log** — pages_feed_feedpage, pages_day_daypage, pages_habits_habitspage, pages_quests_questspage, pages_finance_financepage, pages_claude_claudepage [INFERRED 0.85]
- **ThemePage composes sections from Habits, Quests, Finance, Event and People domains** — pages_theme_themepage, pages_habits_habitspage, pages_quests_questspage, pages_finance_financepage, pages_event_eventpage, pages_people_peoplepage [INFERRED 0.85]
- **XP/leveling computed in Day and surfaced across Trends, Wheel and Theme** — pages_day_daypage, pages_trends_trendspage, pages_wheel_wheelpage, pages_theme_themepage [INFERRED 0.85]

## Communities (27 total, 5 thin omitted)

### Community 0 - "App Shell UI Components"
Cohesion: 0.07
Nodes (77): Back(), ChartTip(), PageItem(), PageList(), Stat(), TagChips(), CommandPalette(), EventForm() (+69 more)

### Community 1 - "Day & Life Data Model"
Cohesion: 0.05
Nodes (75): addDays(), formatDayTitle(), plural(), toDateStr(), weekdayIndex(), WEEKDAYS_EN, WEEKDAYS_RU, parseEvent() (+67 more)

### Community 2 - "People & Resource Editing"
Cohesion: 0.07
Nodes (49): App write boundary (project CLAUDE.md, ## life/), PersonActions(), Mode, ResourceActions(), eventDir(), eventsFor(), eventUrl(), personName() (+41 more)

### Community 3 - "Tauri Capabilities & Permissions"
Cohesion: 0.08
Nodes (57): AppHandle, description, identifier, permissions, $schema, windows, Command, DirEntry (+49 more)

### Community 4 - "Project Rules & Build Config"
Cohesion: 0.06
Nodes (36): CLAUDE.md repo rules (whole file), Vite Debug Launch Configuration, Working-here development rules, npm run build script (tsc && vite build), npm run dev script (vite), npm run tauri script, README.md project overview (whole file), IrtiQa reference app (~/Desktop/Projects/IrtiQa) (+28 more)

### Community 5 - "NPM Dependencies"
Cohesion: 0.06
Nodes (33): dependencies, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, @fontsource-variable/literata, js-yaml, minisearch, react, react-dom (+25 more)

### Community 6 - "Filesystem Write Boundary"
Cohesion: 0.11
Nodes (24): App write boundary, Markdown(), LifeEvent, assertWritable(), CmdResult, deleteFile(), renameFile(), runCmd() (+16 more)

### Community 7 - "Claude Agent Runner"
Cohesion: 0.13
Nodes (22): aborters, ALLOWED_TOOLS, buildPrompt(), cancelRun(), claudeArgs(), parseLine(), startRun(), TOOL_RU (+14 more)

### Community 8 - "Vault Lint Script"
Cohesion: 0.08
Nodes (22): byFolder, byTitle, citedRaw, deadCount, dirs, dupTitles, files, legacy (+14 more)

### Community 9 - "Day Overview & Profile"
Cohesion: 0.14
Nodes (13): isLateMeal(), DEFAULT_SECTIONS, OverviewSection, RE, SectionKey, sectionSuffix(), splitSections(), themeState (+5 more)

### Community 10 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 11 - "Skills Tracking"
Cohesion: 0.27
Nodes (11): SkillsSection(), confirmAction(), daysSincePractice(), isDrifting(), LEVELS, serializeSkill(), Skill, SKILL_STATUS (+3 more)

### Community 12 - "Log & Vault Check"
Cohesion: 0.16
Nodes (11): en, FAMILY_COLORS, opFamily(), LogEntry, files, check.ts vault audit script, pages, rawFiles (+3 more)

### Community 13 - "Vault Path Utilities"
Cohesion: 0.23
Nodes (11): THEME_BY_NAME, Scan, asString(), buildPage(), daysSince(), relativeDate(), sourceTarget(), stripLinkTarget() (+3 more)

### Community 14 - "Raw-to-Resource Relinker"
Cohesion: 0.18
Nodes (10): APPLY, candidates, cited, Match, matches, norm(), rawRels, tokens() (+2 more)

### Community 15 - "Wiki Index Generator"
Cohesion: 0.22
Nodes (9): files, link(), out, people, section(), text, today, v (+1 more)

### Community 16 - "Raw Triage Script"
Cohesion: 0.20
Nodes (8): byFolder, cited, pageTitles, rawFiles, STOP, uncited, v, wikiFiles

### Community 17 - "Shared walk() Duplication"
Cohesion: 0.22
Nodes (9): Vault maintenance scripts overview, deadlinks.ts dead-link report script, walk(), genindex.ts wiki/index.md generator, walk(), rawtriage.ts uncited raw/ triage script, walk(), relink.ts raw-to-resource auto-linker (+1 more)

### Community 18 - "Node TS Config"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 19 - "Dead Link Checker"
Cohesion: 0.29
Nodes (6): parseLog(), buildVault(), byTarget, files, sorted, v

## Knowledge Gaps
- **183 isolated node(s):** `version`, `configurations`, `name`, `private`, `version` (+178 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Day file lifecycle & close process` connect `Tauri Capabilities & Permissions` to `Day & Life Data Model`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `Working-here development rules` connect `Project Rules & Build Config` to `App Shell UI Components`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `build` connect `Project Rules & Build Config` to `Tauri Capabilities & Permissions`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **What connects `version`, `configurations`, `name` to the rest of the system?**
  _185 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06548638873024938 - nodes in this community are weakly interconnected._
- **Should `Day & Life Data Model` be split into smaller, more focused modules?**
  _Cohesion score 0.05399625768511093 - nodes in this community are weakly interconnected._
- **Should `People & Resource Editing` be split into smaller, more focused modules?**
  _Cohesion score 0.06682692307692308 - nodes in this community are weakly interconnected._