import { ReactNode } from 'react';
import { ATTRIBUTES, ATTR_KEYS } from '../game/constants';
import type { AttributeKey } from '../game/types';
import { Icon } from './Icon';

export function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-card ${wide ? 'modal-wide' : ''}`}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><Icon name="close" size={14} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Bar({ value, max, className, label }: { value: number; max: number; className?: string; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`bar ${className ?? ''}`} title={label}>
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function AttrPicker({ value, onChange, single }: { value: AttributeKey[]; onChange: (v: AttributeKey[]) => void; single?: boolean }) {
  const toggle = (k: AttributeKey) => {
    if (single) return onChange([k]);
    if (value.includes(k)) onChange(value.filter(x => x !== k));
    else onChange([...value, k]);
  };
  return (
    <div className="attr-picker">
      {ATTR_KEYS.map(k => (
        <button
          type="button"
          key={k}
          className={`chip chip-icon ${value.includes(k) ? 'chip-on' : ''}`}
          onClick={() => toggle(k)}
        >
          <Icon name={k} size={14} /> {ATTRIBUTES[k].label}
        </button>
      ))}
    </div>
  );
}

export function AttrTags({ attrs }: { attrs: AttributeKey[] }) {
  return (
    <span className="attr-tags">
      {attrs.map(a => (
        <span key={a} className="tag tag-icon" title={ATTRIBUTES[a].label}>
          <Icon name={a} size={13} />
        </span>
      ))}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
