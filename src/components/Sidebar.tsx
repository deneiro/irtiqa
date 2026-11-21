import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { THEME_ART } from "../assets/play";
import { anyRunning, useRuns } from "../lib/claudeRuns";
import { CAMPS, dayScore, rankOf, standing } from "../lib/game";
import { useT } from "../lib/i18n";
import { THEMES } from "../lib/themes";
import { useGame } from "../lib/useGame";
import { themeUrl } from "../lib/vault";
import { useStore } from "../store";
import { FlameIcon } from "./GameBits";
import "./Sidebar.css";

/**
 * The rail beside every screen (rebuilt 2026-11-21 in the look of «Сегодня»). The menu is still two things (Eldar,
 * 2026-11-02): «Главный» — the daily screen is the app — and «Темы», folded until he opens them or stands on one.
 * Above the menu is the player: the level and its XP, the fire, and how high today's day already is, with a tick for
 * every camp. A theme is its painting, its level and how far that level has gone. Nothing is entered here.
 */
export default function Sidebar() {
  const { vault, life, timer, setPaletteOpen, reload, loading } = useStore();
  const { t, themeLabel, themeBlurb } = useT();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const claudeBusy = anyRunning(useRuns());
  const game = useGame();
  const onTheme = pathname.startsWith("/theme/");
  const [themesOpen, setThemesOpen] = useState(onTheme);
  useEffect(() => { if (onTheme) setThemesOpen(true); }, [onTheme]);

  const score = game && life ? dayScore(game.habits, life.days.get(game.today), game.today) : undefined;
  const st = score ? standing(score.pct) : undefined;

  return (
    <aside className="sb">
      <div className="sb-drag" data-tauri-drag-region />
      <div className="sb-brand"><i />{t("app")}</div>
      <button type="button" className="sb-search" onClick={() => setPaletteOpen(true)} disabled={!vault}>
        <span aria-hidden="true">⌕</span>
        <span>{t("search_vault")}</span>
        <kbd>⌘K</kbd>
      </button>

      {game && (
        <NavLink to="/" end className="sb-player" title="Открыть «Сегодня»">
          <div className="top">
            <b>{game.level.level}</b>
            <div>
              <span>{rankOf(game.level.level)}</span>
              <small>{game.level.into} / {game.level.need} XP</small>
            </div>
            <em className={game.flame.today ? "lit" : game.flame.days ? "on" : ""} title="Дней подряд, когда взята хотя бы половина дня"><FlameIcon />{game.flame.days}</em>
          </div>
          <i className="xp"><u style={{ width: `${Math.round((game.level.into / game.level.need) * 100)}%` }} /></i>
          {score && st && (
            <div className="day">
              <div><span>сегодня</span><b>{score.of ? score.pct : "—"}{score.of ? <small> %</small> : null}</b></div>
              <i className="trail">
                <u style={{ width: `${score.pct}%` }} />
                {CAMPS.map((c) => <s key={c} className={score.pct >= c ? "on" : ""} style={{ left: `${c}%` }} />)}
              </i>
              <small>{score.of ? <>{st.at}{st.next ? ` · до «${st.next}» ${st.left} %` : " — день взят"}</> : "на сегодня ничего не положено"}</small>
            </div>
          )}
        </NavLink>
      )}

      <NavLink to="/" end className={({ isActive }) => `sb-link${isActive ? " active" : ""}`}>
        <i className="sun" />Главный
        {timer && <span className="sb-live" title={timer.quest} />}
      </NavLink>

      <details className="sb-themes" open={themesOpen} onToggle={(e) => setThemesOpen((e.target as HTMLDetailsElement).open)}>
        <summary>Темы{claudeBusy && <span className="sb-live" title="Claude работает" />}</summary>
        {THEMES.map((th) => {
          const xp = game?.themes.find((x) => x.theme === th.name);
          return (
            <NavLink key={th.name} to={themeUrl(th.name)} className={({ isActive }) => `sb-theme${isActive ? " active" : ""}`} style={{ ["--c" as string]: th.color }} title={themeBlurb(th.name, th.blurb)}>
              <img src={THEME_ART[th.name]} alt="" loading="lazy" />
              <span>{themeLabel(th.name)}</span>
              {xp && <b title={`Уровень темы · ${xp.level.into} / ${xp.level.need} XP до следующего`}>{xp.level.level}</b>}
              {xp && <i><u style={{ width: `${Math.round((xp.level.into / xp.level.need) * 100)}%` }} /></i>}
            </NavLink>
          );
        })}
      </details>

      <div className="sb-foot">
        <span>{vault ? t("n_pages", { n: vault.pages.length }) : t("no_vault")}</span>
        <button type="button" onClick={() => void reload(true)} title={t("rescan_title")}>{loading ? "…" : t("rescan")}</button>
        <button type="button" onClick={() => nav("/setup")}>{t("vault_folder")}</button>
      </div>
    </aside>
  );
}
