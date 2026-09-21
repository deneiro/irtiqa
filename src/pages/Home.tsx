import { Link, useNavigate } from "react-router-dom";
import { useVault } from "../store";
import { THEMES } from "../lib/themes";
import { daysSince, themeUrl } from "../lib/vault";
import { PageList, Stat } from "../components/Bits";
import { FAMILY_COLORS, opFamily } from "../lib/log";
import { useT } from "../lib/i18n";
import Markdown from "../components/Markdown";

/** Pull one named H2 section out of a markdown body. */
function section(body: string, heading: RegExp): string | null {
  const lines = body.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^## /.test(lines[i]) && heading.test(lines[i])) { start = i + 1; break; }
  }
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) if (/^## /.test(lines[i])) { end = i; break; }
  const text = lines.slice(start, end).join("\n").trim();
  return text || null;
}

export default function Home() {
  const v = useVault();
  const nav = useNavigate();
  const { t, themeLabel } = useT();
  const today = new Date().toISOString().slice(0, 10);

  const perTheme = THEMES.map((th) => {
    const pages = v.pages.filter((p) => p.theme === th.name);
    const latest = pages.reduce<string>((m, p) => (p.updated && p.updated > m ? p.updated : m), "");
    return { ...th, n: pages.length, latest, stale: (daysSince(latest) ?? 999) > 45 };
  });
  const max = Math.max(1, ...perTheme.map((x) => x.n));

  const recent = [...v.pages]
    .filter((p) => p.zone !== "overview")
    .sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? "") || b.mtime - a.mtime)
    .slice(0, 8);
  const recentLog = [...v.log].reverse().slice(0, 6);
  const resources = v.pages.filter((p) => p.zone === "resource").length;
  const wiki = v.pages.filter((p) => p.zone === "wiki").length;
  const lastLog = v.log[v.log.length - 1];
  const quietDays = daysSince(lastLog?.date);

  const inMotion = THEMES.map((th) => {
    const ov = v.pages.find((p) => p.theme === th.name && p.file === "_Overview" && p.segments.length === 1);
    const text = ov ? section(ov.body, /в движении|in motion|в работе|now|current/i) : null;
    return { th, ov, text };
  }).filter((x) => x.text);

  return (
    <div>
      <div className="eyebrow">{today}</div>
      <h1 className="title">{t("home_title")}</h1>
      <p className="lede">
        {t("home_lede", { n: v.pages.length, m: v.raw.length })}{" "}
        {quietDays !== undefined && quietDays > 7 ? (
          <span className="hl">{t("home_quiet", { d: quietDays })}</span>
        ) : (
          t("home_last", { s: lastLog?.subject || lastLog?.op || "—" })
        )}
      </p>

      <div className="shelf" role="list" aria-label={t("shelf_aria")}>
        {perTheme.map((th) => (
          <button
            key={th.name}
            role="listitem"
            className={`spine ${th.stale ? "stale" : ""}`}
            style={{ ["--c" as string]: th.color, ["--w" as string]: String(0.35 + th.n / max) }}
            onClick={() => nav(themeUrl(th.name))}
            title={t("shelf_tip", { t: themeLabel(th.name), n: th.n, d: th.latest || t("unknown") })}
          >
            <span className="n">{th.n}</span>
            <span className="label">{themeLabel(th.name)}</span>
            <span className="n">{th.latest ? th.latest.slice(5) : ""}</span>
          </button>
        ))}
      </div>
      <div className="shelf-legend">
        <span>{t("shelf_legend")}</span>
        <span>{t("shelf_legend2")}</span>
      </div>

      <div className="grid cols-4" style={{ marginTop: 28 }}>
        <div className="card"><Stat n={resources} l={t("stat_resource")} /></div>
        <div className="card"><Stat n={wiki} l={t("stat_wiki")} /></div>
        <div className="card"><Stat n={v.log.length} l={t("stat_log")} /></div>
        <div className="card"><Stat n={v.deadLinks.length} l={t("stat_dead")} /></div>
      </div>

      {inMotion.length > 0 && (
        <>
          <h2 className="section">{t("in_motion")}</h2>
          <div className="grid cols-2">
            {inMotion.map(({ th, ov, text }) => (
              <div key={th.name} className="overview-card clamp" style={{ ["--c" as string]: th.color }}>
                <div className="row spread" style={{ marginBottom: 8 }}>
                  <Link to={themeUrl(th.name)} className="eyebrow" style={{ color: th.color }}>{themeLabel(th.name)}</Link>
                  <span className="mono faint">{ov?.updated}</span>
                </div>
                <Markdown source={text!} compact />
                <Link to={themeUrl(th.name)} className="more">{t("open_theme")}</Link>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="grid cols-2" style={{ marginTop: 8 }}>
        <div>
          <h2 className="section">{t("recently_updated")}</h2>
          <PageList pages={recent} />
        </div>
        <div>
          <h2 className="section">{t("latest_log")}</h2>
          <div className="stack">
            {recentLog.map((e) => (
              <Link key={e.id} to={`/log#${e.id}`} className="pitem" style={{ ["--c" as string]: FAMILY_COLORS[opFamily(e.op)] }}>
                <span className="bar" />
                <span style={{ minWidth: 0 }}>
                  <div className="t">{e.subject || e.op}</div>
                  <div className="sub">{e.op}</div>
                </span>
                <span className="meta">{e.date}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
