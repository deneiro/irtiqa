import { Component, ReactNode } from 'react';
// A class component can't use the hook, and the plain function is enough here:
// nothing re-renders this screen, it is the last thing drawn before a reload.
import { t } from '../i18n';
import { SAVE_KEY } from '../store';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  downloadSave = () => {
    const raw = localStorage.getItem(SAVE_KEY) ?? '{}';
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `irtiqa-save-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="onboarding">
        <div className="onboarding-inner">
          <h1 className="onb-logo">{t('err.short')}</h1>
          <h2>{t('err.headline')}</h2>
          <p className="muted">{t('err.body')}</p>
          <p className="muted" style={{ fontFamily: 'monospace', fontSize: 12 }}>{String(this.state.error)}</p>
          <div className="onb-actions">
            <button className="btn btn-primary" onClick={() => location.reload()}>↻ {t('err.reload')}</button>
            <button className="btn btn-ghost" onClick={this.downloadSave}>⬇ {t('err.backup')}</button>
          </div>
        </div>
      </div>
    );
  }
}
