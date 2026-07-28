import { useMemo, useState } from 'react';
import { AuthPanel } from '../components/AuthPanel';
import { Icon } from '../components/Icon';
import { TemplateBrowser, type AnyTemplate } from '../components/TemplateBrowser';
import { WheelSurvey } from '../components/WheelSurvey';
import { ATTR_KEYS, ATTRIBUTES, CLASSES, CLASS_RADICAL, classAffinityLabel } from '../game/constants';
import { attunements } from '../game/engine';
import type { AttributeKey, ClassId } from '../game/types';
import { useSync } from '../lib/sync';
import { useGame } from '../store';

/** Human label for how much of the attunement budget a slot holds. */
export function slotLabels(count: number): string[] {
  return attunements(CLASSES.slice(0, count).map(c => c.id)).map(a => `${Math.round(a.weight * 100)}%`);
}

/**
 * The two thinnest sectors of a just-submitted Wheel audit, lowest first.
 * Ties fall back to ATTR_KEYS order, so the same answers always aim at the same
 * two sectors — the picker must not shuffle under a player who goes Back.
 */
function weakestTwo(scores: Record<AttributeKey, number>): AttributeKey[] {
  return [...ATTR_KEYS].sort((a, b) => (scores[a] ?? 0) - (scores[b] ?? 0)).slice(0, 2);
}

/** Suggestions shown on the last onboarding screen. Four is enough to choose from
 *  and few enough to read; the full library is one click away from the Habits page. */
const KIT_LIMIT = 4;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Day One.
 *
 * name → radicals → Wheel audit → **starting kit** → dashboard.
 *
 * That fourth step is the whole point of this file. Before it, a new player crossed
 * four screens of self-description and landed on a dashboard with nine empty states
 * and nothing to check off — the app asked everything and gave nothing back on day
 * one. The kit step turns the audit they just filled in into a concrete offer: here
 * are the two sectors you called thinnest, here are habits aimed at them, pick a few
 * and tomorrow morning has something real on it.
 */
export function Onboarding() {
  const createCharacter = useGame(s => s.createCharacter);
  const syncUser = useSync(s => s.user);
  const syncStatus = useSync(s => s.status);
  const [name, setName] = useState('');
  const [classes, setClasses] = useState<ClassId[]>([]);
  const [step, setStep] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  // Held rather than committed: the character is only created at the end, so Back
  // never destroys an answer and the wheel + kit land in a single createCharacter call.
  const [wheel, setWheel] = useState<Record<AttributeKey, number> | null>(null);
  const [habitPicks, setHabitPicks] = useState<string[]>([]);

  const toggleClass = (id: ClassId) =>
    setClasses(prev => (prev.includes(id) ? prev.filter(c => c !== id) : prev.length < 3 ? [...prev, id] : prev));
  const weights = slotLabels(classes.length);

  // The loadout IS the radical profile (see CLASS_RADICAL) — the template library can be
  // filtered by who they just said they are without asking the same question twice.
  const profile = useMemo(() => classes.map(id => CLASS_RADICAL[id]), [classes]);
  // Undefined when the audit was skipped: TemplateBrowser then simply doesn't float
  // anything, rather than pointing at two sectors nobody actually reported on.
  const focus = useMemo(() => (wheel ? weakestTwo(wheel) : undefined), [wheel]);

  const toggleId = (setPicks: typeof setHabitPicks) => (t: AnyTemplate) =>
    setPicks(prev => (prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]));

  const begin = () => createCharacter(name, classes, wheel ?? undefined, habitPicks);
  // Skipping the kit must not also throw away the audit they just filled in.
  const beginEmpty = () => createCharacter(name, classes, wheel ?? undefined);

  return (
    <div className="onboarding">
      <div className="onboarding-inner">
        <h1 className="onb-logo"><img src="/logo-sigil.png" alt="" width={48} height={48} /> IrtiQa</h1>
        {/* The old third sentence was "Nothing is free", which the engine flatly contradicts:
            low HP costs nothing, a missed day is never charged forward, and streak damage
            scales down with the streak you broke. The promise has to match the machine. */}
        <p className="onb-tag">Your real life, played as an RPG. Every action counts. A bad day never makes tomorrow harder.</p>

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
                <p className="muted onb-cloud-line">
                  <Icon name="link" size={14} /> Signed in as {syncUser.email}
                  {syncStatus === 'syncing' ? ' — looking for your save…' : ' — no cloud save found. Forge a new character above.'}
                </p>
              ) : showLogin ? (
                <>
                  <p className="muted">Sign in and your character will be restored from the cloud.</p>
                  <AuthPanel />
                </>
              ) : (
                <button className="btn btn-ghost" onClick={() => setShowLogin(true)}>
                  <Icon name="download" size={14} /> Returning player? Sign in to restore your save
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
              most are. Answer as the person you already are, not as the build you'd like to play:
              what a driver gives you shows up once you've claimed it. Your attunement budget is
              always 100%: pick one for the deepest power, or three for the widest reach.
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
                    aria-pressed={on}
                  >
                    <div className="class-emoji"><Icon name={c.id} size={34} /></div>
                    <div className="class-name">
                      {on ? `${rank + 1}. ` : ''}{c.name}
                      {on && weights[rank] ? <span className="muted"> · {weights[rank]}</span> : null}
                    </div>
                    <div className="class-radical">{c.radical}</div>
                    <div className="class-tagline">{c.tagline}</div>
                    {/* Perk and affinity used to sit on every card while choosing, which turned
                        an honest self-report into a shopping list ("+50% journal XP" is a better
                        offer than "Everyone's looking at it wrong"). They're a consequence of the
                        identity, so they appear after the claim, not before it. */}
                    {on && (
                      <div className="class-reveal">
                        <div className="class-boost">{classAffinityLabel(c)}</div>
                        <div className="class-perk"><Icon name="starFilled" size={11} /> {c.perk}</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="muted onb-note">An Identity Scroll rewrites this later if you get it wrong.</p>
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
              Tick what's true today — no overthinking. This sets where your wheel starts, and the
              next screen uses it to suggest what to begin with. You'll never be marked empty, and
              you can retake it any time from Settings.
            </p>
            <WheelSurvey
              submitLabel="Continue →"
              onSubmit={(scores: Record<AttributeKey, number>) => {
                setWheel(scores);
                setStep(3);
              }}
              // Skipping the audit skips the *calibration*, not the starting kit — the
              // library is still the best thing to hand someone on their first minute.
              onSkip={() => {
                setWheel(null);
                setStep(3);
              }}
            />
            <div className="onb-actions">
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onb-step dayone-kit">
            <h2>Pick your starting kit</h2>
            {focus ? (
              <p className="muted">
                Your answers came out thinnest in{' '}
                <strong className="dayone-focus" style={{ color: ATTRIBUTES[focus[0]].color }}>
                  <Icon name={focus[0]} size={14} /> {ATTRIBUTES[focus[0]].label}
                </strong>{' '}and{' '}
                <strong className="dayone-focus" style={{ color: ATTRIBUTES[focus[1]].color }}>
                  <Icon name={focus[1]} size={14} /> {ATTRIBUTES[focus[1]].label}
                </strong>, so those are floated to the top. Around three is a
                good first day — enough that tomorrow morning has something real on it. Add, swap or
                drop any of it later.
              </p>
            ) : (
              <p className="muted">
                Start with things you could genuinely do today. Around three is a good first day — enough that tomorrow morning has something real on it. Add, swap
                or drop any of it later.
              </p>
            )}

            {/* One browser, capped. Forty cards on the last screen before the app opens is
                a decision-making tax at the exact moment the player wants to be finished —
                and the quest picker on top of it asked them to commit to a project before
                they had seen a session timer. Quests move into the tour, where the timer
                gets explained first. */}
            <div className="dayone-section">
              <div className="section-label">Pick a few habits</div>
              <TemplateBrowser
                kind="habit"
                mode="select"
                limit={KIT_LIMIT}
                focusAttrs={focus}
                profile={profile}
                selectedIds={habitPicks}
                onPick={toggleId(setHabitPicks)}
                emptyHint="Nothing matches that. Clear a filter — or start with none and write your own on the Habits page."
              />
              <p className="muted dayone-hint">
                Your first quest comes later — the tutorial introduces it once you have seen how
                the session timer works.
              </p>
            </div>

            {/* The library is long enough to scroll past the fold, so the way out travels
                with the player instead of waiting at the bottom of forty cards. */}
            <div className="dayone-bar">
              <span className="dayone-count">
                {habitPicks.length === 0 ? 'Nothing picked yet' : plural(habitPicks.length, 'habit')}
              </span>
              <div className="onb-actions">
                <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
                <button className="btn btn-ghost" onClick={beginEmpty}>Skip — I'll add my own</button>
                <button className="btn btn-primary btn-lg" onClick={begin}>Begin the journey</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
