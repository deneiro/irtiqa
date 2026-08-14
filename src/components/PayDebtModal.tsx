import { useState } from 'react';
import { debtRemaining } from '../game/engine';
import { fmtMoney } from '../game/money';
import type { Debt } from '../game/types';
import { useT } from '../i18n';
import { useGame } from '../store';
import { Modal } from './ui';

/** Shared by Social Hub and Finances — logs a partial or full debt payment, optionally as a real transaction. */
export function PayDebtModal({ debt, contactName, onClose }: { debt: Debt; contactName: string; onClose: () => void }) {
  const t = useT();
  const s = useGame();
  const remaining = debtRemaining(debt);
  const [amount, setAmount] = useState(remaining);
  const [accountId, setAccountId] = useState('');

  const iOwe = debt.direction === 'iOwe';
  // Every figure here is real money, so it carries the currency symbol. Reached from the
  // Social Hub too, where nothing else on screen is money — the symbol is what says so.
  const money = (n: number) => fmtMoney(n, s.currency);

  return (
    <Modal title={t('debt.payTitle', { name: contactName })} onClose={onClose}>
      <p>
        {iOwe ? t('debt.youOwe') : t('debt.owesYou', { name: contactName })} <strong>{money(remaining)}</strong>
        {remaining < debt.amount && <span className="muted"> {t('debt.ofOriginally', { amount: money(debt.amount) })}</span>}
        {debt.note && <span className="muted"> · {debt.note}</span>}
      </p>
      <label className="field">
        <span>{t('debt.paymentAmount', { currency: s.currency })}</span>
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
        <span>{t('debt.postAsTx')}</span>
        <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
          <option value="">{t('debt.justRecord')}</option>
          {s.accounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.name} — {iOwe ? t('debt.payFrom') : t('debt.depositInto')}
            </option>
          ))}
        </select>
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button
          className="btn btn-primary"
          disabled={amount <= 0}
          onClick={() => { s.payDebt(debt.id, amount, accountId || undefined); onClose(); }}
        >
          {amount >= remaining ? t('debt.payInFull') : t('debt.logPayment', { amount: money(amount) })}
        </button>
      </div>
    </Modal>
  );
}
