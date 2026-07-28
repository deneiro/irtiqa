import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Empty, Modal } from '../components/ui';
import { PayDebtModal } from '../components/PayDebtModal';
import { EXPENSE_CATEGORIES, GOLD_ICON, INCOME_CATEGORIES } from '../game/constants';
import { debtPaid, debtRemaining, fmtDay, fmtDayFull, monthKey, todayStr } from '../game/engine';
import type { Debt } from '../game/types';
import { useGame } from '../store';

export function Finances() {
  const s = useGame();
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
      const cur = map.get(t.accountId) ?? 0;
      map.set(t.accountId, cur + (t.type === 'income' ? t.amount : -t.amount));
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
  const contactName = (id: string) => s.contacts.find(c => c.id === id)?.name ?? 'Deleted contact';

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

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Finances</h1>
          <p className="muted">Track it honestly. Going over budget hurts here the way it hurts out there.</p>
        </div>
        <div className="btn-pair">
          <button className="btn btn-ghost" onClick={() => setAddingAccount(true)}>+ Account</button>
          <button className="btn btn-ghost" disabled={s.accounts.length < 2} onClick={() => setAddingTransfer(true)}>🔁 Transfer</button>
          <button className="btn btn-primary" disabled={s.accounts.length === 0} onClick={() => setAddingTx(true)}>+ Transaction</button>
        </div>
      </div>

      <div className="fin-top">
        <section className="card networth-card">
          <div className="networth-split">
            <div className="networth-block">
              <div className="muted">Cash on hand</div>
              <div className="networth">{Math.max(0, accountsTotal).toLocaleString()}</div>
              <div className="muted networth-sub">The actual money in your accounts, right now.</div>
            </div>
            <div className="networth-block">
              <div className="muted">Net worth</div>
              <div className={`networth ${netWorth < 0 ? 'neg' : ''}`}>{netWorth.toLocaleString()}</div>
              <div className="muted networth-sub">
                {debtNet !== 0
                  ? `Cash ${accountsTotal.toLocaleString()} ${debtNet > 0 ? '+' : '−'} debts ${Math.abs(debtNet).toLocaleString()}`
                  : 'Includes debts — can go negative.'}
              </div>
            </div>
          </div>
          <div className="acct-row">
            {s.accounts.map(a => (
              <div key={a.id} className="acct-chip" title="Account">
                <span>{a.name}</span>
                <strong className={(balances.get(a.id) ?? 0) < 0 ? 'neg' : ''}>{(balances.get(a.id) ?? 0).toLocaleString()}</strong>
                <button className="btn btn-ghost btn-sm" onClick={() => s.deleteAccount(a.id)} title="Delete account">✕</button>
              </div>
            ))}
            {s.accounts.length === 0 && <span className="muted">Add an account (cash, bank card…) to begin.</span>}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Budgets — {new Date().toLocaleDateString(undefined, { month: 'long' })}</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditBudgets(true)}>✎ Set limits</button>
          </div>
          {budgeted.length === 0 ? (
            <Empty>No budget limits set. Set a monthly cap per category — blowing it deals HP damage that scales with the overshoot.</Empty>
          ) : (
            <div className="budget-list">
              {budgeted.map(cat => {
                const budget = s.budgets[cat];
                const spent = monthSpend.get(cat) ?? 0;
                const over = spent > budget;
                return (
                  <div key={cat} className="budget-row">
                    <div className="budget-head">
                      <span>{cat}</span>
                      <span className={over ? 'neg' : 'muted'}>{spent.toLocaleString()} / {budget.toLocaleString()}{over && ' ⚠️'}</span>
                    </div>
                    <Bar value={spent} max={budget} className={over ? 'bar-over' : 'bar-budget'} />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Debts</h2>
          <span className="muted">{openDebts.length} open</span>
        </div>
        {openDebts.length === 0 ? (
          <Empty>No open debts. Track who owes whom in the <Link to="/social">Social Hub</Link> — they'll show up here too.</Empty>
        ) : (
          <ul className="list">
            {openDebts.map(d => {
              const remaining = debtRemaining(d);
              const paid = debtPaid(d);
              return (
                <li key={d.id} className="list-row">
                  <span>{d.direction === 'theyOwe' ? '⬅️' : '➡️'}</span>
                  <span className="list-title">
                    {contactName(d.contactId)} {d.direction === 'theyOwe' ? 'owes you' : '— you owe'} {remaining}
                    {paid > 0 && <span className="muted"> (paid {paid} of {d.amount})</span>}
                  </span>
                  <span className="muted">{d.note}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPayingDebt(d)} title="Log a payment">💳 Pay</button>
                </li>
              );
            })}
          </ul>
        )}
        {settledDebts.length > 0 && (
          <>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setShowSettledDebts(v => !v)}>
              {showSettledDebts ? 'hide' : 'show'} settled ({settledDebts.length})
            </button>
            {showSettledDebts && (
              <ul className="list list-tight">
                {settledDebts.map(d => (
                  <li key={d.id} className="list-row">
                    <span>✓</span>
                    <span className="list-title">{contactName(d.contactId)} · {d.amount}</span>
                    <span className="muted">settled {d.settledAt ? fmtDayFull(d.settledAt.slice(0, 10)) : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Subscriptions</h2>
          <button className="btn btn-ghost btn-sm" disabled={s.accounts.length === 0} onClick={() => setAddingSub(true)}>+ Add</button>
        </div>
        {activeSubs.length === 0 ? (
          <Empty>No recurring subscriptions. Add them and they post themselves on their due day.</Empty>
        ) : (
          <ul className="list">
            {activeSubs.map(sub => (
              <li key={sub.id} className="list-row">
                <span>🔄</span>
                <span className="list-title">{sub.name}</span>
                <span className="muted">{sub.amount.toLocaleString()} / mo · next {fmtDay(sub.nextDue)} · {s.accounts.find(a => a.id === sub.accountId)?.name}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => s.cancelSubscription(sub.id)}>Cancel</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="card-head"><h2>Transactions</h2><span className="muted">{s.txs.length} total</span></div>
        {recent.length === 0 ? (
          <Empty>Nothing logged. Income earns XP toward 💰 Money; in-budget expenses do too.</Empty>
        ) : (
          <ul className="list">
            {recent.map(t => (
              <li key={t.id} className="list-row">
                <span>{t.transferId ? '🔁' : t.type === 'income' ? '🟢' : '🔴'}</span>
                <span className="list-title">{t.note || t.category}</span>
                <span className="tag">{t.category}</span>
                <span className="muted">{fmtDay(t.date)} · {s.accounts.find(a => a.id === t.accountId)?.name ?? '?'}</span>
                <span className={t.type === 'income' ? 'amount-pos' : 'amount-neg'}>
                  {t.type === 'income' ? '+' : '−'}{t.amount.toLocaleString()}
                </span>
                {t.date === today && (
                  <button className="btn btn-ghost btn-sm" onClick={() => s.deleteTransaction(t.id)} title="Delete (today's entries only)">✕</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

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
  const addAccount = useGame(s => s.addAccount);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState(0);
  return (
    <Modal title="New account" onClose={onClose}>
      <label className="field"><span>Name</span>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Cash / Kaspi / Bank…" autoFocus />
      </label>
      <label className="field"><span>Current balance</span>
        <input className="input" type="number" value={balance || ''} onChange={e => setBalance(Number(e.target.value))} />
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!name.trim()} onClick={() => { addAccount(name, balance || 0); onClose(); }}>Add</button>
      </div>
    </Modal>
  );
}

function TransferForm({ onClose }: { onClose: () => void }) {
  const s = useGame();
  const [fromAccountId, setFromAccountId] = useState(s.accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(s.accounts[1]?.id ?? '');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');

  const valid = amount > 0 && fromAccountId && toAccountId && fromAccountId !== toAccountId;

  return (
    <Modal title="Transfer between accounts" onClose={onClose}>
      <p className="muted">Moving your own money doesn't earn XP and never touches a budget — it's neither income nor spending.</p>
      <label className="field"><span>From</span>
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
      <label className="field"><span>To</span>
        <select className="input" value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
          {s.accounts.filter(a => a.id !== fromAccountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <label className="field"><span>Amount</span>
        <input className="input" type="number" min={0} value={amount || ''} onChange={e => setAmount(Number(e.target.value))} autoFocus />
      </label>
      <label className="field"><span>Note (optional)</span>
        <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="optional" />
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          disabled={!valid}
          onClick={() => { s.transferMoney(fromAccountId, toAccountId, amount, note.trim() || undefined); onClose(); }}
        >
          Transfer
        </button>
      </div>
    </Modal>
  );
}

function TxForm({ onClose }: { onClose: () => void }) {
  const s = useGame();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [accountId, setAccountId] = useState(s.accounts[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayStr());

  const cats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <Modal title="New transaction" onClose={onClose}>
      <div className="field">
        <span>Type</span>
        <div className="seg">
          <button type="button" className={type === 'expense' ? 'seg-on' : ''} onClick={() => { setType('expense'); setCategory(EXPENSE_CATEGORIES[0]); }}>🔴 Expense</button>
          <button type="button" className={type === 'income' ? 'seg-on' : ''} onClick={() => { setType('income'); setCategory(INCOME_CATEGORIES[0]); }}>🟢 Income</button>
        </div>
      </div>
      <label className="field"><span>Amount</span>
        <input className="input" type="number" min={0} value={amount || ''} onChange={e => setAmount(Number(e.target.value))} autoFocus />
      </label>
      <label className="field"><span>Category</span>
        <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label className="field"><span>Account</span>
        <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
          {s.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <label className="field"><span>Note</span>
        <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="optional" />
      </label>
      <label className="field"><span>Date (this month only — budgets can't be dodged by backdating)</span>
        <input className="input" type="date" value={date} min={todayStr().slice(0, 8) + '01'} max={todayStr()} onChange={e => setDate(e.target.value)} />
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          disabled={amount <= 0 || !accountId || !date}
          onClick={() => { s.addTransaction({ type, amount, category, accountId, note: note.trim(), date }); onClose(); }}
        >
          Log it
        </button>
      </div>
    </Modal>
  );
}

function SubForm({ onClose }: { onClose: () => void }) {
  const s = useGame();
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState(s.accounts[0]?.id ?? '');
  const [category, setCategory] = useState('Subscriptions');
  const [dayOfMonth, setDayOfMonth] = useState(1);

  return (
    <Modal title="New subscription" onClose={onClose}>
      <label className="field"><span>Amount per month</span>
        <input className="input" type="number" min={0} value={amount || ''} onChange={e => setAmount(Number(e.target.value))} autoFocus />
      </label>
      <label className="field"><span>Category</span>
        <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
          {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label className="field"><span>Account</span>
        <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
          {s.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <label className="field"><span>Charged on day of month (1–28)</span>
        <input className="input" type="number" min={1} max={28} value={dayOfMonth} onChange={e => setDayOfMonth(Math.min(28, Math.max(1, Number(e.target.value))))} />
      </label>
      <p className="muted">It'll show up on the <Link to="/calendar">Calendar</Link> on its charge day every month.</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          disabled={amount <= 0 || !accountId}
          onClick={() => { s.addSubscription({ name: category, amount, accountId, category, dayOfMonth }); onClose(); }}
        >
          Add subscription
        </button>
      </div>
    </Modal>
  );
}

function BudgetForm({ onClose }: { onClose: () => void }) {
  const s = useGame();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c, s.budgets[c] ? String(s.budgets[c]) : ''])),
  );
  return (
    <Modal title="Monthly budget limits" onClose={onClose}>
      <p className="muted">Leave blank for no limit. Over the limit, every extra expense deals HP damage that scales with the overshoot.</p>
      {EXPENSE_CATEGORIES.map(c => (
        <label className="field field-inline" key={c}>
          <span>{c}</span>
          <input
            className="input input-sm"
            type="number"
            min={0}
            placeholder="no limit"
            value={values[c]}
            onChange={e => setValues(v => ({ ...v, [c]: e.target.value }))}
          />
        </label>
      ))}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={() => { for (const c of EXPENSE_CATEGORIES) s.setBudget(c, Number(values[c]) || 0); onClose(); }}
        >
          Save limits
        </button>
      </div>
    </Modal>
  );
}
