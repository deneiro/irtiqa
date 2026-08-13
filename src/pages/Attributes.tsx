import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { RadarChart } from '../components/RadarChart';
import { Bar } from '../components/ui';
import { ATTRIBUTES } from '../game/constants';
import { attrLevelProgress } from '../game/engine';
import { habitTemplatesFor, questTemplatesFor } from '../game/templates';
import { ATTRIBUTE_CONTENT, WHEEL_ORDER, WHEEL_RULE, WHEEL_SOURCE } from '../game/wheel';
import { plural, useT } from '../i18n';
import { useGame } from '../store';

/**
 * The eight sectors as one screen. Ordered by the book's own sequence rather than
 * by level, so the wheel reads the same way every time — the weakest sector is
 * found by looking, which is the diagnostic working as intended.
 */
export function Attributes() {
  const t = useT();
  const attrs = useGame(s => s.attrs);

  const levels = WHEEL_ORDER.map(k => ({ key: k, ...attrLevelProgress(attrs[k]) }));
  const lowest = levels.reduce((min, x) => (x.level < min.level ? x : min));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t('nav.wheel')}</h1>
          <p className="muted">{t('attrs.subtitle')}</p>
        </div>
      </div>

      {/* The page is named for a shape, so the shape leads. Eight cards can tell you your
          levels but only the radar shows the silhouette — which spoke is short is a thing
          you see, not something you compute by reading eight numbers in a row. The spokes
          are links (see RadarChart), so this doubles as the fastest way into a sector. */}
      <section className="card">
        <div className="card-head">
          <h2>{t('attrs.wheelNow')}</h2>
          <span className="muted">{t('attrs.levelPerSector')}</span>
        </div>
        <div data-tour="radar"><RadarChart /></div>
        <p className="muted center">
          {t('attrs.shortestSpoke')} <Link to={`/attributes/${lowest.key}`}>{ATTRIBUTES[lowest.key].label}</Link>
          {t('attrs.shortestSpokeTail', { level: lowest.level })}
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
                <span className="attr-card-level">{t('common.lv')} {level}</span>
              </div>

              <Bar value={into} max={need} className="bar-attr" label={t('layout.xpToLevel', { into, need, level: level + 1 })} />

              <p className="attr-card-def">{content.definition}</p>

              <div className="attr-card-foot">
                <span className="muted">
                  {habits} {plural(habits, t('onb.habitOne'), t('onb.habitFew'), t('onb.habitMany'))}
                  {' · '}
                  {quests} {plural(quests, t('attrs.questOne'), t('attrs.questFew'), t('attrs.questMany'))}
                </span>
                {/* A word alone read as a verdict on the player. Paired with the target glyph it
                    reads as what it is: the sector with the most room, and the cheapest place to
                    put the next hour. The inline flex is here because .attr-card-badge is a plain
                    inline pill in the shared stylesheet and can't be changed in this pass. */}
                {isLowest && (
                  <span className="attr-card-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="target" size={10} /> {t('attrs.thinnest')}
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
