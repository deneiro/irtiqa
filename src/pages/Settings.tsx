import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthPanel } from '../components/AuthPanel';
import { Icon } from '../components/Icon';
import { Modal } from '../components/ui';
import { WheelSurvey } from '../components/WheelSurvey';
import {
  ARCHETYPE_KEYS,
  ARCHETYPES,
  CLASSES,
  CLASS_RADICAL,
  RADICAL_CLASS,
  THEME_BASE_COLORS,
  THEMES,
} from '../game/constants';
import { CUSTOM_THEME_TOKENS, charLevel, isThemeUnlocked, rankFor } from '../game/engine';
import { CURRENCIES, fmtMoney } from '../game/money';
import type { AttributeKey, PersonalityArchetype } from '../game/types';
import { LANGS, LANG_LABEL, type Lang, useLang, useT } from '../i18n';
import { fmtDate, fmtDateTime } from '../lib/format';
import { playSound } from '../lib/sound';
import { isSupabaseConfigured } from '../lib/supabase';
import { signOutUser, syncNow, useSync } from '../lib/sync';
import { SAVE_KEY, useGame } from '../store';

export function Settings() {
  const t = useT();
  const s = useGame();
  const character = s.character!;
  const cls = CLASSES.find(c => c.id === character.classId);
  const level = charLevel(character.xp);
  const rank = rankFor(level);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportSave = () => {
    const raw = localStorage.getItem(SAVE_KEY) ?? '{}';
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `irtiqa-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSave = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const parsed = JSON.parse(text);
        const st = parsed?.state;
        // Shape check, not just syntax — importing a random JSON must not crash-loop the app
        if (
          !st || typeof st !== 'object' ||
          !('character' in st) || !Array.isArray(st.habits) ||
          !Array.isArray(st.journal) || !Array.isArray(st.quests)
        ) {
          throw new Error('bad shape');
        }
        localStorage.setItem(SAVE_KEY, text);
        location.reload();
      } catch {
        alert(t('settings.badSave'));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t('settings.title')}</h1>
          <p className="muted">{t('settings.subtitle')}</p>
        </div>
      </div>

      <AccountCard />

      <LanguageCard />

      <section className="card">
        <div className="card-head"><h2>{t('settings.character')}</h2></div>
        <p className="settings-char-line">
          {cls && <Icon name={cls.id} size={16} />}{' '}
          {t('settings.charLine', { name: character.name, cls: cls?.name ?? '', level })} ·{' '}
          <Icon name={rank.icon} size={15} /> {rank.name}
        </p>
        <p className="muted">
          {t('settings.playingSince', { date: fmtDate(character.createdAt) })}{' '}
          {t('settings.identityHint')} <Icon name="identity" size={13} />{' '}
          <Link to="/market">{t('item.identity_scroll.name')}</Link>{t('settings.identityHintTail')}
        </p>
      </section>

      <section className="card">
        <div className="card-head"><h2>{t('settings.theme')}</h2></div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={s.adminUnlockAll}
            onChange={e => s.setAdminUnlockAll(e.target.checked)}
          />
          <span>
            <Icon name="unlock" size={14} /> <strong>{t('settings.ownerMode')}</strong>
            {' — '}{t('settings.ownerModeDesc')}
          </span>
        </label>
        <div className="theme-row">
          {THEMES.map(theme => {
            const unlocked = isThemeUnlocked(theme, { adminUnlockAll: s.adminUnlockAll, ownedThemes: s.ownedThemes });
            const active = s.theme === theme.id;
            return (
              <button
                key={theme.id}
                className={`theme-pick theme-preview-${theme.id} ${active ? 'theme-active' : ''}`}
                disabled={!unlocked}
                onClick={() => s.setTheme(theme.id)}
                title={unlocked ? theme.desc : t('settings.themeLocked', { price: theme.price?.toFixed(2) })}
              >
                <span className="theme-pick-emoji"><Icon name={theme.icon} size={26} /></span>
                <span>{theme.name}</span>
                {active
                  ? <span className="status status-done heading-icon"><Icon name="check" size={12} /> {t('settings.active')}</span>
                  : !unlocked
                    ? <span className="status status-locked heading-icon"><Icon name="lock" size={12} /> ${theme.price?.toFixed(2)}</span>
                    : null}
              </button>
            );
          })}
        </div>
        <p className="muted">
          {t('settings.themeFree')} <Link to="/market">{t('nav.market')}</Link>.
        </p>

        <ThemeColorPicker />
      </section>

      <section className="card">
        <div className="card-head"><h2 className="heading-icon"><Icon name="sound" size={18} /> {t('settings.sound')}</h2></div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={s.soundOn}
            onChange={e => {
              s.setSoundOn(e.target.checked);
              if (e.target.checked) playSound('reward'); // instant preview
            }}
          />
          <span>{t('settings.soundDesc')}</span>
        </label>
      </section>

      <ProfileCard />

      <WheelCard />

      <ReminderCard />

      <TutorialCard />

      <CurrencyCard />

      <section className="card">
        <div className="card-head"><h2>{t('settings.saveData')}</h2></div>
        <p className="muted">{t('settings.saveDataDesc')}</p>
        <div className="btn-pair">
          <button className="btn btn-primary heading-icon" onClick={exportSave}>
            <Icon name="download" size={14} /> {t('settings.exportSave')}
          </button>
          <button className="btn btn-ghost heading-icon" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={14} /> {t('settings.importSave')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={e => e.target.files?.[0] && importSave(e.target.files[0])}
          />
        </div>
      </section>

      <section className="card card-danger">
        <div className="card-head"><h2>{t('settings.dangerZone')}</h2></div>
        <p className="muted">{t('settings.dangerDesc')}</p>
        <button
          className="btn btn-danger heading-icon"
          onClick={() => {
            if (confirm(t('settings.eraseConfirm1')) && confirm(t('settings.eraseConfirm2'))) {
              s.resetGame();
            }
          }}
        >
          {/* famBossHunter is the app's only skull glyph — IconName has no standalone `skull`. */}
          <Icon name="famBossHunter" size={15} /> {t('settings.eraseEverything')}
        </button>
      </section>
    </div>
  );
}

/**
 * The language the interface is written in.
 *
 * Switching remounts the whole tree (see the key in App.tsx), so every screen —
 * including generated chronicle text and the template library — redraws in the
 * new language immediately. Anything the player typed themselves (habit names,
 * journal entries, contacts) is their own words and is never touched.
 */
function LanguageCard() {
  const t = useT();
  const lang = useLang();
  const setLanguage = useGame(s => s.setLanguage);

  return (
    <section className="card">
      <div className="card-head"><h2 className="heading-icon"><Icon name="learn" size={18} /> {t('settings.language')}</h2></div>
      <p className="muted">{t('settings.languageDesc')}</p>
      <div className="theme-row">
        {LANGS.map((code: Lang) => (
          <button
            key={code}
            className={`theme-pick ${lang === code ? 'theme-active' : ''}`}
            onClick={() => setLanguage(code)}
          >
            <span>{LANG_LABEL[code]}</span>
            {lang === code && (
              <span className="status status-done heading-icon">
                <Icon name="check" size={12} /> {t('settings.active')}
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="muted">{t('settings.languageNote')}</p>
    </section>
  );
}

/**
 * Which currency real money is written in.
 *
 * This is display only — the app stores plain numbers and never converts. Switching
 * from tenge to dollars re-renders the same 25000 as $25,000.00; it does not mean the
 * player suddenly has dollars. Said plainly on the card so nobody expects a rate.
 */
function CurrencyCard() {
  const t = useT();
  const currency = useGame(s => s.currency);
  const setCurrency = useGame(s => s.setCurrency);

  return (
    <section className="card">
      <div className="card-head"><h2 className="heading-icon"><Icon name="banknote" size={18} /> {t('settings.currency')}</h2></div>
      <p className="muted">
        {t('settings.currencyDesc1')} <Link to="/finances">{t('nav.finances')}</Link>{t('settings.currencyDesc2')}
      </p>
      <label className="field" style={{ maxWidth: 320 }}>
        <span>{t('settings.currencyShownIn')}</span>
        <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>
              {c.name} · {c.symbol} ({c.code})
            </option>
          ))}
        </select>
      </label>
      <p className="muted">
        {t('settings.currencyNote')} <strong>{fmtMoney(25000, currency)}</strong>.
      </p>
    </section>
  );
}

/**
 * Recolour the active theme live. Deliberately limited to accent/secondary/background
 * (CUSTOM_THEME_TOKENS) so text and surface tokens keep their contrast — this restyles
 * a theme's mood, it can't make it unreadable. Overrides persist per theme id, so
 * switching themes and back keeps each one's tweak.
 */
function ThemeColorPicker() {
  const t = useT();
  const s = useGame();
  const activeTheme = THEMES.find(th => th.id === s.theme)!;
  const overrides = s.themeOverrides[s.theme] ?? {};
  const hasOverrides = Object.keys(overrides).length > 0;
  const base = THEME_BASE_COLORS[s.theme];

  // Overrides win, otherwise the theme's authored default — never the DOM's computed
  // style, which can still reflect the previous theme for a render or two (see the
  // comment on THEME_BASE_COLORS for why).
  const currentValue = (token: string) =>
    overrides[token] || base?.[token as keyof typeof base] || '#000000';

  return (
    <div className="theme-color-picker">
      <div className="card-head" style={{ marginTop: 14 }}>
        <h3 className="heading-icon" style={{ fontSize: 'var(--fs-body)' }}>
          <Icon name="palette" size={16} /> {t('settings.recolor', { theme: activeTheme.name })}
        </h3>
        {hasOverrides && (
          <button className="btn btn-ghost btn-sm" onClick={() => s.resetThemeColors(s.theme)}>{t('settings.resetDefault')}</button>
        )}
      </div>
      <p className="muted">{t('settings.recolorDesc')}</p>
      <div className="theme-color-row">
        {CUSTOM_THEME_TOKENS.map(({ token }) => (
          <label key={token} className="theme-color-field">
            <input
              type="color"
              value={currentValue(token)}
              onChange={e => s.setThemeColor(s.theme, token, e.target.value)}
            />
            <span>{t(`themeToken.${token}`)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Replay the guided tour. Kept next to the Wheel Check because both are
 *  "run the first-session thing again" — neither destroys anything you earned. */
function TutorialCard() {
  const t = useT();
  const tutorialStep = useGame(s => s.tutorialStep);
  const replayTutorial = useGame(s => s.replayTutorial);
  const running = tutorialStep !== null && tutorialStep >= 0;

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="heading-icon"><Icon name="learn" size={18} /> {t('settings.tutorial')}</h2>
      </div>
      <p className="muted">
        {t('settings.tutorialDesc')}
        {tutorialStep === -1 && ` ${t('settings.tutorialSkipped')}`}
      </p>
      <button className="btn btn-primary" disabled={running} onClick={replayTutorial}>
        {running ? t('settings.tourRunning') : t('settings.replayTutorial')}
      </button>
    </section>
  );
}

/**
 * The Wheel of Life audit, retaken. A later check never re-seeds attributes (those are earned by
 * now) — it stores a fresh subjective snapshot so the arc of declared-vs-lived can be seen over time.
 */
function WheelCard() {
  const t = useT();
  const snapshots = useGame(s => s.wheelSnapshots);
  const recordWheelCheck = useGame(s => s.recordWheelCheck);
  const [open, setOpen] = useState(false);
  const last = snapshots[snapshots.length - 1];

  return (
    <section className="card">
      <div className="card-head"><h2 className="heading-icon"><Icon name="wheel" size={18} /> {t('settings.wheelOfLife')}</h2></div>
      <p className="muted">{t('settings.wheelDesc')}</p>
      {last
        ? <p className="muted">{t('settings.wheelLastTaken', { date: fmtDate(last.date), n: snapshots.length })}</p>
        : <p className="muted">{t('settings.wheelNone')}</p>}
      <button className="btn btn-primary heading-icon" onClick={() => setOpen(true)}>
        <Icon name="wheel" size={14} /> {t('settings.wheelRetake')}
      </button>

      {open && (
        <Modal title={t('settings.wheelCheck')} onClose={() => setOpen(false)} wide>
          <WheelSurvey
            initial={last?.scores}
            submitLabel={t('settings.wheelSave')}
            onSubmit={(scores: Record<AttributeKey, number>) => { recordWheelCheck(scores); setOpen(false); }}
          />
        </Modal>
      )}
    </section>
  );
}

function ReminderCard() {
  const t = useT();
  const s = useGame();
  const supported = typeof Notification !== 'undefined';
  const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported');

  const enable = async (on: boolean) => {
    if (!on) return s.setReminder({ enabled: false });
    if (!supported) return;
    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
      setPermission(perm);
    }
    if (perm === 'granted') s.setReminder({ enabled: true });
  };

  return (
    <section className="card">
      <div className="card-head"><h2 className="heading-icon"><Icon name="bell" size={18} /> {t('settings.reminder')}</h2></div>
      {!supported ? (
        <p className="muted">{t('settings.reminderUnsupported')}</p>
      ) : (
        <>
          <label className="toggle-row">
            <input type="checkbox" checked={s.reminder.enabled} onChange={e => void enable(e.target.checked)} />
            <span>{t('settings.reminderToggle')}</span>
          </label>
          {s.reminder.enabled && (
            <label className="field" style={{ maxWidth: 200 }}>
              <span>{t('settings.reminderAt')}</span>
              <input
                className="input"
                type="time"
                value={s.reminder.time}
                onChange={e => e.target.value && s.setReminder({ time: e.target.value })}
              />
            </label>
          )}
          {permission === 'denied' && (
            <p className="muted">
              <Icon name="warning" size={14} /> {t('settings.reminderBlocked')}
            </p>
          )}
          <p className="muted">{t('settings.reminderLimit')}</p>
        </>
      )}
    </section>
  );
}

function AccountCard() {
  const t = useT();
  const sync = useSync();
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="heading-icon"><Icon name="subscription" size={18} /> {t('settings.account')}</h2>
        {sync.user && (
          <span className={`status heading-icon ${sync.status === 'error' ? 'status-failed' : sync.status === 'synced' ? 'status-done' : ''}`}>
            {sync.status === 'syncing' ? <><Icon name="subscription" size={12} /> {t('settings.syncing')}</>
              : sync.status === 'synced' ? <><Icon name="check" size={12} /> {t('settings.synced')}</>
                : sync.status === 'error' ? <><Icon name="close" size={12} /> {t('settings.syncError')}</>
                  : sync.status}
          </span>
        )}
      </div>
      {!isSupabaseConfigured ? (
        <p className="muted">{t('settings.noCloud')}</p>
      ) : sync.user ? (
        <>
          <p>{t('settings.signedInAs')} <strong>{sync.user.email}</strong></p>
          <p className="muted">
            {sync.status === 'error'
              ? t('settings.syncErrorDetail', { error: sync.error })
              : sync.lastSyncedAt
                ? t('settings.lastSynced', { time: fmtDateTime(sync.lastSyncedAt) })
                : t('settings.awaitingSync')}
          </p>
          <div className="btn-pair">
            <button className="btn btn-primary heading-icon" onClick={() => void syncNow()}>
              <Icon name="subscription" size={13} /> {t('settings.syncNow')}
            </button>
            <button className="btn btn-ghost" onClick={() => void signOutUser()}>{t('settings.signOut')}</button>
          </div>
          <p className="muted">{t('settings.signOutNote')}</p>
        </>
      ) : (
        <>
          <p className="muted">{t('settings.signInPitch')}</p>
          <AuthPanel />
        </>
      )}
    </section>
  );
}

/**
 * The radical profile — a readout of the class loadout, not a second question.
 *
 * The classes and the radicals were always the same seven drivers in two vocabularies
 * (see CLASS_RADICAL): onboarding asked for 1–3 classes, and this card asked, on its
 * own, for radicals. A player could answer the two inconsistently and end up with a
 * template library filtered against an identity they never meant to claim — and the
 * card's blank chips read as homework the app had left undone.
 *
 * Picking the loadout now sets the profile, so this card's job changed. It shows what
 * the loadout already decided and names the class each radical came from. It stays
 * editable for the two things the loadout can't express: an order the player disagrees
 * with, and a driver that is genuinely in play but wasn't worth a class slot.
 */
function ProfileCard() {
  const t = useT();
  const character = useGame(s => s.character!);
  const setProfile = useGame(s => s.setProfile);
  const profile = character.profile ?? [];
  const loadout = character.classes ?? [];
  const fromLoadout = loadout.map(id => CLASS_RADICAL[id]);
  // Same radicals in the same order = untouched. Only then is "reset" a no-op worth hiding.
  const edited =
    fromLoadout.length !== profile.length || fromLoadout.some((r, i) => r !== profile[i]);

  const classFor = (r: PersonalityArchetype) => CLASSES.find(c => c.id === RADICAL_CLASS[r]);

  const toggle = (r: PersonalityArchetype) => {
    setProfile(profile.includes(r) ? profile.filter(x => x !== r) : [...profile, r]);
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...profile];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setProfile(next);
  };

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="heading-icon"><Icon name="brain" size={18} /> {t('settings.radicals')}</h2>
        <div className="btn-pair">
          {edited && loadout.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setProfile(fromLoadout)}>
              {t('settings.resetToLoadout')}
            </button>
          )}
          {profile.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setProfile([])}>{t('settings.clear')}</button>
          )}
        </div>
      </div>
      <p className="muted">
        {t('settings.radicalsDesc1')}{' '}
        <Link to="/attributes">{t('settings.sectorPages')}</Link>{' '}
        {t('settings.radicalsDesc2')}{' '}
        <Link to="/market">{t('item.identity_scroll.name')}</Link>{t('settings.radicalsDesc3')}
      </p>

      {profile.length > 0 ? (
        <div className="profile-picker">
          {profile.map((r, i) => {
            const c = classFor(r);
            return (
              <div key={r} className="profile-rank">
                <span className="profile-rank-num">{i + 1}</span>
                {c && <Icon name={c.id} size={15} />}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: ARCHETYPES[r].color }}>{ARCHETYPES[r].label}</span>
                  <span className="muted">
                    {' · '}{c?.name}
                    {fromLoadout.includes(r) ? '' : t('settings.addedHere')}
                  </span>
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t('settings.moveUp', { name: ARCHETYPES[r].label })}>
                  <Icon name="arrowUp" size={13} />
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} disabled={i === profile.length - 1} aria-label={t('settings.moveDown', { name: ARCHETYPES[r].label })}>
                  <Icon name="arrowDown" size={13} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="muted">{t('settings.radicalsCleared')}</p>
      )}

      <p className="muted" style={{ marginTop: 12 }}>{t('settings.allSeven')}</p>
      <div className="profile-order">
        {ARCHETYPE_KEYS.map(r => {
          const on = profile.includes(r);
          const c = classFor(r);
          return (
            <button
              key={r}
              className={`chip chip-icon ${on ? 'chip-on' : ''}`}
              onClick={() => toggle(r)}
              style={on ? { borderColor: ARCHETYPES[r].color, color: ARCHETYPES[r].color } : undefined}
              title={t('settings.radicalChip', { archetype: ARCHETYPES[r].label, cls: c?.name ?? '' })}
            >
              {c && <Icon name={c.id} size={13} />} {ARCHETYPES[r].label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
