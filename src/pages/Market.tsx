import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Modal } from '../components/ui';
import { CLASSES, classAffinityLabel, ITEMS, THEMES } from '../game/constants';
import { addDaysStr, fmtDayFull, isThemeUnlocked, itemPrice, journalLocked, todayStr } from '../game/engine';
import type { ClassId, ItemDef, ItemId, ThemeDef } from '../game/types';
import { spawnVFXAt } from '../lib/vfx';
import { slotLabels } from './Onboarding';
import { useGame } from '../store';

/**
 * Price bands.
 *
 * Every item used to render as the same grey card, so eleven different things at
 * eleven different prices read as one undifferentiated spreadsheet — nothing on
 * the shelf looked like it mattered more than anything else. The band is what a
 * player actually sorts by: is this pocket change, is this real insurance, or is
 * this the thing I save up for.
 *
 * Keyed off `item.price` (the list price) rather than `itemPrice(item)` so a
 * discount never slides a card into a different band mid-render — the band is a
 * property of the item, not of today's sale.
 */
type PriceBand = 'everyday' | 'insurance' | 'rare';

const BAND_LABEL: Record<PriceBand, string> = {
  everyday: 'Everyday',
  insurance: 'Insurance',
  rare: 'Rare',
};

function priceBand(price: number): PriceBand {
  if (price <= 60) return 'everyday';
  if (price <= 110) return 'insurance';
  return 'rare';
}

/** Cheapest first, so the bands come out as contiguous blocks inside each section. */
const byPrice = (a: ItemDef, b: ItemDef) => a.price - b.price;

export function Market() {
  const s = useGame();
  const gold = s.character?.gold ?? 0;
  const consumables = ITEMS.filter(i => i.kind === 'consumable').sort(byPrice);
  const permanents = ITEMS.filter(i => i.kind === 'permanent').sort(byPrice);
  const [using, setUsing] = useState<ItemId | null>(null);

  const inventoryItems = consumables.filter(i => (s.inventory[i.id] ?? 0) > 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Market</h1>
          <p className="muted">The only legal way to soften a consequence. Every coin here was earned the hard way.</p>
        </div>
        <div className="gold-big"><Icon name="gold" size={26} /> {gold}</div>
      </div>

      {inventoryItems.length > 0 && (
        <section className="card">
          <div className="card-head"><h2 className="heading-icon"><Icon name="chest" size={18} /> Your inventory</h2></div>
          <div className="inv-row">
            {inventoryItems.map(i => (
              <div key={i.id} className="inv-item">
                <span className="inv-icon"><Icon name={i.icon} size={18} /></span>
                <span className="inv-name">{i.name}</span>
                <span className="inv-count">×{s.inventory[i.id]}</span>
                <UseButton item={i} onNeedPayload={() => setUsing(i.id)} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title" data-tour="market-consumables">Consumables</h2>
        <p className="muted market-note">Cheapest first — everyday relief, then the insurance, then the rare things.</p>
        <div className="market-grid">
          {consumables.map(i => <ItemCard key={i.id} item={i} onNeedPayload={() => setUsing(i.id)} />)}
        </div>
      </section>

      <section>
        <h2 className="section-title" data-tour="market-permanent">Permanent upgrades</h2>
        <div className="market-grid">
          {permanents.map(i => <ItemCard key={i.id} item={i} onNeedPayload={() => setUsing(i.id)} />)}
        </div>
      </section>

      <section>
        <h2 className="section-title">Themes</h2>
        {s.adminUnlockAll && (
          <p className="muted market-note">
            <Icon name="unlock" size={14} /> Owner mode is on — every theme is unlocked. Toggle it in{' '}
            <Link to="/settings">Settings</Link> to preview the priced view.
          </p>
        )}
        <div className="market-grid">
          {THEMES.map(t => <ThemeCard key={t.id} theme={t} />)}
        </div>
      </section>

      {using === 'habit_pardon' && <PardonModal onClose={() => setUsing(null)} />}
      {using === 'ghost_day' && <GhostModal onClose={() => setUsing(null)} />}
      {using === 'feather' && <FeatherModal onClose={() => setUsing(null)} />}
      {using === 'identity_scroll' && <IdentityModal onClose={() => setUsing(null)} />}
    </div>
  );
}

const NEEDS_PAYLOAD: ItemId[] = ['habit_pardon', 'ghost_day', 'feather', 'identity_scroll'];

function UseButton({ item, onNeedPayload }: { item: ItemDef; onNeedPayload: () => void }) {
  const s = useGame();
  const owned = s.inventory[item.id] ?? 0;
  if (owned < 1) return null;
  if (item.id === 'streak_shield') {
    return (
      <span className="muted inline-icon" title="Activates automatically when a streak would break">
        <Icon name="shield" size={13} /> auto
      </span>
    );
  }
  const disabled = item.heal !== undefined && (s.character?.hp ?? 0) >= 100;
  return (
    <button
      className="btn btn-primary btn-sm"
      disabled={disabled}
      title={disabled ? 'HP already full' : undefined}
      onClick={e => {
        if (NEEDS_PAYLOAD.includes(item.id)) return onNeedPayload();
        s.useItem(item.id);
        if (item.heal !== undefined) spawnVFXAt(e, 'heal', Math.min(100 - (s.character?.hp ?? 0), item.heal));
        else spawnVFXAt(e, 'item', 1, item.name);
      }}
    >
      Use
    </button>
  );
}

function ItemCard({ item, onNeedPayload }: { item: ItemDef; onNeedPayload: () => void }) {
  const s = useGame();
  const gold = s.character?.gold ?? 0;
  const price = itemPrice(item);
  const band = priceBand(item.price);
  const owned = item.id === 'focus_unlock' ? (s.effects.maxPriority >= 2 ? 1 : 0) : s.inventory[item.id] ?? 0;
  const soldOut = item.id === 'focus_unlock' && owned > 0;

  return (
    <div className={`card item-card market-item band-${band}`}>
      <div className="item-band">{BAND_LABEL[band]}</div>
      <div className="item-icon"><Icon name={item.icon} size={28} /></div>
      <div className="item-name">{item.name}</div>
      <div className="item-desc">{item.desc}</div>
      <div className="item-footer">
        {owned > 0 && <span className="tag">{item.id === 'focus_unlock' ? 'owned' : `×${owned}`}</span>}
        {soldOut ? (
          <span className="status status-done inline-icon"><Icon name="check" size={13} /> Active</span>
        ) : (
          <button className="btn btn-gold btn-sm" disabled={gold < price} onClick={() => s.buyItem(item.id)}>
            Buy · {price < item.price && <s className="muted">{item.price}</s>} {price} <Icon name="gold" size={13} />
          </button>
        )}
        <UseButton item={item} onNeedPayload={onNeedPayload} />
      </div>
    </div>
  );
}

function ThemeCard({ theme }: { theme: ThemeDef }) {
  const s = useGame();
  const active = s.theme === theme.id;
  const unlocked = isThemeUnlocked(theme, { adminUnlockAll: s.adminUnlockAll, ownedThemes: s.ownedThemes });

  return (
    <div className={`card item-card theme-card theme-preview-${theme.id}`}>
      <div className="item-icon"><Icon name={theme.icon} size={28} /></div>
      <div className="item-name">{theme.name}</div>
      <div className="item-desc">{theme.desc}</div>
      <div className="theme-swatch-row">
        <span className={`swatch swatch-${theme.id}-1`} /><span className={`swatch swatch-${theme.id}-2`} /><span className={`swatch swatch-${theme.id}-3`} />
      </div>
      <div className="item-footer">
        {active ? (
          <span className="status status-done inline-icon"><Icon name="check" size={13} /> Applied</span>
        ) : unlocked ? (
          <button className="btn btn-primary btn-sm" onClick={() => s.setTheme(theme.id)}>Apply</button>
        ) : (
          // Symbolic price, display-only — no purchase path yet (owner mode is the only unlock today).
          <span className="status status-locked inline-icon" title="Locked — owner mode is off">
            <Icon name="lock" size={13} /> ${theme.price?.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}

function PardonModal({ onClose }: { onClose: () => void }) {
  const s = useGame();
  const eligible = s.failures.filter(f => !f.pardoned && s.habitLog[f.habitId]?.[f.date] === 'failed').slice(-10).reverse();
  return (
    <Modal title="Habit Pardon — choose a failure to forgive" onClose={onClose}>
      {eligible.length === 0 ? (
        <p className="muted">No unpardoned failures on record. Your ledger is clean.</p>
      ) : (
        <ul className="list">
          {eligible.map(f => {
            const h = s.habits.find(x => x.id === f.habitId);
            return (
              <li key={f.id} className="list-row">
                <span className="list-title">{h?.name ?? 'Deleted habit'}</span>
                <span className="muted">{fmtDayFull(f.date)} · -{f.damage} HP · {f.prevStreak}-day streak lost</span>
                <button className="btn btn-primary btn-sm" onClick={() => { s.useItem('habit_pardon', { failureId: f.id }); onClose(); }}>
                  Pardon
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

function GhostModal({ onClose }: { onClose: () => void }) {
  const s = useGame();
  const today = todayStr();
  const tomorrow = addDaysStr(today, 1);
  const [custom, setCustom] = useState('');
  return (
    <Modal title="Ghost Day — freeze which day?" onClose={onClose}>
      <p className="muted">
        The chosen day is exempt from all penalties. Streaks pause, nothing breaks. For real sick days and travel —
        buy one per travel day and pre-set them before you leave.
      </p>
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={() => { s.useItem('ghost_day', { date: today }); onClose(); }}>Today ({today})</button>
        <button className="btn btn-primary" onClick={() => { s.useItem('ghost_day', { date: tomorrow }); onClose(); }}>Tomorrow ({tomorrow})</button>
      </div>
      <div className="qt-row" style={{ marginTop: 10 }}>
        <input className="input" type="date" min={today} value={custom} onChange={e => setCustom(e.target.value)} />
        <button
          className="btn btn-primary btn-sm"
          disabled={!custom || custom < today}
          onClick={() => { s.useItem('ghost_day', { date: custom }); onClose(); }}
        >
          Freeze that day
        </button>
      </div>
      {s.effects.ghostDays.length > 0 && (
        <p className="muted" style={{ marginTop: 10 }}>Already frozen: {s.effects.ghostDays.join(', ')}</p>
      )}
    </Modal>
  );
}

function FeatherModal({ onClose }: { onClose: () => void }) {
  const s = useGame();
  const locked = s.journal.filter(e => journalLocked(e)).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Modal title="Feather of Time — unseal which entry?" onClose={onClose}>
      {locked.length === 0 ? (
        <p className="muted">No sealed entries. Time hasn't locked anything away from you yet.</p>
      ) : (
        <ul className="list">
          {locked.map(e => (
            <li key={e.id} className="list-row">
              <span className="list-title">{fmtDayFull(e.date)}</span>
              <span className="muted">{e.answers[0]?.a.slice(0, 40) ?? ''}…</span>
              <button className="btn btn-primary btn-sm" onClick={() => { s.useItem('feather', { entryId: e.id }); onClose(); }}>
                Unseal
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function IdentityModal({ onClose }: { onClose: () => void }) {
  const s = useGame();
  const [name, setName] = useState(s.character?.name ?? '');
  const [classes, setClasses] = useState<ClassId[]>(s.character?.classes ?? []);
  const toggleClass = (id: ClassId) =>
    setClasses(prev => (prev.includes(id) ? prev.filter(c => c !== id) : prev.length < 3 ? [...prev, id] : prev));
  const weights = slotLabels(classes.length);
  return (
    <Modal title="Identity Scroll — rewrite yourself" onClose={onClose} wide>
      <label className="field">
        <span>Character name</span>
        <input className="input" value={name} onChange={e => setName(e.target.value)} maxLength={40} />
      </label>
      <div className="field">
        <span>Radicals — pick up to three, in order</span>
        <div className="class-grid class-grid-sm">
          {CLASSES.map(c => {
            const rank = classes.indexOf(c.id);
            const on = rank >= 0;
            return (
              <button key={c.id} className={`class-card ${on ? 'class-selected' : ''}`} onClick={() => toggleClass(c.id)}>
                <div className="class-emoji"><Icon name={c.id} size={30} /></div>
                <div className="class-name">
                  {on ? `${rank + 1}. ` : ''}{c.name}
                  {on && weights[rank] ? <span className="muted"> · {weights[rank]}</span> : null}
                </div>
                <div className="class-boost">{classAffinityLabel(c)}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          disabled={!name.trim() || !classes.length}
          onClick={() => { s.useItem('identity_scroll', { name, classes }); onClose(); }}
        >
          Consume scroll
        </button>
      </div>
    </Modal>
  );
}
