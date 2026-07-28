import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { RadarChart } from '../components/RadarChart';
import { Bar } from '../components/ui';
import { ATTRIBUTES } from '../game/constants';
import { attrLevelProgress } from '../game/engine';
import { habitTemplatesFor, questTemplatesFor } from '../game/templates';
import { ATTRIBUTE_CONTENT, WHEEL_ORDER, WHEEL_RULE, WHEEL_SOURCE } from '../game/wheel';
import { useGame } from '../store';

/**
 * The eight sectors as one screen. Ordered by the book's own sequence rather than
 * by level, so the wheel reads the same way every time — the weakest sector is
 * found by looking, which is the diagnostic working as intended.
 */
export function Attributes() {
  const attrs = useGame(s => s.attrs);

  const levels = WHEEL_ORDER.map(k => ({ key: k, ...attrLevelProgress(attrs[k]) }));
  const lowest = levels.reduce((min, x) => (x.level < min.level ? x : min));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>The Wheel</h1>
          <p className="muted">
            Eight sectors of life, scored by what you actually did. Tap one to see what it means and
            what to put in it.
          </p>
        </div>
      </div>

      {/* The page is named for a shape, so the shape leads. Eight cards can tell you your
          levels but only the radar shows the silhouette — which spoke is short is a thing
          you see, not something you compute by reading eight numbers in a row. The spokes
          are links (see RadarChart), so this doubles as the fastest way into a sector. */}
      <section className="card">
        <div className="card-head">
          <h2>Your wheel right now</h2>
          <span className="muted">level per sector</span>
        </div>
        <div data-tour="radar"><RadarChart /></div>
        <p className="muted center">
          Shortest spoke: <Link to={`/attributes/${lowest.key}`}>{ATTRIBUTES[lowest.key].label}</Link>,
          level {lowest.level}. Tap any spoke to open its sector.
        </p>
      </section>

      <blockquote className="wheel-rule">
        {WHEEL_RULE}
        <cite>{WHEEL_SOURCE}</cite>
      </blockquote>

      <div className="attr-grid">
        {levels.map(({ key, level, into, need }) => {
          const meta = ATTRIBUTES[key];
          const content = ATTRIBUTE_CONTENT[key];
          const habits = habitTemplatesFor(key).length;
          const quests = questTemplatesFor(key).length;
          const isLowest = key === lowest.key && level === lowest.level;

          return (
            <Link
              key={key}
              to={`/attributes/${key}`}
              className={`card attr-card ${isLowest ? 'attr-card-low' : ''}`}
              data-tour={key === WHEEL_ORDER[0] ? 'attr-card' : undefined}
              style={{ ['--attr-color' as string]: meta.color }}
            >
              <div className="attr-card-head">
                <span className="attr-card-icon"><Icon name={key} size={20} /></span>
                <div className="attr-card-titles">
                  <span className="attr-card-name">{meta.label}</span>
                  <span className="muted attr-card-sector">{content.wheelName}</span>
                </div>
                <span className="attr-card-level">Lv {level}</span>
              </div>

              <Bar value={into} max={need} className="bar-attr" label={`${into}/${need} XP to level ${level + 1}`} />

              <p className="attr-card-def">{content.definition}</p>

              <div className="attr-card-foot">
                <span className="muted">
                  {habits} habit{habits === 1 ? '' : 's'} · {quests} quest{quests === 1 ? '' : 's'}
                </span>
                {/* A word alone read as a verdict on the player. Paired with the target glyph it
                    reads as what it is: the sector with the most room, and the cheapest place to
                    put the next hour. The inline flex is here because .attr-card-badge is a plain
                    inline pill in the shared stylesheet and can't be changed in this pass. */}
                {isLowest && (
                  <span className="attr-card-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="target" size={10} /> thinnest
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
