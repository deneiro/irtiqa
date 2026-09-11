import { NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { THEMES } from "../lib/themes";
import { themeUrl } from "../lib/vault";
import { useT } from "../lib/i18n";

export default function Sidebar() {
  const { vault, life, timer, setPaletteOpen, reload, loading, lang, setLang } = useStore();
  const { t, themeLabel, themeBlurb } = useT();
  const nav = useNavigate();
  const counts = new Map<string, number>();
  if (vault) for (const p of vault.pages) if (p.theme) counts.set(p.theme, (counts.get(p.theme) ?? 0) + 1);
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

      <NavLink to="/" end className={cls}>{t("nav_day")}</NavLink>
      <NavLink to="/habits" className={cls}>
        {t("nav_habits")} <span className="count">{life?.habits.filter((h) => h.status === "active").length ?? ""}</span>
      </NavLink>
      <NavLink to="/quests" className={cls}>
        {t("nav_quests")} {timer && <span className="livedot" title={timer.quest} />}<span className="count">{life?.quests.filter((q) => q.status === "active").length ?? ""}</span>
      </NavLink>
      <NavLink to="/vault" className={cls}>{t("nav_home")}</NavLink>
      <NavLink to="/log" className={cls}>
        {t("nav_log")} <span className="count">{vault?.log.length ?? ""}</span>
      </NavLink>
      <NavLink to="/charts" className={cls}>{t("nav_charts")}</NavLink>
      <NavLink to="/profile" className={cls}>{t("nav_profile")}</NavLink>

      <div className="section">{t("sec_themes")}</div>
      {THEMES.map((th) => (
        <NavLink key={th.name} to={themeUrl(th.name)} className={cls} style={{ ["--c" as string]: th.color }} title={themeBlurb(th.name, th.blurb)}>
          <span className="bar" />
          {themeLabel(th.name)}
          <span className="count">{counts.get(th.name) ?? ""}</span>
        </NavLink>
      ))}

      <div className="section">{t("sec_registry")}</div>
      <NavLink to="/people" className={cls}>
        {t("nav_entities")} <span className="count">{vault?.pages.filter((p) => p.zone === "person").length ?? ""}</span>
      </NavLink>
      <NavLink to="/raw" className={cls}>
        {t("nav_raw")} <span className="count">{vault?.raw.length ?? ""}</span>
      </NavLink>

      <div className="foot">
        <div className="row spread">
          <span>{vault ? t("n_pages", { n: vault.pages.length }) : t("no_vault")}</span>
          <button onClick={() => void reload()} title={t("rescan_title")}>{loading ? "…" : t("rescan")}</button>
        </div>
        <div className="row spread" style={{ marginTop: 4 }}>
          <span>{vault ? t("readonly_live") : ""}</span>
          <button onClick={() => nav("/setup")}>{t("vault_folder")}</button>
        </div>
        <div className="row" style={{ marginTop: 8, gap: 4 }}>
          <button className={`langbtn ${lang === "en" ? "on" : ""}`} onClick={() => setLang("en")}>EN</button>
          <button className={`langbtn ${lang === "ru" ? "on" : ""}`} onClick={() => setLang("ru")}>RU</button>
        </div>
      </div>
    </aside>
  );
}
