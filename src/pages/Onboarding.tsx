import { useState } from 'react';
import { AuthPanel } from '../components/AuthPanel';
import { Icon } from '../components/Icon';
import { ATTRIBUTES, CLASSES } from '../game/constants';
import type { AttributeKey, ClassId } from '../game/types';
import { useSync } from '../lib/sync';
import { useGame } from '../store';

export function boostText(boosts: Partial<Record<AttributeKey, number>>): string {
  return Object.entries(boosts)
    .map(([k, v]) => `+${Math.round((v ?? 0) * 100)}% ${ATTRIBUTES[k as AttributeKey].label} XP`)
    .join(' · ');
}

export function Onboarding() {
  const createCharacter = useGame(s => s.createCharacter);
  const syncUser = useSync(s => s.user);
  const syncStatus = useSync(s => s.status);
  const [name, setName] = useState('');
  const [classId, setClassId] = useState<ClassId | null>(null);
  const [step, setStep] = useState(0);
  const [showLogin, setShowLogin] = useState(false);

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
            <h2>Choose your class</h2>
            <p className="muted">
              Seven paths. Each grants a permanent XP boost to the parts of life it champions,
              plus one unique perk. You can change later — but it will cost you an Identity Scroll.
            </p>
            <div className="class-grid">
              {CLASSES.map(c => (
                <button
                  key={c.id}
                  className={`class-card ${classId === c.id ? 'class-selected' : ''}`}
                  onClick={() => setClassId(c.id)}
                >
                  <div className="class-emoji"><Icon name={c.id} size={34} /></div>
                  <div className="class-name">{c.name}</div>
                  <div className="class-tagline">{c.tagline}</div>
                  <div className="class-boost">{boostText(c.boosts)}</div>
                  <div className="class-perk">★ {c.perk}</div>
                </button>
              ))}
            </div>
            <div className="onb-actions">
              <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
              <button
                className="btn btn-primary btn-lg"
                disabled={!classId}
                onClick={() => classId && createCharacter(name, classId)}
              >
                Begin the Journey ⚔️
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
