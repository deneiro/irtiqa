import { useMemo, useState } from 'react';
import { AuthPanel } from '../components/AuthPanel';
import { Icon } from '../components/Icon';
import { TemplateBrowser, type AnyTemplate } from '../components/TemplateBrowser';
import { WheelSurvey } from '../components/WheelSurvey';
import { ATTR_KEYS, ATTRIBUTES, CLASSES, CLASS_RADICAL, classAffinityLabel } from '../game/constants';
import { attunements } from '../game/engine';
import type { AttributeKey, ClassId } from '../game/types';
import { LANGS, LANG_LABEL, type Lang, plural, useLang, useT } from '../i18n';
import { isSupabaseConfigured } from '../lib/supabase';
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
  const t = useT();
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

  const toggleId = (setPicks: typeof setHabitPicks) => (tpl: AnyTemplate) =>
    setPicks(prev => (prev.includes(tpl.id) ? prev.filter(x => x !== tpl.id) : [...prev, tpl.id]));

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
        <p className="onb-tag">{t('onb.tagline')}</p>

        {/* The language switch lives in Settings, which is behind a character that does
            not exist yet. Auto-detection covers most arrivals, but anyone it guesses
            wrong for would otherwise have to finish onboarding in the wrong language
            before they could correct it. */}
        {step === 0 && <LanguagePicker />}

        {step === 0 && (
          <div className="onb-step">
            <h2>{t('onb.nameTitle')}</h2>
            <p className="muted">{t('onb.nameDesc')}</p>
            <input
              className="input input-lg"
              placeholder={t('onb.namePlaceholder')}
              value={name}
              maxLength={40}
              autoFocus
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(1)}
            />
            <button className="btn btn-primary btn-lg" disabled={!name.trim()} onClick={() => setStep(1)}>
              {t('onb.continue')}
            </button>
            {isSupabaseConfigured && (
              <div className="onb-returning">
                {syncUser ? (
                  <p className="muted onb-cloud-line">
                    <Icon name="link" size={14} /> {t('onb.signedInAs', { email: syncUser.email })}
                    {syncStatus === 'syncing' ? t('onb.lookingForSave') : t('onb.noCloudSave')}
                  </p>
                ) : showLogin ? (
                  <>
                    <p className="muted">{t('onb.signInRestore')}</p>
                    <AuthPanel />
                  </>
                ) : (
                  <button className="btn btn-ghost" onClick={() => setShowLogin(true)}>
                    <Icon name="download" size={14} /> {t('onb.returningPlayer')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="onb-step">
            <h2>{t('onb.radicalsTitle')}</h2>
            <p className="muted">{t('onb.radicalsDesc')}</p>
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
            <p className="muted onb-note">{t('onb.identityNote')}</p>
            <div className="onb-actions">
              <button className="btn btn-ghost" onClick={() => setStep(0)}>{t('onb.back')}</button>
              <button
                className="btn btn-primary btn-lg"
                disabled={!classes.length}
                onClick={() => classes.length && setStep(2)}
              >
                {t('onb.continue')}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onb-step">
            <h2>{t('onb.wheelTitle')}</h2>
            <p className="muted">{t('onb.wheelDesc')}</p>
            <WheelSurvey
              submitLabel={t('onb.continue')}
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
              <button className="btn btn-ghost" onClick={() => setStep(1)}>{t('onb.back')}</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onb-step dayone-kit">
            <h2>{t('onb.kitTitle')}</h2>
            {focus ? (
              <p className="muted">
                {t('onb.kitThinnest')}{' '}
                <strong className="dayone-focus" style={{ color: ATTRIBUTES[focus[0]].color }}>
                  <Icon name={focus[0]} size={14} /> {ATTRIBUTES[focus[0]].label}
                </strong>{' '}{t('onb.and')}{' '}
                <strong className="dayone-focus" style={{ color: ATTRIBUTES[focus[1]].color }}>
                  <Icon name={focus[1]} size={14} /> {ATTRIBUTES[focus[1]].label}
                </strong>{t('onb.kitFocusTail')}
              </p>
            ) : (
              <p className="muted">{t('onb.kitNoFocus')}</p>
            )}

            {/* One browser, capped. Forty cards on the last screen before the app opens is
                a decision-making tax at the exact moment the player wants to be finished —
                and the quest picker on top of it asked them to commit to a project before
                they had seen a session timer. Quests move into the tour, where the timer
                gets explained first. */}
            <div className="dayone-section">
              <div className="section-label">{t('onb.pickHabits')}</div>
              <TemplateBrowser
                kind="habit"
                mode="select"
                limit={KIT_LIMIT}
                focusAttrs={focus}
                profile={profile}
                selectedIds={habitPicks}
                onPick={toggleId(setHabitPicks)}
                emptyHint={t('onb.emptyHint')}
              />
              <p className="muted dayone-hint">{t('onb.questLater')}</p>
            </div>

            {/* The library is long enough to scroll past the fold, so the way out travels
                with the player instead of waiting at the bottom of forty cards. */}
            <div className="dayone-bar">
              <span className="dayone-count">
                {habitPicks.length === 0
                  ? t('onb.nothingPicked')
                  : `${habitPicks.length} ${plural(habitPicks.length, t('onb.habitOne'), t('onb.habitFew'), t('onb.habitMany'))}`}
              </span>
              <div className="onb-actions">
                <button className="btn btn-ghost" onClick={() => setStep(2)}>{t('onb.back')}</button>
                <button className="btn btn-ghost" onClick={beginEmpty}>{t('onb.skipOwn')}</button>
                <button className="btn btn-primary btn-lg" onClick={begin}>{t('onb.begin')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Language toggle for the pre-character screens. */
function LanguagePicker() {
  const lang = useLang();
  const setLanguage = useGame(s => s.setLanguage);
  return (
    <div className="onb-lang">
      {LANGS.map((code: Lang) => (
        <button
          key={code}
          className={`chip ${lang === code ? 'chip-on' : ''}`}
          onClick={() => setLanguage(code)}
          aria-pressed={lang === code}
        >
          {LANG_LABEL[code]}
        </button>
      ))}
    </div>
  );
}
