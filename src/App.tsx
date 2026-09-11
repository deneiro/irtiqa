import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { StoreProvider, useStore } from "./store";
import Sidebar from "./components/Sidebar";
import CommandPalette from "./components/CommandPalette";
import Home from "./pages/Home";
import DayPage from "./pages/Day";
import ThemePage from "./pages/Theme";
import PageView from "./pages/Page";
import LogPage from "./pages/Log";
import ChartsPage from "./pages/Charts";
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
        <Routes>
          <Route path="/" element={<DayPage />} />
          <Route path="/vault" element={<Home />} />
          <Route path="/theme/:name" element={<ThemePage />} />
          <Route path="/page/:rel" element={<PageView />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="/charts" element={<ChartsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/raw" element={<RawPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <CommandPalette />
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
