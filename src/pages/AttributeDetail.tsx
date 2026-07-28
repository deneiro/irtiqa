import { Link, Navigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { TemplateBrowser, isHabitTemplate, type AnyTemplate } from '../components/TemplateBrowser';
import { Bar } from '../components/ui';
import { ATTRIBUTES, ATTR_KEYS } from '../game/constants';
import { attrLevelProgress } from '../game/engine';
import { ATTRIBUTE_CONTENT } from '../game/wheel';
import type { AttributeKey } from '../game/types';
import { spawnVFXAt } from '../lib/vfx';
import { useGame } from '../store';

/**
 * One sector, in full: what it means, why it's on the wheel, and what to put in it.
 *
 * The two library sections used to be hand-rolled card grids that only ever listed
 * this sector's templates — a fixed list with no search and no way to say "something
 * under two minutes". They now run through the shared TemplateBrowser, which floats
 * this sector to the top (focusAttrs) while keeping the rest of the library one
 * search away: arriving at Health and finding a habit that happens to be filed under
 * Development is a good outcome, not a leak.
 */
export function AttributeDetail() {
  const { key } = useParams<{ key: string }>();
  const attr = key as AttributeKey;
  const s = useGame();

  if (!ATTR_KEYS.includes(attr)) return <Navigate to="/attributes" replace />;

  const meta = ATTRIBUTES[attr];
  const content = ATTRIBUTE_CONTENT[attr];
  const lp = attrLevelProgress(s.attrs[attr]);

  // Templates already in play, matched by name — the library is a starting point,
  // so a habit the player has since renamed correctly reads as not-yet-added.
  const existingHabits = new Set(s.habits.filter(h => !h.archived).map(h => h.name));
  const existingQuests = new Set(s.quests.filter(q => !q.completedAt).map(q => q.title));

  const addHabitTemplate = (t: AnyTemplate, e: React.MouseEvent) => {
    if (!isHabitTemplate(t)) return;
    s.addHabit({
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
    s.addQuest({
      title: t.title,
      // The steps ride along in the description: a quest has no step model of its own,
      // and losing the template's plan would leave the player with only a title.
      description: `${t.description}\n\n${t.steps.map(x => `· ${x}`).join('\n')}`,
      targetDuration: t.targetDuration,
      attrs: t.attrs,
    });
    spawnVFXAt(e, 'item', 1, t.title);
  };

  return (
    <div className="page" style={{ ['--attr-color' as string]: meta.color }}>
      <div className="page-head">
        <div>
          <Link to="/attributes" className="muted back-link">
            <Icon name="chevronLeft" size={13} /> The Wheel
          </Link>
          <h1 className="attr-detail-title">
            <span className="attr-detail-icon"><Icon name={attr} size={24} /></span>
            {meta.label}
          </h1>
          <p className="muted">{content.wheelName} · Level {lp.level}</p>
        </div>
      </div>

      <section className="card attr-hero" data-tour="attr-bar">
        <p className="attr-definition">{content.definition}</p>
        <Bar value={lp.into} max={lp.need} className="bar-attr" label={`${lp.into}/${lp.need} XP`} />
        <p className="muted center attr-hero-xp">{lp.into}/{lp.need} XP to level {lp.level + 1}</p>
      </section>

      <div className="attr-essay">
        <section className="card">
          <h2>Why it's on the wheel</h2>
          <p>{content.why}</p>
        </section>
        <section className="card">
          <h2>What it pulls on</h2>
          <p>{content.connection}</p>
        </section>
        <section className="card">
          <h2>What neglect looks like</h2>
          <p>{content.neglect}</p>
        </section>
      </div>

      <h2 className="section-title">Habits for this sector</h2>
      <p className="muted attr-filter-note">
        {meta.label} habits come first. Search or switch sectors to see the rest of the library.
      </p>
      <TemplateBrowser
        kind="habit"
        mode="add"
        focusAttrs={[attr]}
        profile={s.character?.profile}
        addedTitles={existingHabits}
        onPick={addHabitTemplate}
        emptyHint="Nothing matches that. Clear a filter, or write your own on the Habits page."
      />

      <h2 className="section-title">Quests for this sector</h2>
      <p className="muted attr-filter-note">
        Bigger pieces of work, with a target date. {meta.label} quests are listed first.
      </p>
      <TemplateBrowser
        kind="quest"
        mode="add"
        focusAttrs={[attr]}
        profile={s.character?.profile}
        addedTitles={existingQuests}
        onPick={addQuestTemplate}
        emptyHint="Nothing matches that. Clear a filter, or write your own on the Quests page."
      />
    </div>
  );
}
