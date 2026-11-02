import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { StoreProvider, useStore } from "./store";
import Sidebar from "./components/Sidebar";
import CommandPalette from "./components/CommandPalette";
import Home from "./pages/Home";
import DayPage from "./pages/Day";
import MorningPage from "./pages/Morning";
import HabitsPage from "./pages/Habits";
import QuestsPage from "./pages/Quests";
import FinancePage from "./pages/Finance";
import ClaudePage from "./pages/Claude";
import ToolsPage from "./pages/Tools";
import CalendarPage from "./pages/Calendar";
import Back from "./components/Back";
import WheelPage from "./pages/Wheel";
import EventPage from "./pages/Event";
import QuestPage from "./pages/Quest";
import SessionNote from "./components/SessionNote";
import { useSubscriptionCharges } from "./lib/useSubscriptionCharges";
import ThemePage from "./pages/Theme";
import PageView from "./pages/Page";
import FeedPage from "./pages/Feed";
import TrendsPage from "./pages/Trends";
import SearchPage from "./pages/Search";
import ProfilePage from "./pages/Profile";
import PeoplePage from "./pages/People";
import RawPage from "./pages/Raw";
import SetupPage from "./pages/Setup";
import { useEffect } from "react";
import { useT } from "./lib/i18n";

function Shell() {
  const { vault, loading, error, setPaletteOpen, lang } = useStore();
  const { t } = useT();
  const loc = useLocation();
  useSubscriptionCharges();

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPaletteOpen]);

  useEffect(() => {
    document.querySelector(".main")?.scrollTo(0, 0);
  }, [loc.pathname]);

  if (!vault && (loading || error || loc.pathname === "/setup")) {
    return (
      <div className="app">
        <Sidebar />
        <main className="main">
          {loading && !error ? <div className="center muted">{t("reading")}</div> : <SetupPage />}
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Back />
        <Routes>
          <Route path="/" element={<MorningPage />} />
          <Route path="/day" element={<DayPage />} />
          <Route path="/vault" element={<Home />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/quests" element={<QuestsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/claude" element={<ClaudePage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/wheel" element={<WheelPage />} />
          <Route path="/event/:rel" element={<EventPage />} />
          <Route path="/quest/:rel" element={<QuestPage />} />
          <Route path="/theme/:name" element={<ThemePage />} />
          <Route path="/page/:rel" element={<PageView />} />
          <Route path="/log" element={<FeedPage />} />
          <Route path="/charts" element={<TrendsPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:section" element={<ProfilePage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/raw" element={<RawPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <CommandPalette />
      <SessionNote />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </StoreProvider>
  );
}
