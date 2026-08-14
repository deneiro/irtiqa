import { useMemo, useState } from 'react';
import { ARCHETYPES, ATTRIBUTES, ATTR_KEYS } from '../game/constants';
import {
  HABIT_TEMPLATES,
  QUEST_TEMPLATES,
  recommendedFor,
  type HabitTemplate,
  type QuestTemplate,
  type TemplateEffort,
} from '../game/templates';
import type { AttributeKey, PersonalityArchetype } from '../game/types';
import { t as tr, useT } from '../i18n';
import { spawnVFXAt } from '../lib/vfx';
import { useGame } from '../store';
import { Icon } from './Icon';

/**
 * The starter library, made findable.
 *
 * The hardest part of a habit tracker is the blank field: "+ New habit" assumes
 * you already know which habit. This app has 40-odd curated, same-day-actionable
 * templates — and they were reachable only via The Wheel → a sector page → scroll,
 * which meant the empty Habits page said "No habits yet" and pointed nowhere.
 *
 * One browser, three call sites: the Day One picker during onboarding, the
 * "+ New habit / quest" modals, and each sector page.
 */

// `t` is this file's name for a template, so the translator comes in as `tr`.
const effortLabel = (e: TemplateEffort) => tr(`tpl.effort.${e}`);

const EFFORT_ORDER: TemplateEffort[] = ['micro', 'moderate', 'demanding'];

export type AnyTemplate = HabitTemplate | QuestTemplate;

export const isHabitTemplate = (t: AnyTemplate): t is HabitTemplate => 'kind' in t;
export const templateTitle = (t: AnyTemplate) => (isHabitTemplate(t) ? t.name : t.title);

/**
 * Adding a template, in one place.
 *
 * The sector page and the Library both end in the same offer — "here is a habit,
 * take it" — and the rules for taking one (steps ride along in the quest
 * description, a burst of VFX at the cursor, already-added matched by name) have
 * to be identical in both, or the same card behaves differently depending on
 * which page you found it on.
 */
export function useTemplateAdders() {
  const addHabit = useGame(s => s.addHabit);
  const addQuest = useGame(s => s.addQuest);
  const habits = useGame(s => s.habits);
  const quests = useGame(s => s.quests);

  // Matched by name, not id: the library is a starting point, so a habit the
  // player has since renamed correctly reads as not-yet-added.
  const existingHabits = new Set(habits.filter(h => !h.archived).map(h => h.name));
  const existingQuests = new Set(quests.filter(q => !q.completedAt).map(q => q.title));

  const addHabitTemplate = (t: AnyTemplate, e: React.MouseEvent) => {
    if (!isHabitTemplate(t)) return;
    addHabit({
      name: t.name,
      kind: t.kind,
      freq: t.freq,
      attrs: t.attrs,
      weekdays: t.weekdays ?? [],
      dates: [],
    });
    spawnVFXAt(e, 'item', 1, t.name);
  };

  const addQuestTemplate = (t: AnyTemplate, e: React.MouseEvent) => {
    if (isHabitTemplate(t)) return;
    addQuest({
      title: t.title,
      // The steps ride along in the description: a quest has no step model of its own,
      // and losing the template's plan would leave the player with only a title.
      description: `${t.description}\n\n${t.steps.map(x => `· ${x}`).join('\n')}`,
      targetDuration: t.targetDuration,
      attrs: t.attrs,
    });
    spawnVFXAt(e, 'item', 1, t.title);
  };

  return { addHabitTemplate, addQuestTemplate, existingHabits, existingQuests };
}

/** One template, as a card. Selection is either a checkbox (Day One) or a button (library). */
export function TemplateCard({
  t,
  mode,
  selected,
  added,
  onPick,
}: {
  t: AnyTemplate;
  mode: 'select' | 'add';
  selected?: boolean;
  added?: boolean;
  onPick: (e: React.MouseEvent) => void;
}) {
  const habit = isHabitTemplate(t) ? t : null;
  const quest = isHabitTemplate(t) ? null : (t as QuestTemplate);
  const title = templateTitle(t);
  const disabled = !!added;

  return (
    <article
      className={`card tpl-card ${added ? 'tpl-added' : ''} ${selected ? 'tpl-selected' : ''}`}
      // The whole card is the hit target in select mode — 40 cards each needing a
      // precise checkbox tap is a bad phone experience.
      onClick={mode === 'select' && !disabled ? onPick : undefined}
      role={mode === 'select' ? 'checkbox' : undefined}
      aria-checked={mode === 'select' ? !!selected : undefined}
      tabIndex={mode === 'select' && !disabled ? 0 : undefined}
      onKeyDown={
        mode === 'select' && !disabled
          ? e => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onPick(e as unknown as React.MouseEvent);
              }
            }
          : undefined
      }
    >
      <div className="tpl-head">
        {habit && <span className={`habit-kind ${habit.kind}`} />}
        <h3 className="tpl-name">{title}</h3>
        <span className={`tpl-effort tpl-effort-${t.effort}`}>{effortLabel(t.effort)}</span>
      </div>

      <p className="tpl-why">{habit ? habit.why : quest!.description}</p>

      {habit?.stack && <p className="tpl-stack">“{habit.stack}”</p>}

      {quest && (
        <ol className="tpl-steps">
          {quest.steps.map(step => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}

      <p className="tpl-attrs">
        {t.attrs.map(a => (
          <span key={a} className="tag tag-icon" title={ATTRIBUTES[a].label} style={{ ['--attr-color' as string]: ATTRIBUTES[a].color }}>
            <Icon name={a} size={12} /> {ATTRIBUTES[a].label}
          </span>
        ))}
      </p>

      <div className="tpl-foot">
        {/* The mechanism is the teachable part and stays visible. The book citation
            moved to a tooltip: a library where every card wears a source line reads
            as a book summary with checkboxes, which is not what this is for. */}
        <span className="tpl-technique" title={t.source}>
          <Icon name="target" size={12} /> {habit ? habit.technique : tr('tpl.target', { d: quest!.targetDuration })}
        </span>
        {added ? (
          <span className="tpl-added-label"><Icon name="check" size={13} /> {tr('tpl.added')}</span>
        ) : mode === 'select' ? (
          <span className={`tpl-tick ${selected ? 'on' : ''}`} aria-hidden="true">
            {selected ? <Icon name="check" size={14} /> : null}
          </span>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={onPick}>
            <Icon name="plus" size={13} /> {tr('common.add')}
          </button>
        )}
      </div>
    </article>
  );
}

/**
 * Search + sector filter over the library.
 *
 * `focusAttrs` floats the sectors the player is weakest in to the top without
 * hiding the rest — on Day One that means the two sectors their own Wheel audit
 * just flagged, so the first thing they see is aimed at what they actually said
 * was thin.
 */
export function TemplateBrowser({
  kind,
  focusAttrs,
  profile,
  mode,
  selectedIds,
  addedTitles,
  onPick,
  emptyHint,
  limit,
}: {
  kind: 'habit' | 'quest';
  focusAttrs?: AttributeKey[];
  profile?: PersonalityArchetype[];
  mode: 'select' | 'add';
  selectedIds?: string[];
  addedTitles?: Set<string>;
  onPick: (t: AnyTemplate, e: React.MouseEvent) => void;
  emptyHint?: string;
  /** Cap the grid to the best N. Used on the last onboarding screen, where forty
   *  cards is a decision-making tax at the moment the player wants to be done. */
  limit?: number;
}) {
  useT(); // re-render this subtree when the language changes
  const [search, setSearch] = useState('');
  const [attrFilter, setAttrFilter] = useState<AttributeKey | null>(null);
  const [effortFilter, setEffortFilter] = useState<TemplateEffort | null>(null);
  const [showAll, setShowAll] = useState(false);

  const pool: AnyTemplate[] = kind === 'habit' ? HABIT_TEMPLATES : QUEST_TEMPLATES;

  const list = useMemo(() => {
    let out = [...pool];
    if (attrFilter) out = out.filter(t => t.attrs.includes(attrFilter));
    if (effortFilter) out = out.filter(t => t.effort === effortFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(t => {
        const body = isHabitTemplate(t) ? `${t.name} ${t.why} ${t.technique}` : `${t.title} ${t.description}`;
        return body.toLowerCase().includes(q);
      });
    }
    // Profile fit reorders and drops known-bad fits, unless the player asks for everything.
    if (profile?.length && !showAll) out = recommendedFor(out, profile);
    // Focus sectors float up, but only when the player hasn't chosen a filter themselves.
    if (focusAttrs?.length && !attrFilter && !q) {
      const score = (t: AnyTemplate) => (t.attrs.some(a => focusAttrs.includes(a)) ? 0 : 1);
      out = [...out].sort((a, b) => score(a) - score(b));
    }
    // The cap applies after ranking, so a limited grid still shows the best fits
    // — and it lifts the moment the player narrows things down themselves.
    if (limit && !attrFilter && !effortFilter && !q) out = out.slice(0, limit);
    return out;
  }, [pool, attrFilter, effortFilter, search, profile, showAll, focusAttrs, limit]);

  const hiddenByProfile = profile?.length && !showAll ? pool.length - recommendedFor([...pool], profile).length : 0;

  return (
    <div className="tpl-browser">
      <div className="tpl-filters">
        <label className="tpl-search">
          <Icon name="search" size={14} />
          <input
            className="input input-sm"
            placeholder={kind === 'habit' ? tr('tpl.searchHabits') : tr('tpl.searchQuests')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>
        <div className="tpl-chip-row">
          <button className={`chip ${attrFilter === null ? 'chip-on' : ''}`} onClick={() => setAttrFilter(null)}>
            {tr('tpl.allSectors')}
          </button>
          {ATTR_KEYS.map(k => (
            <button
              key={k}
              className={`chip chip-icon ${attrFilter === k ? 'chip-on' : ''} ${focusAttrs?.includes(k) ? 'chip-focus' : ''}`}
              onClick={() => setAttrFilter(attrFilter === k ? null : k)}
              style={{ ['--attr-color' as string]: ATTRIBUTES[k].color }}
              title={focusAttrs?.includes(k) ? tr('tpl.thinnestSector', { name: ATTRIBUTES[k].label }) : ATTRIBUTES[k].label}
            >
              <Icon name={k} size={13} /> {ATTRIBUTES[k].label}
            </button>
          ))}
        </div>
        <div className="tpl-chip-row">
          {EFFORT_ORDER.map(e => (
            <button
              key={e}
              className={`chip ${effortFilter === e ? 'chip-on' : ''}`}
              onClick={() => setEffortFilter(effortFilter === e ? null : e)}
            >
              {effortLabel(e)}
            </button>
          ))}
          {!!profile?.length && (
            <button className="chip chip-ghost" onClick={() => setShowAll(v => !v)}>
              {showAll
                ? tr('tpl.fitProfile')
                : `${tr('tpl.showAll')}${hiddenByProfile > 0 ? ` (+${hiddenByProfile})` : ''}`}
            </button>
          )}
        </div>
      </div>

      {!!profile?.length && !showAll && (
        <p className="muted tpl-filter-note">
          {tr('tpl.orderedFor', { profile: profile.slice(0, 3).map(r => ARCHETYPES[r].label).join(' · ') })}
        </p>
      )}

      {list.length === 0 ? (
        <p className="muted tpl-empty">{emptyHint ?? tr('quests.libraryEmptyHint')}</p>
      ) : (
        <div className="tpl-grid">
          {list.map(t => (
            <TemplateCard
              key={t.id}
              t={t}
              mode={mode}
              selected={selectedIds?.includes(t.id)}
              added={addedTitles?.has(templateTitle(t))}
              onPick={e => onPick(t, e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
