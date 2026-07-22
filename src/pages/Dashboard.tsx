import { Reorder } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AttributeProgress } from '../components/AttributeProgress';
import { Icon, type IconName } from '../components/Icon';
import { RadarChart } from '../components/RadarChart';
import { RelapseReflect } from '../components/RelapseReflect';
import { AttrPicker, Bar, Empty, Modal } from '../components/ui';
import { BOSS_PENALTY, BOSS_REWARD, BOSSES } from '../game/boss';
import { ATTRIBUTES, CLASSES, COSMETICS, DASHBOARD_WIDGETS, DEFAULT_DASHBOARD_ORDER, MOODS } from '../game/constants';
import { contractStatus } from '../game/contract';
import {
  addDaysStr,
  charLevelProgress,
  COMEBACK_HP,
  fmtDay,
  fmtDayFull,
  fmtMinutes,
  GRACE_HOUR,
  habitDueOn,
  missDamage,
  momentumMult,
  parseDay,
  questMinutes,
  rankFor,
  todayStr,
  weekKey,
} from '../game/engine';
import { buildCalendarItems, type CalendarItemType } from '../lib/calendar';
import { spawnVFXAt } from '../lib/vfx';
import type { AttributeKey, DashboardWidgetId } from '../game/types';
import { useGame } from '../store';

const CAL_TYPE_ICON: Record<CalendarItemType, IconName> = {
  event: 'social',
  birthday: 'cake',
  quickTask: 'check',
  journal: 'journal',
  questTarget: 'target',
};

/** Filters out widgets that no longer exist and appends any newly-added ones, so saved layouts never go stale. */
function reconcileOrder(saved: DashboardWidgetId[]): DashboardWidgetId[] {
  const known = new Set(DEFAULT_DASHBOARD_ORDER);
  const filtered = saved.filter(id => known.has(id));
  const missing = DEFAULT_DASHBOARD_ORDER.filter(id => !filtered.includes(id));
  return [...filtered, ...missing];
}

export function Dashboard() {
  const s = useGame();
  const character = s.character!;
  const today = todayStr();
  const lp = charLevelProgress(character.xp);
  const rank = rankFor(lp.level);
  const cls = CLASSES.find(c => c.id === character.classId);
  const [customizing, setCustomizing] = useState(false);
  const [reflect, setReflect] = useState<{ failureId: string; habitName: string } | null>(null);

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

  const calendarPreview = useMemo(
    () => buildCalendarItems(
      { events: s.events, contacts: s.contacts, quickTasks: s.quickTasks, journal: s.journal, quests: s.quests },
      today,
      addDaysStr(today, 7),
    ).slice(0, 6),
    [s.events, s.contacts, s.quickTasks, s.journal, s.quests, today],
  );

  const effectiveOrder = reconcileOrder(s.dashboardOrder);
  const visibleOrder = effectiveOrder.filter(id => !s.dashboardHidden.includes(id));

  const contract = contractStatus(s, today);
  const chestOpenedToday = s.chestLastOpened === today;
  const chestLoot = s.lastChestLoot?.day === today ? s.lastChestLoot : null;
  const contractDone = [contract.habitsOk, contract.journalOk, contract.extraOk].filter(Boolean).length;
  const titleCosmetic = COSMETICS.find(c => c.id === s.equippedCosmetics.title);
  const bannerId = s.equippedCosmetics.banner;
  const showRecap = s.lastRecapDay < today && !!s.dayLog[yesterday];

  const boss = s.boss;
  const bossDef = boss ? BOSSES[boss.attr] : null;
  // Days until Monday's rollover — the boss's remaining lifespan
  const bossDaysLeft = Math.max(1, Math.round((parseDay(addDaysStr(weekKey(today), 7)).getTime() - parseDay(today).getTime()) / 86400000));

  const widgetContent: Record<DashboardWidgetId, React.ReactNode> = {
    dailyContract: (
      <section className="card contract-card">
        <div className="card-head">
          <h2>Daily Contract</h2>
          <span className="muted">{contractDone}/3</span>
        </div>
        <ul className="contract-list">
          <li className={contract.habitsOk ? 'contract-ok' : ''}>
            <span className="contract-check">{contract.habitsOk ? '✓' : '○'}</span>
            All due habits done{contract.habitsDue > 0 ? ` (${contract.habitsDone}/${contract.habitsDue})` : ' — none due today'}
          </li>
          <li className={contract.journalOk ? 'contract-ok' : ''}>
            <span className="contract-check">{contract.journalOk ? '✓' : '○'}</span>
            Journal written
          </li>
          <li className={contract.extraOk ? 'contract-ok' : ''}>
            <span className="contract-check">{contract.extraOk ? '✓' : '○'}</span>
            One extra push — a quick task or a quest session
          </li>
        </ul>
        {chestOpenedToday ? (
          chestLoot ? (
            <div className="chest-opened">
              🎁 {chestLoot.crit && <strong className="chest-crit">CRITICAL! </strong>}
              +{chestLoot.gold + (chestLoot.bonus.kind === 'gold' ? chestLoot.bonus.amount : 0)} 🪙
              {chestLoot.bonus.kind === 'boost' && <> · ⚡ +{chestLoot.bonus.charges} boost charges</>}
              {chestLoot.bonus.kind === 'shield' && <> · 🛡️ Streak Shield</>}
              {chestLoot.bonus.kind === 'cosmetic' && <> · ✨ <Link to="/profile">{chestLoot.bonus.cosmetic.name}</Link></>}
              <span className="muted"> — next chest tomorrow</span>
            </div>
          ) : (
            <div className="chest-opened muted">🎁 Today's chest is opened. Come back tomorrow.</div>
          )
        ) : contract.complete ? (
          <button
            className="btn btn-gold btn-lg chest-btn"
            onClick={e => {
              s.openChest();
              const loot = useGame.getState().lastChestLoot;
              if (loot?.day === today) {
                spawnVFXAt(e, 'gold', loot.gold + (loot.bonus.kind === 'gold' ? loot.bonus.amount : 0));
                if (loot.bonus.kind === 'cosmetic') spawnVFXAt({ clientX: e.clientX + 30, clientY: e.clientY - 16 }, 'item', 1, loot.bonus.cosmetic.name);
              }
            }}
          >
            🎁 Open today's chest
          </button>
        ) : (
          <div className="chest-locked">🔒 Fulfill all three to unlock today's chest — gold, boosts, shields, or a rare cosmetic.</div>
        )}
      </section>
    ),

    weeklyBoss: (
      <section className="card boss-card">
        <div className="card-head">
          <h2>Weekly boss</h2>
          <span className="muted">{bossDaysLeft} day{bossDaysLeft > 1 ? 's' : ''} left</span>
        </div>
        {!boss || !bossDef ? (
          <Empty>The next boss rises on Monday.</Empty>
        ) : (
          <>
            <div className="boss-head">
              <span className="boss-emoji">{bossDef.emoji}</span>
              <div>
                <div className="boss-name">{bossDef.name}</div>
                <div className="muted boss-taunt">"{bossDef.taunt}"</div>
              </div>
            </div>
            {boss.defeatedAt ? (
              <div className="boss-defeated">
                ⚔️ Slain! +{BOSS_REWARD.xp} XP · +{BOSS_REWARD.gold} 🪙 claimed. It re-forms Monday, wherever you're weakest.
              </div>
            ) : (
              <>
                <p className="muted">
                  It feeds on <Icon name={boss.attr} size={13} /> <strong>{ATTRIBUTES[boss.attr].label}</strong>, your weakest attribute.
                  Land {boss.required} {ATTRIBUTES[boss.attr].label}-tagged actions this week — habits, tasks, quests, anything real.
                  Fail by Sunday: <strong>-{BOSS_PENALTY} HP</strong>.
                </p>
                <Bar value={boss.progress} max={boss.required} className="bar-hp" label={`${boss.progress}/${boss.required} strikes`} />
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
          <h2>Today's habits</h2>
          <span className="muted">{doneCount}/{dueHabits.length}</span>
        </div>
        {dueHabits.length === 0 ? (
          <Empty>Nothing scheduled today. <Link to="/habits">Create a habit</Link> to start the engine.</Empty>
        ) : (
          <ul className="list">
            {dueHabits.map(h => {
              const status = s.habitLog[h.id]?.[today];
              return (
                <li key={h.id} className="list-row">
                  <span className={`habit-kind ${h.kind}`} />
                  <span className="list-title">{h.name}</span>
                  <span className="streak" title={`Best: ${h.best}`}>🔥 {h.streak}</span>
                  {status ? (
                    <span className={`status status-${status}`}>{statusLabel(status)}</span>
                  ) : ghostToday ? (
                    <span className="status">👻 frozen</span>
                  ) : h.kind === 'good' ? (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={e => { s.checkinHabit(h.id); spawnVFXAt(e, 'xp', 12); spawnVFXAt({ clientX: e.clientX + 24, clientY: e.clientY - 14 }, 'gold', 5); }}
                    >
                      ✓ Done
                    </button>
                  ) : (
                    <span className="btn-pair">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={e => { s.checkinHabit(h.id); spawnVFXAt(e, 'xp', 8); spawnVFXAt({ clientX: e.clientX + 24, clientY: e.clientY - 14 }, 'gold', 3); }}
                      >
                        ✓ Resisted
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={e => {
                          spawnVFXAt(e, 'damage', missDamage('bad', h.streak));
                          s.relapseHabit(h.id);
                          // No failure record means an Indulgence absorbed it — nothing to reflect on
                          const f = useGame.getState().failures.filter(x => x.habitId === h.id && x.date === today).pop();
                          if (f) setReflect({ failureId: f.id, habitName: h.name });
                        }}
                      >
                        ✗ Relapsed
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
                    className="btn btn-primary btn-sm"
                    onClick={e => {
                      s.checkinHabit(h.id, yesterday);
                      spawnVFXAt(e, 'xp', h.kind === 'good' ? 12 : 8);
                      spawnVFXAt({ clientX: e.clientX + 24, clientY: e.clientY - 14 }, 'gold', h.kind === 'good' ? 5 : 3);
                    }}
                  >
                    {h.kind === 'good' ? '✓ Did it yesterday' : '✓ Resisted yesterday'}
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
          <h2>Life balance</h2>
          <span className="muted">8 attributes</span>
        </div>
        <RadarChart />
      </section>
    ),

    attributes: (
      <section className="card">
        <div className="card-head">
          <h2>Attributes</h2>
          <span className="muted">XP progress</span>
        </div>
        <AttributeProgress />
      </section>
    ),

    quickTasks: (
      <section className="card">
        <div className="card-head">
          <h2>Quick tasks</h2>
          <span className="muted">{openTasks.length} open</span>
        </div>
        <QuickTaskAdd />
        {openTasks.length === 0 ? (
          <Empty>No open tasks. Add a one-off above — small XP, no session tracking.</Empty>
        ) : (
          <ul className="list">
            {openTasks.map(t => (
              <li key={t.id} className="list-row">
                <button
                  className="check"
                  onClick={e => { s.completeQuickTask(t.id); spawnVFXAt(e, 'xp', 8); spawnVFXAt({ clientX: e.clientX + 24, clientY: e.clientY - 14 }, 'gold', 2); }}
                  title="Complete (+8 XP, +2 Gold)"
                >
                  ○
                </button>
                <span className="list-title">{t.title}</span>
                {t.dueDate && <span className="muted">{fmtDay(t.dueDate)}</span>}
                <span className="tag tag-icon"><Icon name={t.attr} size={13} /></span>
                <button className="btn btn-ghost btn-sm" onClick={() => s.deleteQuickTask(t.id)}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    ),

    quests: (
      <section className="card">
        <div className="card-head">
          <h2>Quests</h2>
          <Link to="/quests" className="muted">all →</Link>
        </div>
        {activeQuests.length === 0 ? (
          <Empty>No active quests. <Link to="/quests">Forge one</Link> — the payout scales with the hours you put in.</Empty>
        ) : (
          <ul className="list">
            {(priorityQuests.length > 0 ? priorityQuests : activeQuests.slice(0, 3)).map(q => (
              <li key={q.id} className="list-row">
                {q.priority && <span title="Priority quest">⭐</span>}
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
          <h2>Journal</h2>
          <Link to="/journal" className="muted">archive →</Link>
        </div>
        {journalDone ? (
          <div className="journal-done">
            <span className="big-emoji">{MOODS[(s.journal.find(e => e.date === today)?.mood ?? 3) - 1]}</span>
            <p>Today's reflection is written. +40 XP banked toward Spirituality &amp; Development.</p>
          </div>
        ) : (
          <div className="journal-cta">
            <p className="muted">You haven't reflected today. Mood, stress, three questions — a solid chunk of XP.</p>
            <Link to="/journal" className="btn btn-primary">✍️ Write today's entry</Link>
          </div>
        )}
      </section>
    ),

    calendar: (
      <section className="card">
        <div className="card-head">
          <h2>Calendar</h2>
          <Link to="/calendar" className="muted">full calendar →</Link>
        </div>
        {calendarPreview.length === 0 ? (
          <Empty>Nothing in the next 7 days. Add events, birthdays, or a due date on a quick task.</Empty>
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
            Welcome back, {character.name}
            {titleCosmetic && <span className="char-title"> {titleCosmetic.name}</span>}
          </h1>
          <p className="muted">
            {rank.emoji} {rank.name} · {cls && <Icon name={cls.id} size={13} />} {cls?.name} · {parseDay(today).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="quick-actions">
          <Link className="btn btn-ghost" to="/habits">+ Habit</Link>
          <Link className="btn btn-ghost" to="/quests">+ Quest</Link>
          <Link className="btn btn-ghost" to="/journal">✍️ Journal</Link>
          <button className="btn btn-ghost" onClick={() => setCustomizing(true)} title="Choose which cards show and reorder them">
            <Icon name="grip" size={14} /> Customize
          </button>
        </div>
      </div>

      {character.hp === 0 ? (
        <div className="banner banner-danger">
          💀 Exhausted (0/100 HP) — XP gains are halved and priority quests are locked until you recover. Potions are in the <Link to="/market">Market</Link>.
        </div>
      ) : character.hp <= 25 ? (
        <div className="banner banner-danger">
          ⚠️ Weakened ({character.hp}/100 HP) — XP gains reduced by 25%. Heal up in the <Link to="/market">Market</Link> — or stop missing what you promised yourself.
        </div>
      ) : null}
      {ghostToday && (
        <div className="banner banner-info">👻 Ghost Day active — today is frozen. No penalties, streaks paused. Rest well.</div>
      )}
      {s.effects.comeback && (
        <div className="banner banner-info">
          🌅 Comeback quest: check in {s.effects.comeback.remaining} more habit{s.effects.comeback.remaining > 1 ? 's' : ''} by{' '}
          {fmtDay(s.effects.comeback.expiresDay)} to restore {COMEBACK_HP} HP.
        </div>
      )}
      {s.effects.xpBoostCharges > 0 && (
        <div className="banner banner-info">⚡ Attribute Boost: +50% XP for your next {s.effects.xpBoostCharges} action{s.effects.xpBoostCharges > 1 ? 's' : ''}.</div>
      )}

      {visibleOrder.length === 0 ? (
        <Empty>Every card is hidden. <button className="btn btn-ghost btn-sm" onClick={() => setCustomizing(true)}>Customize</button> to bring some back.</Empty>
      ) : (
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

/** End-of-day closure: the first visit on a new day replays what yesterday earned. */
function RecapModal({ day }: { day: string }) {
  const s = useGame();
  const log = s.dayLog[day] ?? { xp: 0, gold: 0 };
  const due = s.habits.filter(h => habitDueOn(h, day));
  const done = due.filter(h => s.habitLog[h.id]?.[day] === 'done').length;
  const minutes = s.quests.reduce((a, q) => a + q.sessions.filter(x => x.date === day).reduce((b, x) => b + x.minutes, 0), 0);
  const journalWritten = s.journal.some(e => e.date === day);
  const perfect = s.momentum.lastDay === day && s.momentum.streak > 0;
  const momentumPct = Math.round((momentumMult(s.momentum.streak) - 1) * 100);

  return (
    <Modal title={`Yesterday — ${fmtDayFull(day)}`} onClose={s.dismissRecap}>
      <div className="recap-grid">
        <div className="recap-stat"><span className="stat-big">+{log.xp}</span><span className="muted">XP earned</span></div>
        <div className="recap-stat"><span className="stat-big">+{log.gold}</span><span className="muted">Gold earned</span></div>
        {due.length > 0 && (
          <div className="recap-stat"><span className="stat-big">{done}/{due.length}</span><span className="muted">habits done</span></div>
        )}
        {minutes > 0 && (
          <div className="recap-stat"><span className="stat-big">{fmtMinutes(minutes)}</span><span className="muted">quest work</span></div>
        )}
      </div>
      {perfect ? (
        <p className="recap-perfect">🔥 Perfect day! Momentum is at {s.momentum.streak} — everything you do now earns +{momentumPct}% XP.</p>
      ) : due.length > 0 && done < due.length ? (
        <p className="muted">Some habits slipped yesterday. Today is a clean page.</p>
      ) : null}
      {!journalWritten && <p className="muted">No journal entry yesterday — the archive keeps what you give it.</p>}
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={s.dismissRecap}>Onward ⚔️</button>
      </div>
    </Modal>
  );
}

function CustomizeDashboardModal({ order, onClose }: { order: DashboardWidgetId[]; onClose: () => void }) {
  const hidden = useGame(s => s.dashboardHidden);
  const setDashboardOrder = useGame(s => s.setDashboardOrder);
  const toggleDashboardWidget = useGame(s => s.toggleDashboardWidget);
  const resetDashboardLayout = useGame(s => s.resetDashboardLayout);

  return (
    <Modal title="Customize dashboard" onClose={onClose}>
      <p className="muted">Drag to reorder. Click the eye to show or hide a card.</p>
      <Reorder.Group as="ul" axis="y" values={order} onReorder={setDashboardOrder} className="dash-customize-list">
        {order.map(id => (
          <Reorder.Item key={id} value={id} as="li" className="dash-customize-row">
            <Icon name="grip" size={16} className="drag-handle" />
            <span className="dash-customize-label">{DASHBOARD_WIDGETS[id].label}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => toggleDashboardWidget(id)}
              title={hidden.includes(id) ? 'Hidden — click to show' : 'Visible — click to hide'}
            >
              <Icon name={hidden.includes(id) ? 'eyeOff' : 'eye'} size={16} />
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={resetDashboardLayout}>Reset to default</button>
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case 'done': return '✓ done';
    case 'failed': return '✗ failed';
    case 'pardoned': return '📜 pardoned';
    case 'shielded': return '🛡️ shielded';
    case 'ghost': return '👻 frozen';
    case 'indulged': return '🕯️ indulged';
    default: return status;
  }
}

function QuickTaskAdd() {
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
          placeholder="Quick one-off task…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        <input
          className="input qt-due"
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          title="Due date (optional) — shows the task on the Calendar"
        />
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAttr(v => !v)} title="Tag attribute">
          <Icon name={attr[0]} size={14} />
        </button>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={!title.trim()}>Add</button>
      </div>
      {showAttr && <AttrPicker value={attr} onChange={v => { setAttr(v.length ? v : attr); setShowAttr(false); }} single />}
    </div>
  );
}
