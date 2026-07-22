import { ATTRIBUTES, ATTR_KEYS } from '../game/constants';
import { attrLevelProgress } from '../game/engine';
import { useGame } from '../store';
import { Icon } from './Icon';

/** Per-attribute level + progress-to-next-level, one row per life attribute. */
export function AttributeProgress() {
  const attrs = useGame(s => s.attrs);

  return (
    <div className="attr-progress-list">
      {ATTR_KEYS.map(k => {
        const meta = ATTRIBUTES[k];
        const { level, into, need } = attrLevelProgress(attrs[k]);
        const pct = Math.round((into / need) * 100);
        const style = { '--ac': meta.color } as React.CSSProperties;
        return (
          <div key={k} className="attr-progress-row" style={style}>
            <span className="attr-progress-icon"><Icon name={k} size={19} /></span>
            <div className="attr-progress-body">
              <div className="attr-progress-head">
                <span className="attr-progress-name">{meta.label}</span>
                <span className="attr-progress-pill">
                  Lvl {level} <span className="attr-progress-pct">{pct}%</span>
                </span>
              </div>
              <div className="attr-progress-bar">
                <div className="attr-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
