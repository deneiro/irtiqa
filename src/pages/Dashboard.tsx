import { Reorder } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AttributeProgress } from '../components/AttributeProgress';
import { Icon, type IconName } from '../components/Icon';
import { RadarChart } from '../components/RadarChart';
import { RelapseReflect } from '../components/RelapseReflect';
import { AttrLink, AttrPicker, AttrTags, Bar, Empty, Modal } from '../components/ui';
import { BOSS_REWARD, BOSSES } from '../game/boss';
import { buildChronicle, lastCompleteWeek } from '../game/chronicle';
import { ATTRIBUTES, CLASSES, COSMETICS, DASHBOARD_WIDGETS, DEFAULT_DASHBOARD_ORDER, MOODS } from '../game/constants';
import { contractStatus } from '../game/contract';
import {
  addDaysStr,
  bardGold,
  charLevelProgress,
  COMEBACK_HP,
  fmtDay,
  fmtDayFull,
  fmtMinutes,
  GRACE_HOUR,
  habitDueOn,
  heraldHabitMult,
  journalXp,
  missDamage,
  momentumMult,
  parseDay,
  questMinutes,
  rankFor,
  toDayStr,
  todayStr,
  weekKey,
} from '../game/engine';
import { buildCalendarItems, type CalendarItemType } from '../lib/calendar';
import { spawnVFXAt } from '../lib/vfx';
import type { AttributeKey, DashboardWidgetId } from '../game/types';
import { plural, t as tr, useT } from '../i18n';
import { locale } from '../lib/format';
import { useGame } from '../store';

const CAL_TYPE_ICON: Record<CalendarItemType, IconName> = {
  event: 'social',
  birthday: 'cake',
  quickTask: 'check',
  journal: 'journal',
  questTarget: 'target',
  subscription: 'subscription',
  habit: 'habits',
};

/**
 * Widgets that have nothing to say until the player has put something in.
 *
 * The Chronicle needs a week of history, the boss needs tagged actions to strike
 * with, the Calendar needs entries, Quick tasks needs a reason to exist. On a
 * brand-new save all four render as "you have nothing", which is four cards of
 * noise stacked over the three actions that would actually fix it. They return
 * the moment the save stops being empty.
 */
const COLD_START_HIDDEN: DashboardWidgetId[] = ['chronicle', 'weeklyBoss', 'calendar', 'quickTasks'];

/**
 * Filters out widgets that no longer exist and slots newly-added ones into the
 * position they hold in DEFAULT_DASHBOARD_ORDER, so saved layouts never go stale.
 *
 * Appending instead would bury every future widget at the bottom of the dashboard
 * of everyone who already has a save — which is exactly where a new feature goes
 * to be never seen. A widget defined before its neighbours lands before them here
 * too, while any reordering the player actually did is preserved.
 */
export function reconcileOrder(saved: DashboardWidgetId[]): DashboardWidgetId[] {
  const known = new Set(DEFAULT_DASHBOARD_ORDER);
  const out = saved.filter(id => known.has(id));

  for (const id of DEFAULT_DASHBOARD_ORDER) {
    if (out.includes(id)) continue;
    const defaultIdx = DEFAULT_DASHBOARD_ORDER.indexOf(id);
    // Land just after the last widget that precedes this one by default
    let insertAt = out.length;
    for (let i = 0; i < out.length; i++) {
      if (DEFAULT_DASHBOARD_ORDER.indexOf(out[i]) > defaultIdx) {
        insertAt = i;
        break;
      }
    }
    out.splice(insertAt, 0, id);
  }
  return out;
}

export function Dashboard() {
  const t = useT();
  const s = useGame();
  const character = s.character!;
  const today = todayStr();
  const lp = charLevelProgress(character.xp);
  const rank = rankFor(lp.level);
  const cls = CLASSES.find(c => c.id === character.classId);
  const [customizing, setCustomizing] = useState(false);
  const [reflect, setReflect] = useState<{ failureId: string; habitName: string } | null>(null);

  // createdAt is a full ISO timestamp; the local day is what the greeting and the
  // recap guard both care about.
  const bornDay = toDayStr(new Date(character.createdAt));
  const firstDay = bornDay === today;

  const dueHabits = s.habits.filter(h => habitDueOn(h, today));
  const doneCount = dueHabits.filter(h => !!s.habitLog[h.id]?.[today]).length;
  const yesterday = addDaysStr(today, -1);
  const graceOpen = new Date().getHours() < GRACE_HOUR;
  const lateHabits = graceOpen ? s.habits.filter(h => habitDueOn(h, yesterday) && !s.habitLog[h.id]?.[yesterday]) : [];
  const openTasks = s.quickTasks.filter(t => !t.doneAt);
  const priorityQuests = s.quests.filter(q => q.priority && !q.completedAt);
  const activeQuests = s.quests.filter(q => !q.completedAt);
  const journalDone = s.journal.some(e => e.date === today);
  const ghostToday = s.effects.ghostDays.includes(today);

  // Nothing tracked at all. Not the same as "nothing due today" — this is a save
  // with no habits, no quests and no entries, i.e. almost always day one.
  const coldStart = s.habits.length === 0 && s.quests.length === 0 && s.journal.length === 0;

  const calendarPreview = useMemo(
    () => buildCalendarItems(
      { events: s.events, contacts: s.contacts, quickTasks: s.quickTasks, journal: s.journal, quests: s.quests, subs: s.subs },
      today,
      addDaysStr(today, 7),
    ).slice(0, 6),
    [s.events, s.contacts, s.quickTasks, s.journal, s.quests, s.subs, today],
  );

  const effectiveOrder = reconcileOrder(s.dashboardOrder);
  const shownOrder = effectiveOrder.filter(id => !s.dashboardHidden.includes(id));
  // Cold-start hiding is a render-time filter only — the player's stored layout is
  // never rewritten, so their choices come back untouched with their first habit.
  const visibleOrder = coldStart ? shownOrder.filter(id => !COLD_START_HIDDEN.includes(id)) : shownOrder;

  const contract = contractStatus(s, today);
  const chestOpenedToday = s.chestLastOpened === today;
  const chestLoot = s.lastChestLoot?.day === today ? s.lastChestLoot : null;

  /**
   * With nothing scheduled, contract.habitsOk is a free pass, not an achievement —
   * the chest is really gated by two legs that day, not three. Counting the free
   * leg printed "1/3" over a fresh save that had done nothing at all, and a green
   * tick beside "none due today". The counter now tracks only legs in play; the
   * chest itself still keys off contract.complete, untouched.
   */
  const habitsLegLive = contract.habitsDue > 0;
  const habitsLegOk = habitsLegLive && contract.habitsOk;
  const legsTotal = habitsLegLive ? 3 : 2;
  const legsDone = [habitsLegOk, contract.journalOk, contract.extraOk].filter(Boolean).length;

  const titleCosmetic = COSMETICS.find(c => c.id === s.equippedCosmetics.title);
  const bannerId = s.equippedCosmetics.banner;
  // A character created today has no yesterday to recap, whatever lastRecapDay says.
  const showRecap = s.lastRecapDay < today && !!s.dayLog[yesterday] && bornDay <= yesterday;

  // Last week's Chronicle. "Fresh" for the first three days of a new week — long
  // enough that a Monday-through-Wednesday open still finds it waiting.
  const chronicle = useMemo(
    () => buildChronicle(
      { habits: s.habits, habitLog: s.habitLog, journal: s.journal, quests: s.quests, quickTasks: s.quickTasks, dayLog: s.dayLog },
      lastCompleteWeek(today),
    ),
    [s.habits, s.habitLog, s.journal, s.quests, s.quickTasks, s.dayLog, today],
  );
  const daysIntoWeek = Math.round((parseDay(today).getTime() - parseDay(weekKey(today)).getTime()) / 86400000);
  const chronicleFresh = daysIntoWeek <= 2 && !chronicle.thin;

  const boss = s.boss;
  const bossDef = boss ? BOSSES[boss.attr] : null;
  // Days until Monday's rollover — the boss's remaining lifespan
  const bossDaysLeft = Math.max(1, Math.round((parseDay(addDaysStr(weekKey(today), 7)).getTime() - parseDay(today).getTime()) / 86400000));

  // Real per-character numbers, so the first-steps card promises what the engine pays.
  const habitXp = Math.round(12 * heraldHabitMult(character.classes));
  const habitGold = 5 + bardGold(character.classes);

  const widgetContent: Record<DashboardWidgetId, React.ReactNode> = {
    chronicle: (
      <section className={`card chron-widget ${chronicleFresh ? 'card-hero chron-fresh' : 'card-muted'}`}>
        <div className="card-head">
          <h2><span className="heading-icon"><Icon name="chronicle" size={16} /> {t('widget.chronicle')}</span></h2>
          {chronicleFresh && <span className="chron-new">NEW</span>}
        </div>
        {chronicle.thin ? (
          <p className="muted">{t('dash.chronThin')}</p>
        ) : (
          <>
            <div className="chron-widget-title">{chronicle.title}</div>
            <p className="muted chron-widget-range">{chronicle.range}</p>
            <p className="chron-widget-lede">{chronicle.paragraphs[0].replace(/\*\*/g, '')}</p>
            <Link to="/chronicle" className={chronicleFresh ? 'btn btn-primary' : 'btn btn-ghost btn-sm'}>
              {chronicleFresh ? t('dash.readLastWeek') : t('dash.openChronicle')}
            </Link>
          </>
        )}
      </section>
    ),

    dailyContract: (
      // Exactly one card per screen gets to shout. On an empty save that card is the
      // first-steps hero above the grid; for two days after a new Chronicle lands it's
      // the Chronicle; the rest of the week it's this.
      <section className={`card contract-card ${chronicleFresh || coldStart ? '' : 'card-hero'}`}>
        <div className="card-head">
          <h2>{t('widget.dailyContract')}</h2>
          {/* "Daily Three" over "0/2" reads as an off-by-one. Naming the count as
              today's makes the shortened contract deliberate rather than broken. */}
          <span className="muted">{legsDone}/{legsTotal}{legsTotal < 3 ? ` ${t('dash.todaySuffix')}` : ''}</span>
        </div>
        <ul className="contract-list">
          {/* Three rows over a "/2" counter needs the third row to look like what it is.
              A leg that isn't in play today gets a dashed ring, not the same empty ring
              as a leg you simply haven't done — one is waiting on you, the other isn't. */}
          <li className={habitsLegOk ? 'contract-ok' : habitsLegLive ? '' : 'contract-idle'}>
            <ContractCheck ok={habitsLegOk} />
            <span className="contract-text">
              {habitsLegLive ? (
                <>{t('dash.allDueDone', { done: contract.habitsDone, due: contract.habitsDue })}</>
              ) : s.habits.length === 0 ? (
                <>{t('dash.noHabitsYet')} <Link to="/habits">{t('dash.addFirstOne')}</Link> {t('dash.noHabitsYetTail')}</>
              ) : (
                <>{t('dash.nothingToday')}</>
              )}
            </span>
          </li>
          <li className={contract.journalOk ? 'contract-ok' : ''}>
            <ContractCheck ok={contract.journalOk} />
            <span className="contract-text">{t('dash.journalWritten')}</span>
          </li>
          <li className={contract.extraOk ? 'contract-ok' : ''}>
            <ContractCheck ok={contract.extraOk} />
            <span className="contract-text">{t('dash.extraPush')}</span>
          </li>
        </ul>
        {chestOpenedToday ? (
          chestLoot ? (
            <div className="chest-opened">
              <Icon name="chest" size={15} className="dash-inline-icon" />{' '}
              {chestLoot.crit && <strong className="chest-crit">CRITICAL! </strong>}
              +{chestLoot.gold + (chestLoot.bonus.kind === 'gold' ? chestLoot.bonus.amount : 0)}{' '}
              <Icon name="gold" size={14} className="dash-inline-icon" />
              {chestLoot.bonus.kind === 'boost' && <> · <Icon name="boost" size={14} className="dash-inline-icon" /> {t('dash.boostCharges', { n: chestLoot.bonus.charges })}</>}
              {chestLoot.bonus.kind === 'shield' && <> · <Icon name="shield" size={14} className="dash-inline-icon" /> {t('item.streak_shield.name')}</>}
              {chestLoot.bonus.kind === 'cosmetic' && <> · <Icon name="sparkles" size={14} className="dash-inline-icon" /> <Link to="/profile">{chestLoot.bonus.cosmetic.name}</Link></>}
              <span className="muted"> {t('dash.nextChestTomorrow')}</span>
            </div>
          ) : (
            <div className="chest-opened muted">
              <Icon name="chest" size={15} className="dash-inline-icon" /> Today's chest is opened. Come back tomorrow.
            </div>
          )
        ) : contract.complete ? (
          <button
            className="btn btn-gold btn-lg chest-btn btn-icon-label"
            onClick={e => {
              s.openChest();
              const loot = useGame.getState().lastChestLoot;
              if (loot?.day === today) {
                spawnVFXAt(e, 'gold', loot.gold + (loot.bonus.kind === 'gold' ? loot.bonus.amount : 0));
                if (loot.bonus.kind === 'cosmetic') spawnVFXAt({ clientX: e.clientX + 30, clientY: e.clientY - 16 }, 'item', 1, loot.bonus.cosmetic.name);
              }
            }}
          >
            <Icon name="chest" size={18} /> Open today's chest
          </button>
        ) : (
          <div className="chest-locked">
            <Icon name="lock" size={14} className="dash-inline-icon" /> {legsTotal === 3 ? t('dash.chestHintThree') : t('dash.chestHintBoth')}
          </div>
        )}
      </section>
    ),

    weeklyBoss: (
      <section className="card boss-card">
        <div className="card-head">
          <h2>{t('widget.weeklyBoss')}</h2>
          <span className="muted">{t('dash.bossDaysLeft', { n: bossDaysLeft })}</span>
        </div>
        {!boss || !bossDef ? (
          <Empty>{t('dash.nextBoss')}</Empty>
        ) : (
          <>
            <div className="boss-head">
              <span className="boss-icon"><Icon name={bossDef.icon} size={34} /></span>
              <div>
                <div className="boss-name">{bossDef.name}</div>
                <div className="muted boss-taunt">"{bossDef.taunt}"</div>
              </div>
            </div>
            {boss.defeatedAt ? (
              <div className="boss-defeated">
                <Icon name="trophy" size={15} className="dash-inline-icon" /> Slain! +{BOSS_REWARD.xp} XP · +{BOSS_REWARD.gold}{' '}
                <Icon name="gold" size={14} className="dash-inline-icon" /> claimed. It re-forms Monday, wherever you're weakest.
              </div>
            ) : (
              <>
                <p className="muted">
                  It feeds on <AttrLink attr={boss.attr} />, your thinnest attribute.
                  Land {boss.required} {ATTRIBUTES[boss.attr].label}-tagged actions this week — habits, tasks, quests, anything real.
                  Claim it for <strong>+{BOSS_REWARD.xp} XP · +{BOSS_REWARD.gold} <Icon name="gold" size={14} className="dash-inline-icon" /></strong>. Leave it and it just moves on.
                </p>
                <Bar value={boss.progress} max={boss.required} className="bar-xp" label={`${boss.progress}/${boss.required} strikes`} />
                <p className="muted center">{boss.progress}/{boss.required} strikes landed</p>
              </>
            )}
          </>
        )}
      </section>
    ),
    todayHabits: (
      <section className="card">
        <div className="card-head">
          <h2>{t('widget.todayHabits')}</h2>
          <span className="muted">{doneCount}/{dueHabits.length}</span>
        </div>
        {dueHabits.length === 0 ? (
          <Empty>{t('dash.nothingTodayShort')} <Link to="/habits">{t('dash.createHabit')}</Link> {t('dash.startEngine')}</Empty>
        ) : (
          <ul className="list">
            {dueHabits.map(h => {
              const status = s.habitLog[h.id]?.[today];
              return (
                <li key={h.id} className="list-row">
                  <span className={`habit-kind ${h.kind}`} />
                  <span className="list-title">{h.name}</span>
                  <span className="streak" title={t('dash.bestTitle', { n: h.best })}>
                    <Icon name="flame" size={13} className="dash-inline-icon" /> {h.streak}
                  </span>
                  {status ? (
                    <StatusPill status={status} />
                  ) : ghostToday ? (
                    <span className="status status-pill"><Icon name="ghost" size={13} /> frozen</span>
                  ) : h.kind === 'good' ? (
                    <button
                      className="btn btn-primary btn-sm btn-icon-label"
                      onClick={e => { s.checkinHabit(h.id); spawnVFXAt(e, 'xp', 12); spawnVFXAt({ clientX: e.clientX + 24, clientY: e.clientY - 14 }, 'gold', 5); }}
                    >
                      <Icon name="check" size={14} /> Done
                    </button>
                  ) : (
                    <span className="btn-pair">
                      <button
                        className="btn btn-primary btn-sm btn-icon-label"
                        onClick={e => { s.checkinHabit(h.id); spawnVFXAt(e, 'xp', 8); spawnVFXAt({ clientX: e.clientX + 24, clientY: e.clientY - 14 }, 'gold', 3); }}
                      >
                        <Icon name="check" size={14} /> Resisted
                      </button>
                      <button
                        className="btn btn-danger btn-sm btn-icon-label"
                        onClick={e => {
                          spawnVFXAt(e, 'damage', missDamage('bad', h.streak));
                          s.relapseHabit(h.id);
                          // No failure record means an Indulgence absorbed it — nothing to reflect on
                          const f = useGame.getState().failures.filter(x => x.habitId === h.id && x.date === today).pop();
                          if (f) setReflect({ failureId: f.id, habitName: h.name });
                        }}
                      >
                        <Icon name="close" size={14} /> Relapsed
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {lateHabits.length > 0 && (
          <>
            <div className="card-head" style={{ marginTop: 12 }}>
              <h2>Yesterday — grace until {GRACE_HOUR}:00</h2>
              <span className="muted">{lateHabits.length} unlogged</span>
            </div>
            <ul className="list">
              {lateHabits.map(h => (
                <li key={h.id} className="list-row">
                  <span className={`habit-kind ${h.kind}`} />
                  <span className="list-title">{h.name}</span>
                  <button
                    className="btn btn-primary btn-sm btn-icon-label"
                    onClick={e => {
                      s.checkinHabit(h.id, yesterday);
                      spawnVFXAt(e, 'xp', h.kind === 'good' ? 12 : 8);
                      spawnVFXAt({ clientX: e.clientX + 24, clientY: e.clientY - 14 }, 'gold', h.kind === 'good' ? 5 : 3);
                    }}
                  >
                    <Icon name="check" size={14} /> {h.kind === 'good' ? t('dash.didYesterday') : t('dash.resistedYesterday')}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    ),

    lifeBalance: (
      <section className="card">
        <div className="card-head">
          <h2>{t('widget.lifeBalance')}</h2>
          <span className="muted">8 attributes</span>
        </div>
        <RadarChart />
      </section>
    ),

    attributes: (
      <section className="card">
        <div className="card-head">
          <h2>{t('widget.attributes')}</h2>
          <span className="muted">{t('dash.xpProgress')}</span>
        </div>
        <AttributeProgress />
      </section>
    ),

    quickTasks: (
      <section className="card">
        <div className="card-head">
          <h2>{t('widget.quickTasks')}</h2>
          <span className="muted">{t('dash.openCount', { n: openTasks.length })}</span>
        </div>
        <QuickTaskAdd />
        {openTasks.length === 0 ? (
          <Empty>{t('dash.noOpenTasks')}</Empty>
        ) : (
          <ul className="list">
            {openTasks.map(qt => (
              <li key={qt.id} className="list-row">
                <button
                  className="check"
                  onClick={e => { s.completeQuickTask(qt.id); spawnVFXAt(e, 'xp', 8); spawnVFXAt({ clientX: e.clientX + 24, clientY: e.clientY - 14 }, 'gold', 2); }}
                  title={t('dash.completeTaskShort')}
                  aria-label={t('dash.completeTask', { title: qt.title })}
                >
                  <Icon name="check" size={14} />
                </button>
                <span className="list-title">{qt.title}</span>
                {qt.dueDate && <span className="muted">{fmtDay(qt.dueDate)}</span>}
                <AttrTags attrs={[qt.attr]} linked />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => s.deleteQuickTask(qt.id)}
                  aria-label={t('dash.deleteTask', { title: qt.title })}
                >
                  <Icon name="trash" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    ),

    quests: (
      <section className="card">
        <div className="card-head">
          <h2>{t('widget.quests')}</h2>
          <Link to="/quests" className="muted">all →</Link>
        </div>
        {activeQuests.length === 0 ? (
          <Empty>{t('dash.noActiveQuests')} <Link to="/quests">{t('dash.forgeOne')}</Link> {t('dash.forgeOneTail')}</Empty>
        ) : (
          <ul className="list">
            {(priorityQuests.length > 0 ? priorityQuests : activeQuests.slice(0, 3)).map(q => (
              <li key={q.id} className="list-row">
                {q.priority && (
                  <span className="quest-priority" title={t('dash.priorityQuest')} aria-label={t('dash.priorityQuest')}>
                    <Icon name="starFilled" size={14} />
                  </span>
                )}
                <Link to={`/quests/${q.id}`} className="list-title">{q.title}</Link>
                <span className="muted">{fmtMinutes(questMinutes(q))} logged</span>
                {s.activeSession?.questId === q.id && <span className="status status-live">● recording</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    ),

    journal: (
      <section className="card">
        <div className="card-head">
          <h2>{t('widget.journal')}</h2>
          <Link to="/journal" className="muted">archive →</Link>
        </div>
        {journalDone ? (
          <div className="journal-done">
            <span className="big-emoji">{MOODS[(s.journal.find(e => e.date === today)?.mood ?? 3) - 1]}</span>
            <p>Today's reflection is written. +{journalXp(character.classes)} XP banked toward Spirituality &amp; Development.</p>
          </div>
        ) : (
          <div className="journal-cta">
            <p className="muted">{t('dash.noReflection')}</p>
            <Link to="/journal" className="btn btn-primary btn-icon-label">
              <Icon name="write" size={15} /> {t('dash.fs3Title')}
            </Link>
          </div>
        )}
      </section>
    ),

    calendar: (
      <section className="card">
        <div className="card-head">
          <h2>{t('widget.calendar')}</h2>
          <Link to="/calendar" className="muted">full calendar →</Link>
        </div>
        {calendarPreview.length === 0 ? (
          <Empty>{t('dash.nothingNext7')}</Empty>
        ) : (
          <ul className="list">
            {calendarPreview.map(it => (
              <li key={it.id} className="list-row">
                <Icon name={CAL_TYPE_ICON[it.type]} size={14} />
                <Link to={it.link} className={`list-title ${it.done ? 'cal-done' : ''}`}>{it.title}</Link>
                <span className="muted">{fmtDay(it.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    ),
  };

  return (
    <div className="page">
      <div className={`page-head ${bannerId ? `dash-banner banner-${bannerId}` : ''}`}>
        <div>
          <h1>
            {/* "Welcome back" to someone who arrived ninety seconds ago is the first
                thing a new player notices being wrong. Day one gets its own line. */}
            {firstDay ? t('dash.welcome') : t('dash.welcomeBack')}, {character.name}
            {titleCosmetic && <span className="char-title"> {titleCosmetic.name}</span>}
          </h1>
          <p className="muted">
            <Icon name={rank.icon} size={13} className="dash-inline-icon" /> {rank.name} · {cls && <Icon name={cls.id} size={13} className="dash-inline-icon" />} {cls?.name} · {parseDay(today).toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="quick-actions">
          <Link className="btn btn-ghost btn-icon-label" to="/habits"><Icon name="plus" size={14} /> {t('dash.qaHabit')}</Link>
          <Link className="btn btn-ghost btn-icon-label" to="/quests"><Icon name="plus" size={14} /> {t('dash.qaQuest')}</Link>
          <Link className="btn btn-ghost btn-icon-label" to="/journal"><Icon name="write" size={14} /> {t('widget.journal')}</Link>
          <button className="btn btn-ghost btn-customize btn-icon-label" onClick={() => setCustomizing(true)} title={t('dash.customizeTitle')}>
            <Icon name="grip" size={14} /> {t('dash.customize')}
          </button>
        </div>
      </div>

      {/* Low HP is information, not a sentence. Nothing is locked, nothing pays less —
          it just tells you the last stretch was rough and offers a way back. */}
      {character.hp === 0 ? (
        <div className="banner banner-info">
          <Icon name="health" size={15} className="dash-inline-icon" /> {t('dash.hpEmptyBanner', { hp: character.hp })}{' '}
          <Link to="/market">{t('nav.market')}</Link> {t('dash.hpEmptyBannerTail')}
        </div>
      ) : character.hp <= 25 ? (
        <div className="banner banner-info">
          <Icon name="health" size={15} className="dash-inline-icon" /> {t('dash.hpLowBanner', { hp: character.hp })}{' '}
          <Link to="/market">{t('nav.market')}</Link>.
        </div>
      ) : null}
      {ghostToday && (
        <div className="banner banner-info">
          <Icon name="ghost" size={15} className="dash-inline-icon" /> {t('dash.ghostBanner')}
        </div>
      )}
      {s.effects.comeback && (
        <div className="banner banner-info">
          <Icon name="brightness" size={15} className="dash-inline-icon" /> Comeback quest: check in {s.effects.comeback.remaining} more habit{s.effects.comeback.remaining > 1 ? 's' : ''} by{' '}
          {fmtDay(s.effects.comeback.expiresDay)} to restore {COMEBACK_HP} HP.
        </div>
      )}
      {s.effects.xpBoostCharges > 0 && (
        <div className="banner banner-info">
          <Icon name="boost" size={15} className="dash-inline-icon" /> Attribute Boost: +50% XP for your next {s.effects.xpBoostCharges} action{s.effects.xpBoostCharges > 1 ? 's' : ''}.
        </div>
      )}

      {coldStart && (
        <FirstSteps habitXp={habitXp} habitGold={habitGold} journalPay={journalXp(character.classes)} />
      )}

      {/* Two different empties. Hiding every card is a choice the player made and can
          undo, so it says so. Cold-start filtering emptying the grid can only happen when
          the only cards still showing were the four history widgets — and the first-steps
          hero above is already carrying that screen, so it gets no message, just no grid. */}
      {shownOrder.length === 0 && (
        <Empty>{t('dash.allHidden')} <button className="btn btn-ghost btn-sm" onClick={() => setCustomizing(true)}>{t('dash.customize')}</button> {t('dash.allHiddenTail')}</Empty>
      )}
      {visibleOrder.length > 0 && (
        <div className="dash-grid">
          {visibleOrder.map(id => (
            <div key={id} className="dash-widget">{widgetContent[id]}</div>
          ))}
        </div>
      )}

      {customizing && (
        <CustomizeDashboardModal order={effectiveOrder} onClose={() => setCustomizing(false)} />
      )}
      {showRecap && <RecapModal day={yesterday} />}
      {reflect && <RelapseReflect failureId={reflect.failureId} habitName={reflect.habitName} onClose={() => setReflect(null)} />}
    </div>
  );
}

/**
 * The whole dashboard on an empty save, compressed into the three actions that end
 * the empty save. Each one names its payout, because "add a habit" is an instruction
 * and "add a habit, it pays 12 XP and fills a leg of the Daily Three" is a reason.
 */
function FirstSteps({ habitXp, habitGold, journalPay }: { habitXp: number; habitGold: number; journalPay: number }) {
  const t = useT();
  return (
    <section className="card card-hero first-steps">
      <div className="card-head">
        <h2><span className="heading-icon"><Icon name="flag" size={16} /> {t('dash.startHere')}</span></h2>
        <span className="muted">{t('dash.threeSteps')}</span>
      </div>
      <p className="muted first-steps-lede">{t('dash.fsLede')}</p>
      <ol className="first-steps-list">
        <li className="first-steps-row">
          <span className="first-steps-num">1</span>
          <span className="first-steps-body">
            <Link to="/habits" className="first-steps-link">
              <Icon name="habits" size={15} /> {t('dash.fs1Title')}
            </Link>
            <span className="muted">
              {t('dash.fs1a', { xp: habitXp, gold: habitGold })}
              <Icon name="gold" size={13} className="dash-inline-icon" />{t('dash.fs1b')}
            </span>
          </span>
        </li>
        <li className="first-steps-row">
          <span className="first-steps-num">2</span>
          <span className="first-steps-body">
            <Link to="/quests" className="first-steps-link">
              <Icon name="quests" size={15} /> {t('dash.fs2Title')}
            </Link>
            <span className="muted">{t('dash.fs2Body')}</span>
          </span>
        </li>
        <li className="first-steps-row">
          <span className="first-steps-num">3</span>
          <span className="first-steps-body">
            <Link to="/journal" className="first-steps-link">
              <Icon name="write" size={15} /> Write today's entry
            </Link>
            <span className="muted">{t('dash.fs3Body', { xp: journalPay })}</span>
          </span>
        </li>
      </ol>
    </section>
  );
}

/** Met legs get the tick; unmet legs stay an empty ring rather than a red mark. */
function ContractCheck({ ok }: { ok: boolean }) {
  return <span className="contract-check">{ok && <Icon name="check" size={13} />}</span>;
}

/** End-of-day closure: the first visit on a new day replays what yesterday earned. */
function RecapModal({ day }: { day: string }) {
  const t = useT();
  const s = useGame();
  const log = s.dayLog[day] ?? { xp: 0, gold: 0 };
  const due = s.habits.filter(h => habitDueOn(h, day));
  const done = due.filter(h => s.habitLog[h.id]?.[day] === 'done').length;
  const minutes = s.quests.reduce((a, q) => a + q.sessions.filter(x => x.date === day).reduce((b, x) => b + x.minutes, 0), 0);
  const journalWritten = s.journal.some(e => e.date === day);
  const perfect = s.momentum.lastDay === day && s.momentum.streak > 0;
  const momentumPct = Math.round((momentumMult(s.momentum.streak) - 1) * 100);

  return (
    <Modal title={t('dash.yesterdayTitle', { date: fmtDayFull(day) })} onClose={s.dismissRecap}>
      <div className="recap-grid">
        <div className="recap-stat"><span className="stat-big">+{log.xp}</span><span className="muted">XP earned</span></div>
        <div className="recap-stat"><span className="stat-big">+{log.gold}</span><span className="muted">{t('dash.goldEarned')}</span></div>
        {due.length > 0 && (
          <div className="recap-stat"><span className="stat-big">{done}/{due.length}</span><span className="muted">{t('dash.habitsDone')}</span></div>
        )}
        {minutes > 0 && (
          <div className="recap-stat"><span className="stat-big">{fmtMinutes(minutes)}</span><span className="muted">{t('dash.questWork')}</span></div>
        )}
      </div>
      {perfect ? (
        <p className="recap-perfect">
          <Icon name="flame" size={15} className="dash-inline-icon" /> {t('dash.perfectDay', { streak: s.momentum.streak, pct: momentumPct })}
        </p>
      ) : due.length > 0 && done < due.length ? (
        <p className="muted">{t('dash.someSlipped')}</p>
      ) : null}
      {!journalWritten && <p className="muted">{t('dash.noJournalYesterday')}</p>}
      <div className="modal-actions">
        <button className="btn btn-primary btn-icon-label" onClick={s.dismissRecap}>
          {t('dash.onward')} <Icon name="chevronRight" size={15} />
        </button>
      </div>
    </Modal>
  );
}

function CustomizeDashboardModal({ order, onClose }: { order: DashboardWidgetId[]; onClose: () => void }) {
  const t = useT();
  const hidden = useGame(s => s.dashboardHidden);
  const setDashboardOrder = useGame(s => s.setDashboardOrder);
  const toggleDashboardWidget = useGame(s => s.toggleDashboardWidget);
  const resetDashboardLayout = useGame(s => s.resetDashboardLayout);

  return (
    <Modal title={t('dash.customizeModal')} onClose={onClose}>
      <p className="muted">{t('dash.dragReorder')}</p>
      <Reorder.Group as="ul" axis="y" values={order} onReorder={setDashboardOrder} className="dash-customize-list">
        {order.map(id => (
          <Reorder.Item key={id} value={id} as="li" className="dash-customize-row">
            <Icon name="grip" size={16} className="drag-handle" />
            <span className="dash-customize-label">{DASHBOARD_WIDGETS[id].label}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => toggleDashboardWidget(id)}
              title={hidden.includes(id) ? t('dash.hiddenClickShow') : t('dash.visibleClickHide')}
            >
              <Icon name={hidden.includes(id) ? 'eyeOff' : 'eye'} size={16} />
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={resetDashboardLayout}>{t('settings.resetDefault')}</button>
        <button className="btn btn-primary" onClick={onClose}>{t('common.done')}</button>
      </div>
    </Modal>
  );
}

/** A logged habit day, as glyph plus word — the glyph carries the state, the word names it. */
function statusLabel(status: string): { icon: IconName; label: string } {
  switch (status) {
    case 'done': return { icon: 'check', label: tr('hh.outcome.done') };
    case 'failed': return { icon: 'minus', label: tr('hh.outcome.failed') };
    case 'pardoned': return { icon: 'pardon', label: tr('hh.outcome.pardoned') };
    case 'shielded': return { icon: 'shield', label: tr('hh.outcome.shielded') };
    case 'ghost': return { icon: 'ghost', label: tr('hh.outcome.ghost') };
    case 'indulged': return { icon: 'indulgence', label: tr('hh.outcome.indulged') };
    default: return { icon: 'info', label: status };
  }
}

function StatusPill({ status }: { status: string }) {
  const t = useT();
  const { icon, label } = statusLabel(status);
  return (
    <span className={`status status-pill status-${status}`}>
      <Icon name={icon} size={13} /> {label}
    </span>
  );
}

function QuickTaskAdd() {
  const t = useT();
  const addQuickTask = useGame(s => s.addQuickTask);
  const [title, setTitle] = useState('');
  const [attr, setAttr] = useState<AttributeKey[]>(['development']);
  const [showAttr, setShowAttr] = useState(false);
  const [dueDate, setDueDate] = useState('');

  const submit = () => {
    if (!title.trim()) return;
    addQuickTask(title, attr[0], dueDate || undefined);
    setTitle('');
    setDueDate('');
  };

  return (
    <div className="qt-add">
      <div className="qt-row">
        <input
          className="input"
          placeholder={t('dash.quickTaskPh')}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        <input
          className="input qt-due"
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          title={t('dash.dueDateTitle')}
        />
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAttr(v => !v)} title={t('dash.tagAttribute')}>
          <Icon name={attr[0]} size={14} />
        </button>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={!title.trim()}>Add</button>
      </div>
      {showAttr && <AttrPicker value={attr} onChange={v => { setAttr(v.length ? v : attr); setShowAttr(false); }} single />}
    </div>
  );
}
