import { useState } from 'react';
import { AuthPanel } from '../components/AuthPanel';
import { Icon } from '../components/Icon';
import { WheelSurvey } from '../components/WheelSurvey';
import { CLASSES, classAffinityLabel } from '../game/constants';
import { attunements } from '../game/engine';
import type { AttributeKey, ClassId } from '../game/types';
import { useSync } from '../lib/sync';
import { useGame } from '../store';

/** Human label for how much of the attunement budget a slot holds. */
export function slotLabels(count: number): string[] {
  return attunements(CLASSES.slice(0, count).map(c => c.id)).map(a => `${Math.round(a.weight * 100)}%`);
}

export function Onboarding() {
  const createCharacter = useGame(s => s.createCharacter);
  const syncUser = useSync(s => s.user);
  const syncStatus = useSync(s => s.status);
  const [name, setName] = useState('');
  const [classes, setClasses] = useState<ClassId[]>([]);
  const [step, setStep] = useState(0);
  const [showLogin, setShowLogin] = useState(false);

  const toggleClass = (id: ClassId) =>
    setClasses(prev => (prev.includes(id) ? prev.filter(c => c !== id) : prev.length < 3 ? [...prev, id] : prev));
  const weights = slotLabels(classes.length);

  return (
    <div className="onboarding">
      <div className="onboarding-inner">
        <h1 className="onb-logo">⚔️ IrtiQa</h1>
        <p className="onb-tag">Your real life, played as an RPG. Every action counts. Nothing is free.</p>

        {step === 0 && (
          <div className="onb-step">
            <h2>Name your character</h2>
            <p className="muted">This is you. Choose a name worthy of the journey.</p>
            <input
              className="input input-lg"
              placeholder="e.g. Eldar the Relentless"
              value={name}
              maxLength={40}
              autoFocus
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(1)}
            />
            <button className="btn btn-primary btn-lg" disabled={!name.trim()} onClick={() => setStep(1)}>
              Continue →
            </button>
            <div className="onb-returning">
              {syncUser ? (
                <p className="muted">
                  ☁️ Signed in as {syncUser.email}
                  {syncStatus === 'syncing' ? ' — looking for your save…' : ' — no cloud save found. Forge a new character above.'}
                </p>
              ) : showLogin ? (
                <>
                  <p className="muted">Sign in and your character will be restored from the cloud.</p>
                  <AuthPanel />
                </>
              ) : (
                <button className="btn btn-ghost" onClick={() => setShowLogin(true)}>
                  ☁️ Returning player? Sign in to restore your save
                </button>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="onb-step">
            <h2>Choose your radicals</h2>
            <p className="muted">
              Seven drivers. Pick up to three, in the order that fits you — the first is who you
              most are. Your attunement budget is always 100%: pick one for the deepest power, or
              three for the widest reach. You can rewrite this later with an Identity Scroll.
            </p>
            <div className="class-grid">
              {CLASSES.map(c => {
                const rank = classes.indexOf(c.id);
                const on = rank >= 0;
                return (
                  <button
                    key={c.id}
                    className={`class-card ${on ? 'class-selected' : ''}`}
                    onClick={() => toggleClass(c.id)}
                  >
                    <div className="class-emoji"><Icon name={c.id} size={34} /></div>
                    <div className="class-name">
                      {on ? `${rank + 1}. ` : ''}{c.name}
                      {on && weights[rank] ? <span className="muted"> · {weights[rank]}</span> : null}
                    </div>
                    <div className="class-tagline">{c.tagline}</div>
                    <div className="class-boost">{classAffinityLabel(c)}</div>
                    <div className="class-perk">★ {c.perk}</div>
                  </button>
                );
              })}
            </div>
            <div className="onb-actions">
              <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
              <button
                className="btn btn-primary btn-lg"
                disabled={!classes.length}
                onClick={() => classes.length && setStep(2)}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onb-step">
            <h2>Your life right now</h2>
            <p className="muted">
              Tick what's true today — no overthinking. This sets where your wheel starts, so the game
              points at what you actually neglect from day one. You'll never be marked empty, and you
              can retake it any time from Settings.
            </p>
            <WheelSurvey
              submitLabel="Begin the Journey ⚔️"
              onSubmit={(scores: Record<AttributeKey, number>) => createCharacter(name, classes, scores)}
              onSkip={() => createCharacter(name, classes)}
            />
            <div className="onb-actions">
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
