import { NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { THEMES } from "../lib/themes";
import { themeUrl } from "../lib/vault";
import { useT } from "../lib/i18n";
import { anyRunning, useRuns } from "../lib/claudeRuns";

/**
 * One thing in the menu (Eldar, 2026-11-02: «Утро»): the daily screen is the
 * app. «Темы» — reading, which he asked to keep (2026-10-11) — is folded under
 * a closed disclosure. The v1 screens («Посмотреть») left the menu; their
 * routes still exist for links from pages, nothing was deleted. Nothing is
 * entered through the menu; the conversation with Claude is the input.
 */
export default function Sidebar() {
  const { vault, timer, setPaletteOpen, reload, loading } = useStore();
  const { t, themeLabel, themeBlurb } = useT();
  const nav = useNavigate();
  const claudeBusy = anyRunning(useRuns());
  const cls = ({ isActive }: { isActive: boolean }) => `nav ${isActive ? "active" : ""}`;


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

      <details className="look">
        <summary className="section">Темы{claudeBusy && <span className="livedot" title="claude работает" />}</summary>
        {THEMES.map((th) => (
          <NavLink key={th.name} to={themeUrl(th.name)} className={cls} style={{ ["--c" as string]: th.color }} title={themeBlurb(th.name, th.blurb)}>
            <span className="bar" />
            {themeLabel(th.name)}
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
