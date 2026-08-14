import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Bar, Empty, Modal } from '../components/ui';
import { PayDebtModal } from '../components/PayDebtModal';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../game/constants';
import { debtPaid, debtRemaining, fmtDay, fmtDayFull, monthKey, todayStr } from '../game/engine';
import { CURRENCIES, fmtMoney, fmtMoneyCompact } from '../game/money';
import type { Debt } from '../game/types';
import { plural, t as tr, useT } from '../i18n';
import { locale } from '../lib/format';
import { useGame } from '../store';

/**
 * Every amount on this page is real money and goes through fmtMoney, which stamps it
 * with the chosen currency symbol. Gold is the other economy and is rendered with a
 * coin icon elsewhere; nothing here may look like it.
 *
 * Arrow direction is one consistent rule across the whole page: arrowUp = money moving
 * in your favour (income, someone owes you), arrowDown = money leaving (an expense, a
 * debt you carry). Colour repeats the same fact for anyone who reads shape slowly.
 */
export function Finances() {
  const t = useT();
  const s = useGame();
  const cur = s.currency;
  const money = (n: number) => fmtMoney(n, cur);
  const today = todayStr();
  const thisMonth = monthKey(today);
  const [addingTx, setAddingTx] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [addingTransfer, setAddingTransfer] = useState(false);
  const [addingSub, setAddingSub] = useState(false);
  const [editBudgets, setEditBudgets] = useState(false);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [showSettledDebts, setShowSettledDebts] = useState(false);

  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of s.accounts) map.set(a.id, a.initialBalance);
    for (const t of s.txs) {
      const running = map.get(t.accountId) ?? 0;
      map.set(t.accountId, running + (t.type === 'income' ? t.amount : -t.amount));
    }
    return map;
  }, [s.accounts, s.txs]);

  const accountsTotal = [...balances.values()].reduce((a, b) => a + b, 0);

  const openDebts = useMemo(
    () => [...s.debts.filter(d => !d.settledAt)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [s.debts],
  );
  const settledDebts = useMemo(
    () => [...s.debts.filter(d => d.settledAt)].sort((a, b) => (b.settledAt ?? '').localeCompare(a.settledAt ?? '')).slice(0, 10),
    [s.debts],
  );
  const debtNet = openDebts.reduce((a, d) => a + (d.direction === 'theyOwe' ? debtRemaining(d) : -debtRemaining(d)), 0);
  const netWorth = accountsTotal + debtNet;
  const contactName = (id: string) => s.contacts.find(c => c.id === id)?.name ?? tr('fin.deletedContact');

  const monthSpend = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of s.txs) {
      if (t.type !== 'expense' || monthKey(t.date) !== thisMonth) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return map;
  }, [s.txs, thisMonth]);

  const budgeted = EXPENSE_CATEGORIES.filter(c => (s.budgets[c] ?? 0) > 0);
  const recent = useMemo(() => [...s.txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50), [s.txs]);
  const activeSubs = s.subs.filter(x => x.active);
  const cash = Math.max(0, accountsTotal);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t('nav.finances')}</h1>
          <p className="muted">{t('fin.subtitle')}</p>
        </div>
        <div className="btn-pair fin-head-actions">
          {/* The currency belongs here rather than in Settings: this is the only page where
              it changes what you read, so it is set where it is felt. */}
          <label className="fin-currency">
            <span className="muted">{t('settings.currency')}</span>
            <select
              className="input input-sm"
              aria-label={t('fin.currencyAria')}
              value={cur}
              onChange={e => s.setCurrency(e.target.value)}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
              ))}
            </select>
          </label>
          <button className="btn btn-ghost" data-tour="new-account" onClick={() => setAddingAccount(true)}><Icon name="plus" size={14} /> {t('fin.account')}</button>
          <button className="btn btn-primary" data-tour="new-tx" disabled={s.accounts.length === 0} onClick={() => setAddingTx(true)}>
            <Icon name="plus" size={14} /> {t('fin.txShort')}
          </button>
        </div>
      </div>

      <section className="card networth-card" data-tour="networth">
        <div className="networth-split">
          <div className="networth-block">
            <div className="muted">{t('fin.cashOnHand')}</div>
            {/* Headline figures are compacted — at 32px a seven-figure balance overflows its
                block on a phone. The exact amount stays one hover away. */}
            <div className="networth" title={money(cash)}>{fmtMoneyCompact(cash, cur)}</div>
            <div className="muted networth-sub">{t('fin.cashSub')}</div>
          </div>
          <div className="networth-block">
            <div className="muted">{t('fin.netWorth')}</div>
            <div className={`networth ${netWorth < 0 ? 'neg' : ''}`} title={money(netWorth)}>{fmtMoneyCompact(netWorth, cur)}</div>
            <div className="muted networth-sub">
              {debtNet !== 0
                ? t('fin.netWorthBreakdown', { cash: money(accountsTotal), sign: debtNet > 0 ? '+' : '−', debts: money(Math.abs(debtNet)) })
                : t('fin.netWorthSub')}
            </div>
          </div>
        </div>
        <div className="acct-row">
          {s.accounts.map(a => (
            <div key={a.id} className="acct-chip">
              <span className="acct-name">{a.name}</span>
              <strong className={(balances.get(a.id) ?? 0) < 0 ? 'neg' : ''}>{money(balances.get(a.id) ?? 0)}</strong>
              <button className="btn btn-ghost btn-sm" onClick={() => s.deleteAccount(a.id)} title={t('fin.deleteAccount', { name: a.name })} aria-label={t('fin.deleteAccount', { name: a.name })}>
                <Icon name="trash" size={13} />
              </button>
            </div>
          ))}
          {s.accounts.length === 0 && (
            <Empty>
              {t('fin.noAccounts')}{' '}
              <button className="btn btn-ghost btn-sm fin-empty-action" onClick={() => setAddingAccount(true)}>{t('fin.addAccount')}</button>
            </Empty>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{t('fin.debts')}</h2>
          <span className="muted">{t('fin.openCount', { n: openDebts.length })}</span>
        </div>
        {openDebts.length === 0 ? (
          <Empty>{t('fin.noDebts')} <Link to="/social">{t('fin.socialHub')}</Link>{t('fin.noDebtsTail')}</Empty>
        ) : (
          <ul className="list">
            {openDebts.map(d => {
              const remaining = debtRemaining(d);
              const paid = debtPaid(d);
              const theyOwe = d.direction === 'theyOwe';
              return (
                <li key={d.id} className="list-row">
                  <Icon name={theyOwe ? 'arrowUp' : 'arrowDown'} size={15} className={theyOwe ? 'fin-in' : 'fin-out'} />
                  <span className="list-title">
                    {contactName(d.contactId)} {theyOwe ? t('fin.owesYou') : t('fin.youOweDash')} {money(remaining)}
                    {paid > 0 && <span className="muted"> {t('fin.paidOf', { paid: money(paid), total: money(d.amount) })}</span>}
                  </span>
                  <span className="muted">{d.note}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPayingDebt(d)} title={t('fin.logPayment')}>
                    <Icon name="card" size={13} /> {t('fin.pay')}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {settledDebts.length > 0 && (
          <>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setShowSettledDebts(v => !v)}>
              {showSettledDebts ? t('habits.hide') : t('habits.show')} {t('fin.settledCount', { n: settledDebts.length })}
            </button>
            {showSettledDebts && (
              <ul className="list list-tight">
                {settledDebts.map(d => (
                  <li key={d.id} className="list-row">
                    <Icon name="check" size={14} className="fin-in" />
                    <span className="list-title">{contactName(d.contactId)} · {money(d.amount)}</span>
                    <span className="muted">{t('fin.settledOn', { date: d.settledAt ? fmtDayFull(d.settledAt.slice(0, 10)) : '' })}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{t('cat.Subscriptions')}</h2>
          <button className="btn btn-ghost btn-sm" disabled={s.accounts.length === 0} onClick={() => setAddingSub(true)}>
            <Icon name="plus" size={13} /> {t('common.add')}
          </button>
        </div>
        {activeSubs.length === 0 ? (
          <Empty>
            {t('fin.noSubs')}{' '}
            {s.accounts.length === 0 ? (
              <button className="btn btn-ghost btn-sm fin-empty-action" onClick={() => setAddingAccount(true)}>{t('fin.addAccountFirst')}</button>
            ) : (
              <button className="btn btn-ghost btn-sm fin-empty-action" onClick={() => setAddingSub(true)}>{t('fin.addSub')}</button>
            )}
          </Empty>
        ) : (
          <ul className="list">
            {activeSubs.map(sub => (
              <li key={sub.id} className="list-row">
                <Icon name="subscription" size={15} className="fin-out" />
                <span className="list-title">{sub.name}</span>
                <span className="muted">{t('fin.perMonth', { amount: money(sub.amount) })} · {t('fin.next', { date: fmtDay(sub.nextDue) })} · {s.accounts.find(a => a.id === sub.accountId)?.name}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => s.cancelSubscription(sub.id)}>{t('fin.cancelSub')}</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="card-head"><h2>{t('fin.transactions')}</h2><span className="muted">{t('fin.totalCount', { n: s.txs.length })}</span></div>
        {recent.length === 0 ? (
          <Empty>
            {/* The Money attribute is named, not iconed: its icon is Coins, the same glyph as Gold,
                and a coin on the Finances page reads as currency — the one confusion this page exists
                to avoid. Everywhere else the attribute icon is unambiguous and still used. */}
            {t('fin.noTxs')}{' '}
            {s.accounts.length === 0 ? (
              <button className="btn btn-ghost btn-sm fin-empty-action" onClick={() => setAddingAccount(true)}>{t('fin.addAccountFirst')}</button>
            ) : (
              <button className="btn btn-ghost btn-sm fin-empty-action" onClick={() => setAddingTx(true)}>{t('fin.logFirst')}</button>
            )}
          </Empty>
        ) : (
          <ul className="list">
            {recent.map(tx => {
              const income = tx.type === 'income';
              return (
                <li key={tx.id} className="list-row">
                  {/* A transfer is neither income nor spending, so it gets its own mark rather
                      than a green/red arrow that would claim your total moved. */}
                  {tx.transferId
                    ? <Icon name="banknote" size={15} className="muted" />
                    : <Icon name={income ? 'arrowUp' : 'arrowDown'} size={15} className={income ? 'fin-in' : 'fin-out'} />}
                  <span className="list-title">{tx.note || t(`cat.${tx.category}`)}</span>
                  <span className="tag">{t(`cat.${tx.category}`)}</span>
                  <span className="muted">{fmtDay(tx.date)} · {s.accounts.find(a => a.id === tx.accountId)?.name ?? '?'}</span>
                  <span className={income ? 'amount-pos' : 'amount-neg'}>
                    {income ? '+' : '−'}{money(tx.amount)}
                  </span>
                  {tx.date === today && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => s.deleteTransaction(tx.id)}
                      title={t('fin.deleteTodayOnly')}
                      aria-label={t('fin.deleteEntry')}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Budgets and transfers are real features that most days you don't need. Folding them
          away keeps the page to the four things you open it for: money, debts, subs, entries. */}
      <details className="fin-advanced" data-tour="advanced">
        <summary className="fin-advanced-summary">
          <Icon name="chevronRight" size={14} className="fin-caret" />
          <span>{t('fin.advanced')}</span>
          <span className="muted">{t('fin.advancedSub')}</span>
        </summary>
        <div className="fin-advanced-body">
          <section className="card">
            <div className="card-head">
              <h2>{t('fin.budgets')} — {new Date().toLocaleDateString(locale(), { month: 'long' })}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditBudgets(true)}><Icon name="edit" size={13} /> {t('fin.setLimits')}</button>
            </div>
            {budgeted.length === 0 ? (
              <Empty>
                {t('fin.noBudgets')}{' '}
                <button className="btn btn-ghost btn-sm fin-empty-action" onClick={() => setEditBudgets(true)}>{t('fin.setLimits')}</button>
              </Empty>
            ) : (
              <div className="budget-list">
                {budgeted.map(cat => {
                  const budget = s.budgets[cat];
                  const spent = monthSpend.get(cat) ?? 0;
                  const over = spent > budget;
                  return (
                    <div key={cat} className="budget-row">
                      <div className="budget-head">
                        <span>{t(`cat.${cat}`)}</span>
                        <span className={over ? 'neg' : 'muted'}>
                          {over && <Icon name="warning" size={13} />} {money(spent)} / {money(budget)}
                        </span>
                      </div>
                      <Bar value={spent} max={budget} className={over ? 'bar-over' : 'bar-budget'} />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-head"><h2>{t('fin.transfer')}</h2></div>
            <p className="muted">{t('fin.transferDesc')}</p>
            <button className="btn btn-ghost" disabled={s.accounts.length < 2} onClick={() => setAddingTransfer(true)}>
              <Icon name="banknote" size={14} /> {t('fin.moveMoney')}
            </button>
            {s.accounts.length < 2 && <p className="muted fin-hint">{t('fin.needTwoAccounts')}</p>}
          </section>
        </div>
      </details>

      {addingAccount && <AccountForm onClose={() => setAddingAccount(false)} />}
      {addingTransfer && <TransferForm onClose={() => setAddingTransfer(false)} />}
      {addingTx && <TxForm onClose={() => setAddingTx(false)} />}
      {addingSub && <SubForm onClose={() => setAddingSub(false)} />}
      {editBudgets && <BudgetForm onClose={() => setEditBudgets(false)} />}
      {payingDebt && <PayDebtModal debt={payingDebt} contactName={contactName(payingDebt.contactId)} onClose={() => setPayingDebt(null)} />}
    </div>
  );
}

function AccountForm({ onClose }: { onClose: () => void }) {
  const t = useT();
  const addAccount = useGame(s => s.addAccount);
  const currency = useGame(s => s.currency);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState(0);
  return (
    <Modal title={t('fin.newAccount')} onClose={onClose}>
      <label className="field"><span>{t('habits.fieldName')}</span>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={t('fin.accountPh')} autoFocus />
      </label>
      <label className="field"><span>{t('fin.currentBalance', { currency })}</span>
        <input className="input" type="number" value={balance || ''} onChange={e => setBalance(Number(e.target.value))} />
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn-primary" disabled={!name.trim()} onClick={() => { addAccount(name, balance || 0); onClose(); }}>{t('common.add')}</button>
      </div>
    </Modal>
  );
}

function TransferForm({ onClose }: { onClose: () => void }) {
  const t = useT();
  const s = useGame();
  const [fromAccountId, setFromAccountId] = useState(s.accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(s.accounts[1]?.id ?? '');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');

  const valid = amount > 0 && fromAccountId && toAccountId && fromAccountId !== toAccountId;

  return (
    <Modal title={t('fin.transferTitle')} onClose={onClose}>
      <p className="muted">{t('fin.transferModalDesc')}</p>
      <label className="field"><span>{t('fin.from')}</span>
        <select
          className="input"
          value={fromAccountId}
          onChange={e => {
            const v = e.target.value;
            setFromAccountId(v);
            if (v === toAccountId) setToAccountId(s.accounts.find(a => a.id !== v)?.id ?? '');
          }}
        >
          {s.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <label className="field"><span>{t('fin.to')}</span>
        <select className="input" value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
          {s.accounts.filter(a => a.id !== fromAccountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <label className="field"><span>Amount ({s.currency})</span>
        <input className="input" type="number" min={0} value={amount || ''} onChange={e => setAmount(Number(e.target.value))} autoFocus />
      </label>
      <label className="field"><span>{t('fin.noteOptional')}</span>
        <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="optional" />
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button
          className="btn btn-primary"
          disabled={!valid}
          onClick={() => { s.transferMoney(fromAccountId, toAccountId, amount, note.trim() || undefined); onClose(); }}
        >
          {amount > 0 ? t('fin.transferAmount', { amount: fmtMoney(amount, s.currency) }) : t('fin.transfer')}
        </button>
      </div>
    </Modal>
  );
}

function TxForm({ onClose }: { onClose: () => void }) {
  const t = useT();
  const s = useGame();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [accountId, setAccountId] = useState(s.accounts[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayStr());

  const cats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <Modal title={t('fin.newTx')} onClose={onClose}>
      <div className="field">
        <span>{t('habits.fieldType')}</span>
        <div className="seg">
          <button type="button" className={type === 'expense' ? 'seg-on' : ''} onClick={() => { setType('expense'); setCategory(EXPENSE_CATEGORIES[0]); }}>
            <Icon name="arrowDown" size={13} /> {t('fin.expense')}
          </button>
          <button type="button" className={type === 'income' ? 'seg-on' : ''} onClick={() => { setType('income'); setCategory(INCOME_CATEGORIES[0]); }}>
            <Icon name="arrowUp" size={13} /> {t('fin.income')}
          </button>
        </div>
      </div>
      <label className="field"><span>Amount ({s.currency})</span>
        <input className="input" type="number" min={0} value={amount || ''} onChange={e => setAmount(Number(e.target.value))} autoFocus />
      </label>
      <label className="field"><span>{t('fin.category')}</span>
        <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
          {cats.map(c => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}
        </select>
      </label>
      <label className="field"><span>{t('fin.account')}</span>
        <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
          {s.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <label className="field"><span>{t('fin.note')}</span>
        <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="optional" />
      </label>
      <label className="field"><span>{t('fin.dateThisMonth')}</span>
        <input className="input" type="date" value={date} min={todayStr().slice(0, 8) + '01'} max={todayStr()} onChange={e => setDate(e.target.value)} />
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button
          className="btn btn-primary"
          disabled={amount <= 0 || !accountId || !date}
          onClick={() => { s.addTransaction({ type, amount, category, accountId, note: note.trim(), date }); onClose(); }}
        >
          {t('fin.logIt')}
        </button>
      </div>
    </Modal>
  );
}

function SubForm({ onClose }: { onClose: () => void }) {
  const t = useT();
  const s = useGame();
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState(s.accounts[0]?.id ?? '');
  const [category, setCategory] = useState('Subscriptions');
  const [dayOfMonth, setDayOfMonth] = useState(1);

  return (
    <Modal title={t('fin.newSub')} onClose={onClose}>
      <label className="field"><span>{t('fin.amountPerMonth', { currency: s.currency })}</span>
        <input className="input" type="number" min={0} value={amount || ''} onChange={e => setAmount(Number(e.target.value))} autoFocus />
      </label>
      <label className="field"><span>{t('fin.category')}</span>
        <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}
        </select>
      </label>
      <label className="field"><span>Account</span>
        <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
          {s.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <label className="field"><span>{t('fin.chargedOnDay')}</span>
        <input className="input" type="number" min={1} max={28} value={dayOfMonth} onChange={e => setDayOfMonth(Math.min(28, Math.max(1, Number(e.target.value))))} />
      </label>
      <p className="muted">{t('fin.subCalendarNote')} <Link to="/calendar">{t('nav.calendar')}</Link>{t('fin.subCalendarNoteTail')}</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button
          className="btn btn-primary"
          disabled={amount <= 0 || !accountId}
          onClick={() => { s.addSubscription({ name: category, amount, accountId, category, dayOfMonth }); onClose(); }}
        >
          {t('fin.addSub')}
        </button>
      </div>
    </Modal>
  );
}

function BudgetForm({ onClose }: { onClose: () => void }) {
  const t = useT();
  const s = useGame();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c, s.budgets[c] ? String(s.budgets[c]) : ''])),
  );
  return (
    <Modal title={t('fin.budgetTitle')} onClose={onClose}>
      <p className="muted">{t('fin.budgetDesc', { currency: s.currency })}</p>
      {EXPENSE_CATEGORIES.map(c => (
        <label className="field field-inline" key={c}>
          <span>{t(`cat.${c}`)}</span>
          <input
            className="input input-sm"
            type="number"
            min={0}
            placeholder={t('fin.noLimit')}
            value={values[c]}
            onChange={e => setValues(v => ({ ...v, [c]: e.target.value }))}
          />
        </label>
      ))}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button
          className="btn btn-primary"
          onClick={() => { for (const c of EXPENSE_CATEGORIES) s.setBudget(c, Number(values[c]) || 0); onClose(); }}
        >
          {t('fin.saveLimits')}
        </button>
      </div>
    </Modal>
  );
}
