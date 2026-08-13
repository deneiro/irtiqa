import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CelebrationLayer } from './components/CelebrationLayer';
import { Layout } from './components/Layout';
import { Achievements } from './pages/Achievements';
import { AttributeDetail } from './pages/AttributeDetail';
import { Attributes } from './pages/Attributes';
import { Calendar } from './pages/Calendar';
import { Chronicle } from './pages/Chronicle';
import { Dashboard } from './pages/Dashboard';
import { Finances } from './pages/Finances';
import { Habits } from './pages/Habits';
import { Journal } from './pages/Journal';
import { LibraryEntry } from './pages/LibraryEntry';
import { Market } from './pages/Market';
import { Onboarding } from './pages/Onboarding';
import { Profile } from './pages/Profile';
import { QuestDetail } from './pages/QuestDetail';
import { Quests } from './pages/Quests';
import { Settings } from './pages/Settings';
import { Social } from './pages/Social';
import { contractStatus } from './game/contract';
import { applyThemeOverrides, habitDueOn, todayStr } from './game/engine';
import { t, useLang } from './i18n';
import { initSync } from './lib/sync';
import { useGame } from './store';

/** Fires the evening reminder once per day, at or after the chosen time, while a tab is open. */
function checkReminder() {
  const st = useGame.getState();
  if (!st.character || !st.reminder.enabled) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const today = todayStr();
  if (st.lastReminderDay === today) return;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (hhmm < st.reminder.time) return;

  const dueLeft = st.habits.filter(h => habitDueOn(h, today) && !st.habitLog[h.id]?.[today]).length;
  const contractOpen = !contractStatus(st, today).complete;
  if (dueLeft > 0 || contractOpen) {
    try {
      // Invitation, not a threat. "Streaks are on the line" makes the notification
      // something to dismiss; naming what's left makes it something to act on.
      new Notification(t('app.name'), {
        body: dueLeft > 0 ? t('reminder.habitsLeft', { n: dueLeft }) : t('reminder.contractOpen'),
      });
    } catch {
      // Some platforms (e.g. Android Chrome) only allow notifications via a service worker
      void navigator.serviceWorker?.ready.then(reg =>
        reg.showNotification(t('app.name'), { body: t('reminder.fallback') }),
      );
    }
  }
  st.markReminderFired(); // once per day, whether or not anything was pending
}

/**
 * HashRouter keeps the window's scroll position across route changes, so clicking
 * a nav item from a scrolled page lands you halfway down the next one. Reset it.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const lang = useLang();
  const character = useGame(s => s.character);
  const theme = useGame(s => s.theme);
  const themeOverrides = useGame(s => s.themeOverrides);
  const reconcile = useGame(s => s.reconcile);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    applyThemeOverrides(document.documentElement, themeOverrides[theme]);
  }, [theme, themeOverrides]);

  // Cloud sync: auth listener + debounced push on every store change (no-op until signed in)
  useEffect(() => {
    initSync();
  }, []);

  // Auto-fail missed habits & post due subscriptions: on load, and re-check
  // every minute so midnight rolling over is caught while the app stays open.
  useEffect(() => {
    reconcile();
    checkReminder();
    const iv = setInterval(() => {
      reconcile();
      checkReminder();
    }, 60_000);
    const onVisible = () => document.visibilityState === 'visible' && reconcile();
    document.addEventListener('visibilitychange', onVisible);
    // Another tab saved: pull its state in so stale tabs can't overwrite it
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'irtiqa-save') useGame.persist.rehydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
    };
  }, [reconcile]);

  if (!character) {
    return (
      <div key={lang}>
        <Onboarding />
        <CelebrationLayer />
      </div>
    );
  }

  // Keying the router on the language remounts the tree when it changes. Components
  // that call useT re-render on their own, but ones that only read a translated
  // constant (ATTRIBUTES[k].label and friends) never subscribed to anything — a
  // remount is the cheap, total guarantee, and switching language is a rare click.
  return (
    <HashRouter key={lang}>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/quests/:id" element={<QuestDetail />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/chronicle" element={<Chronicle />} />
          <Route path="/attributes" element={<Attributes />} />
          <Route path="/attributes/:key" element={<AttributeDetail />} />
          <Route path="/attributes/:key/library/:slug" element={<LibraryEntry />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/social" element={<Social />} />
          <Route path="/finances" element={<Finances />} />
          <Route path="/market" element={<Market />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
