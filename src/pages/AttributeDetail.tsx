import { Link, Navigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Bar } from '../components/ui';
import { ATTRIBUTES, ATTR_KEYS } from '../game/constants';
import { attrLevelProgress } from '../game/engine';
import { MEDIUM_LABEL, libraryFor } from '../game/library';
import { ATTRIBUTE_CONTENT } from '../game/wheel';
import type { AttributeKey } from '../game/types';
import { useGame } from '../store';

/**
 * One sector: what it means, why it's on the wheel, and what to read about it.
 *
 * This page used to end in two full TemplateBrowsers — the entire habit and quest
 * library, searchable, filtered, forty cards deep. Wrong place for it. Picking a
 * habit is something you do on the Habits page, where "+ New habit" already opens
 * the same browser; here it turned a page about *understanding a sector* into a
 * second, worse version of the Habits page, and buried the reading under it.
 *
 * So the sector page is now short: what the sector is, where you stand in it, and
 * the Library. The habits and quests still arrive — at the end of an entry, chosen
 * by the source you just read, which is a better recommendation than a search box.
 */
export function AttributeDetail() {
  const { key } = useParams<{ key: string }>();
  const attr = key as AttributeKey;
  const attrs = useGame(s => s.attrs);
  const libraryRead = useGame(s => s.libraryRead);

  if (!ATTR_KEYS.includes(attr)) return <Navigate to="/attributes" replace />;

  const meta = ATTRIBUTES[attr];
  const content = ATTRIBUTE_CONTENT[attr];
  const lp = attrLevelProgress(attrs[attr]);
  const entries = libraryFor(attr);
  const unread = entries.filter(e => !libraryRead[e.slug]).length;

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

      {entries.length > 0 && (
        <>
          <h2 className="lib-label lib-label-page">
            The Library
            {unread > 0 && <span className="lib-unread">{unread} unread</span>}
          </h2>
          <p className="lib-section-note">
            A source per card, distilled and read in full — then the habits and quests it argues for,
            waiting at the bottom of it.
          </p>
          <div className="lib-grid">
            {entries.map(e => {
              const read = libraryRead[e.slug];
              return (
                <Link
                  to={`/attributes/${attr}/library/${e.slug}`}
                  className={`card lib-card ${read ? 'lib-card-read' : ''}`}
                  key={e.slug}
                >
                  <div className="lib-card-head">
                    <span className="tag tag-icon">
                      <Icon name="book" size={12} /> {MEDIUM_LABEL[e.medium]}
                    </span>
                    <span className="muted lib-card-time">{e.minutes} min</span>
                    {read && (
                      <span className="lib-card-check" title="Read">
                        <Icon name="check" size={13} />
                      </span>
                    )}
                  </div>
                  <h3 className="lib-card-title">{e.title}</h3>
                  <p className="lib-card-hook">{e.hook}</p>
                  <p className="muted lib-card-origin">{e.origin}</p>
                  <span className="lib-card-go">
                    Read <Icon name="chevronRight" size={13} />
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
