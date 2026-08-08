import { Link, Navigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { TemplateCard, useTemplateAdders, type AnyTemplate } from '../components/TemplateBrowser';
import { ATTRIBUTES, ATTR_KEYS } from '../game/constants';
import { LIBRARY_READ_REWARD, MEDIUM_LABEL, libraryEntry } from '../game/library';
import { HABIT_TEMPLATES, QUEST_TEMPLATES } from '../game/templates';
import type { AttributeKey } from '../game/types';
import { spawnVFXAt } from '../lib/vfx';
import { useGame } from '../store';

/**
 * One source, read end to end, ending in what it asks of you.
 *
 * The order is the whole design: claim → ideas → what to actually do → the habits
 * and quests this source argues for, addable in one tap.
 *
 * Everything above "Turn it into practice" is a *reading surface*, not UI, and it
 * is built that way on purpose. The first version put every idea in its own card
 * with a coloured heading, which is how the rest of the app displays data — and it
 * made six paragraphs of prose look like a settings screen. Nobody reads a settings
 * screen. So: one column, one measure, real type sizes, section labels instead of
 * headings, and no boxes until the part that is genuinely interactive.
 */
export function LibraryEntry() {
  const { key, slug } = useParams<{ key: string; slug: string }>();
  const attr = key as AttributeKey;
  const entry = libraryEntry(slug ?? '');
  const readAt = useGame(s => s.libraryRead[slug ?? '']);
  const markLibraryRead = useGame(s => s.markLibraryRead);
  const { addHabitTemplate, addQuestTemplate, existingHabits, existingQuests } = useTemplateAdders();

  if (!ATTR_KEYS.includes(attr)) return <Navigate to="/attributes" replace />;
  if (!entry || entry.attr !== attr) return <Navigate to={`/attributes/${attr}`} replace />;

  const meta = ATTRIBUTES[attr];

  // A practice whose template id no longer resolves is dropped rather than rendered
  // as a broken card. `library.test.ts` is what stops that happening in the first place.
  const habitCards = entry.habits
    .map(p => ({ p, t: HABIT_TEMPLATES.find(t => t.id === p.id) }))
    .filter((x): x is { p: typeof entry.habits[number]; t: (typeof HABIT_TEMPLATES)[number] } => !!x.t);
  const questCards = entry.quests
    .map(p => ({ p, t: QUEST_TEMPLATES.find(t => t.id === p.id) }))
    .filter((x): x is { p: typeof entry.quests[number]; t: (typeof QUEST_TEMPLATES)[number] } => !!x.t);

  const finish = (e: React.MouseEvent) => {
    if (readAt) return;
    markLibraryRead(entry.slug);
    spawnVFXAt(e, 'item', 1, entry.title);
  };

  return (
    <div className="page lib-page" style={{ ['--attr-color' as string]: meta.color }}>
      <header className="lib-head">
        <Link to={`/attributes/${attr}`} className="muted back-link">
          <Icon name="chevronLeft" size={13} /> {meta.label}
        </Link>
        <h1 className="lib-title">{entry.title}</h1>
        <p className="lib-origin">{entry.origin}</p>
        <p className="lib-meta">
          <span className="tag tag-icon">
            <Icon name="book" size={12} /> {MEDIUM_LABEL[entry.medium]}
          </span>
          <span className="tag">{entry.minutes} min read</span>
          <span className="tag tag-icon">
            <Icon name={attr} size={12} /> {meta.label}
          </span>
          {readAt && (
            <span className="tag lib-tag-read">
              <Icon name="check" size={12} /> Read
            </span>
          )}
        </p>
      </header>

      <article className="lib-read">
        <p className="lib-lead">{entry.thesis}</p>

        <h2 className="lib-label">Ideas</h2>
        {entry.ideas.map(idea => (
          <div className="lib-idea" key={idea.name}>
            <h3>{idea.name}</h3>
            <p>{idea.body}</p>
          </div>
        ))}

        {entry.notes.length > 0 && (
          <>
            <h2 className="lib-label">Worth knowing</h2>
            <ul className="lib-notes">
              {entry.notes.map(n => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </>
        )}

        <h2 className="lib-label">What to actually do</h2>
        <ol className="lib-practices">
          {entry.practices.map(p => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </article>

      <section className="lib-apply">
        <h2 className="lib-label">Turn it into practice</h2>
        <p className="lib-section-note">
          Everything below is already in the app's library — these are the ones this source stands
          behind. One tap adds it.
        </p>

        {habitCards.length > 0 && (
          <div className="lib-practice-group">
            <h3 className="lib-group-title">Habits</h3>
            <div className="tpl-grid">
              {habitCards.map(({ p, t }) => (
                <div className="lib-practice" key={t.id}>
                  <p className="lib-because">{p.because}</p>
                  <TemplateCard
                    t={t as AnyTemplate}
                    mode="add"
                    added={existingHabits.has(t.name)}
                    onPick={e => addHabitTemplate(t as AnyTemplate, e)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {questCards.length > 0 && (
          <div className="lib-practice-group">
            <h3 className="lib-group-title">Quests</h3>
            <div className="tpl-grid">
              {questCards.map(({ p, t }) => (
                <div className="lib-practice" key={t.id}>
                  <p className="lib-because">{p.because}</p>
                  <TemplateCard
                    t={t as AnyTemplate}
                    mode="add"
                    added={existingQuests.has(t.title)}
                    onPick={e => addQuestTemplate(t as AnyTemplate, e)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <footer className="lib-foot">
        {readAt ? (
          <p className="muted lib-done-note">
            <Icon name="check" size={14} /> Finished on {readAt.slice(0, 10)}. Re-reading is free.
          </p>
        ) : (
          <>
            <button className="btn btn-primary lib-done" onClick={finish}>
              <Icon name="check" size={14} /> Mark as read
            </button>
            <p className="muted lib-done-note">
              +{LIBRARY_READ_REWARD.xp} XP · +{LIBRARY_READ_REWARD.gold} Gold to {meta.label}, once.
            </p>
          </>
        )}
        <p className="muted lib-source">Distilled from: {entry.vaultSource}</p>
      </footer>
    </div>
  );
}
