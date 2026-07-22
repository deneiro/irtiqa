import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
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
                {isLowest && <span className="attr-card-badge">thinnest</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
