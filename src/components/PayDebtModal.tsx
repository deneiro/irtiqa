import { useState } from 'react';
import { debtRemaining } from '../game/engine';
import { fmtMoney } from '../game/money';
import type { Debt } from '../game/types';
import { useGame } from '../store';
import { Modal } from './ui';

/** Shared by Social Hub and Finances — logs a partial or full debt payment, optionally as a real transaction. */
export function PayDebtModal({ debt, contactName, onClose }: { debt: Debt; contactName: string; onClose: () => void }) {
  const s = useGame();
  const remaining = debtRemaining(debt);
  const [amount, setAmount] = useState(remaining);
  const [accountId, setAccountId] = useState('');

  const iOwe = debt.direction === 'iOwe';
  // Every figure here is real money, so it carries the currency symbol. Reached from the
  // Social Hub too, where nothing else on screen is money — the symbol is what says so.
  const money = (n: number) => fmtMoney(n, s.currency);

  return (
    <Modal title={`Pay ${contactName}`} onClose={onClose}>
      <p>
        {iOwe ? 'You owe' : `${contactName} owes you`} <strong>{money(remaining)}</strong>
        {remaining < debt.amount && <span className="muted"> (of {money(debt.amount)} originally)</span>}
        {debt.note && <span className="muted"> · {debt.note}</span>}
      </p>
      <label className="field">
        <span>Payment amount ({s.currency})</span>
        <input
          className="input"
          type="number"
          min={0}
          max={remaining}
          value={amount || ''}
          autoFocus
          onChange={e => setAmount(Math.min(remaining, Math.max(0, Number(e.target.value))))}
        />
      </label>
      <label className="field">
        <span>Post as a transaction? (optional)</span>
        <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
          <option value="">Just record the payment — don't touch Finances</option>
          {s.accounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.name} — {iOwe ? 'pay from this account' : 'deposit into this account'}
            </option>
          ))}
        </select>
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          disabled={amount <= 0}
          onClick={() => { s.payDebt(debt.id, amount, accountId || undefined); onClose(); }}
        >
          {amount >= remaining ? 'Pay in full' : `Log payment of ${money(amount)}`}
        </button>
      </div>
    </Modal>
  );
}
