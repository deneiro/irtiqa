import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Bar } from '../components/ui';
import { ARCHETYPES, ATTRIBUTES, ATTR_KEYS } from '../game/constants';
import { attrLevelProgress } from '../game/engine';
import {
  habitTemplatesFor,
  questTemplatesFor,
  recommendedFor,
  type HabitTemplate,
  type QuestTemplate,
} from '../game/templates';
import { ATTRIBUTE_CONTENT } from '../game/wheel';
import type { AttributeKey } from '../game/types';
import { spawnVFXAt } from '../lib/vfx';
import { useGame } from '../store';

const EFFORT_LABEL = {
  micro: 'under 2 min',
  moderate: 'moderate',
  demanding: 'demanding',
} as const;

export function AttributeDetail() {
  const { key } = useParams<{ key: string }>();
  const attr = key as AttributeKey;
  const s = useGame();

  const profile = s.character?.profile;
  const [showAll, setShowAll] = useState(false);

  const habits = useMemo(() => {
    const all = habitTemplatesFor(attr);
    return showAll || !profile ? all : recommendedFor(all, profile);
  }, [attr, profile, showAll]);

  const quests = useMemo(() => {
    const all = questTemplatesFor(attr);
    return showAll || !profile ? all : recommendedFor(all, profile);
  }, [attr, profile, showAll]);

  // Guard after hooks so hook order stays stable across renders
  if (!ATTR_KEYS.includes(attr)) return <Navigate to="/attributes" replace />;

  const meta = ATTRIBUTES[attr];
  const content = ATTRIBUTE_CONTENT[attr];
  const lp = attrLevelProgress(s.attrs[attr]);

  // Templates already in play, matched by name — the library is a starting point,
  // so a habit the player has since renamed correctly reads as not-yet-added.
  const existingHabits = new Set(s.habits.filter(h => !h.archived).map(h => h.name));
  const existingQuests = new Set(s.quests.filter(q => !q.completedAt).map(q => q.title));

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

      <section className="card attr-hero">
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

      <div className="section-head">
        <h2 className="section-title">Habits for this sector</h2>
        {profile && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(v => !v)}>
            {showAll ? 'Show recommended' : `Show all ${habitTemplatesFor(attr).length}`}
          </button>
        )}
      </div>
      {profile && !showAll && (
        <p className="muted attr-filter-note">
          Ordered for your profile ({profile.slice(0, 3).map(r => ARCHETYPES[r].label).join(' · ')}).
          Habits that reliably fail for it are hidden.
        </p>
      )}

      <div className="tpl-grid">
        {habits.map(t => (
          <HabitCard key={t.id} t={t} added={existingHabits.has(t.name)} />
        ))}
      </div>

      <h2 className="section-title">Quests for this sector</h2>
      {quests.length === 0 ? (
        <p className="muted">No quest templates for this sector yet.</p>
      ) : (
        <div className="tpl-grid">
          {quests.map(t => (
            <QuestCard key={t.id} t={t} added={existingQuests.has(t.title)} />
          ))}
        </div>
      )}
    </div>
  );
}

function HabitCard({ t, added }: { t: HabitTemplate; added: boolean }) {
  const addHabit = useGame(s => s.addHabit);

  return (
    <article className={`card tpl-card ${added ? 'tpl-added' : ''}`}>
      <div className="tpl-head">
        <span className={`habit-kind ${t.kind}`} />
        <h3 className="tpl-name">{t.name}</h3>
        <span className={`tpl-effort tpl-effort-${t.effort}`}>{EFFORT_LABEL[t.effort]}</span>
      </div>

      <p className="tpl-why">{t.why}</p>

      {t.stack && <p className="tpl-stack">“{t.stack}”</p>}

      <p className="tpl-technique">
        <Icon name="target" size={12} /> {t.technique}
      </p>

      <div className="tpl-foot">
        <span className="muted tpl-freq">
          {t.freq === 'daily' ? 'Daily' : 'Weekly'}
          {t.kind === 'bad' ? ' · avoid' : ''}
        </span>
        {added ? (
          <span className="tpl-added-label">✓ Added</span>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            onClick={e => {
              addHabit({
                name: t.name,
                kind: t.kind,
                freq: t.freq,
                attrs: t.attrs,
                weekdays: t.weekdays ?? [],
                dates: [],
              });
              spawnVFXAt(e, 'item', 1, t.name);
            }}
          >
            + Add habit
          </button>
        )}
      </div>
      <p className="tpl-source">{t.source}</p>
    </article>
  );
}

function QuestCard({ t, added }: { t: QuestTemplate; added: boolean }) {
  const addQuest = useGame(s => s.addQuest);

  return (
    <article className={`card tpl-card ${added ? 'tpl-added' : ''}`}>
      <div className="tpl-head">
        <h3 className="tpl-name">{t.title}</h3>
        <span className={`tpl-effort tpl-effort-${t.effort}`}>{EFFORT_LABEL[t.effort]}</span>
      </div>

      <p className="tpl-why">{t.description}</p>

      <ol className="tpl-steps">
        {t.steps.map(step => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <div className="tpl-foot">
        <span className="muted tpl-freq">Target: {t.targetDuration}</span>
        {added ? (
          <span className="tpl-added-label">✓ Added</span>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            onClick={e => {
              addQuest({
                title: t.title,
                description: `${t.description}\n\n${t.steps.map(x => `· ${x}`).join('\n')}`,
                targetDuration: t.targetDuration,
                attrs: t.attrs,
              });
              spawnVFXAt(e, 'item', 1, t.title);
            }}
          >
            + Add quest
          </button>
        )}
      </div>
      <p className="tpl-source">{t.source}</p>
    </article>
  );
}
