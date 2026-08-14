import { useState } from 'react';
import { useT } from '../i18n';
import { signIn, signUp } from '../lib/sync';

export function AuthPanel() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const valid = email.trim().includes('@') && password.length >= 6;

  const go = async (fn: typeof signIn) => {
    setBusy(true);
    setMessage(null);
    const res = await fn(email.trim(), password);
    setMessage(res.message);
    setIsError(!res.ok);
    setBusy(false);
  };

  return (
    <div className="auth-panel">
      <input
        className="input"
        type="email"
        autoComplete="email"
        placeholder={t('auth.emailPh')}
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        className="input"
        type="password"
        autoComplete="current-password"
        placeholder={t('auth.passwordPh')}
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && valid && !busy && void go(signIn)}
      />
      <div className="btn-pair">
        <button className="btn btn-primary" disabled={busy || !valid} onClick={() => void go(signIn)}>
          {t('auth.signIn')}
        </button>
        <button className="btn btn-ghost" disabled={busy || !valid} onClick={() => void go(signUp)}>
          {t('auth.createAccount')}
        </button>
      </div>
      {message && <p className={isError ? 'neg' : 'muted'}>{message}</p>}
    </div>
  );
}
