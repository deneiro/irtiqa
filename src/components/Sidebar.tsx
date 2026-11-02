import { NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { THEMES } from "../lib/themes";
import { themeUrl } from "../lib/vault";
import { useT } from "../lib/i18n";
import { anyRunning, useRuns } from "../lib/claudeRuns";

/**
 * Three things in the menu (spec v2, 2026-10-11): «Утро» — the one daily
 * screen; «Темы» — reading, which Eldar asked to keep; «Посмотреть» — every
 * other screen of v1, folded away but not deleted. Nothing is entered through
 * the menu; the conversation with Claude is the input.
 */
export default function Sidebar() {
  const { vault, timer, setPaletteOpen, reload, loading } = useStore();
  const { t, themeLabel, themeBlurb } = useT();
  const nav = useNavigate();
  const claudeBusy = anyRunning(useRuns());
  const cls = ({ isActive }: { isActive: boolean }) => `nav ${isActive ? "active" : ""}`;

  const look: { to: string; label: string }[] = [
    { to: "/quests", label: "Квесты" },
    { to: "/habits", label: "Привычки" },
    { to: "/finance", label: "Финансы" },
    { to: "/people", label: "Люди" },
    { to: "/profile", label: "Профиль" },
    { to: "/calendar", label: "Календарь" },
    { to: "/day", label: "День (v1)" },
    { to: "/log", label: "Лента" },
    { to: "/wheel", label: "Колесо" },
    { to: "/charts", label: "Тренды" },
    { to: "/tools", label: "Инструменты" },
    { to: "/vault", label: "Библиотека" },
    { to: "/raw", label: "Сырые источники" },
    { to: "/claude", label: "Claude" },
  ];

  return (
    <aside className="sidebar">
      <div className="drag" data-tauri-drag-region />
      <div className="brand">
        <span className="dot" />
        {t("app")}
      </div>
      <button className="searchbtn" onClick={() => setPaletteOpen(true)} disabled={!vault}>
        <span>⌕</span>
        <span>{t("search_vault")}</span>
        <kbd>⌘K</kbd>
      </button>

      <NavLink to="/" end className={cls}>Утро {timer && <span className="livedot" title={timer.quest} />}</NavLink>

      <div className="section">Темы</div>
      {THEMES.map((th) => (
        <NavLink key={th.name} to={themeUrl(th.name)} className={cls} style={{ ["--c" as string]: th.color }} title={themeBlurb(th.name, th.blurb)}>
          <span className="bar" />
          {themeLabel(th.name)}
        </NavLink>
      ))}

      <details className="look">
        <summary className="section">Посмотреть</summary>
        {look.map((l) => (
          <NavLink key={l.to} to={l.to} className={cls}>
            {l.label}
            {l.to === "/claude" && claudeBusy && <span className="livedot" title="claude работает" />}
          </NavLink>
        ))}
      </details>

      <div className="foot">
        <div className="row spread">
          <span>{vault ? t("n_pages", { n: vault.pages.length }) : t("no_vault")}</span>
          <button onClick={() => void reload(true)} title={t("rescan_title")}>{loading ? "…" : t("rescan")}</button>
        </div>
        <div className="row spread" style={{ marginTop: 4 }}>
          <span>{vault ? "ввод — через Claude" : ""}</span>
          <button onClick={() => nav("/setup")}>{t("vault_folder")}</button>
        </div>
      </div>
    </aside>
  );
}
