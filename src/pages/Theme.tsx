import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useVault } from "../store";
import { THEME_BY_NAME } from "../lib/themes";
import { pageUrl } from "../lib/vault";
import { PageList, Stat } from "../components/Bits";
import { useT } from "../lib/i18n";
import Markdown from "../components/Markdown";
import type { Page } from "../lib/types";

type Tab = "all" | "resource" | "wiki" | "projects" | "other";

export default function ThemePage() {
  const { name = "" } = useParams();
  const theme = decodeURIComponent(name);
  const meta = THEME_BY_NAME.get(theme);
  const v = useVault();
  const { t, themeLabel, themeBlurb } = useT();
  const [tab, setTab] = useState<Tab>("all");
  const [project, setProject] = useState<string | null>(null);

  const pages = useMemo(() => v.pages.filter((p) => p.theme === theme), [v, theme]);
  const overview = pages.find((p) => p.file === "_Overview" && p.segments.length === 1);
  const projects = useMemo(() => {
    const m = new Map<string, Page[]>();
    for (const p of pages) if (p.project) m.set(p.project, [...(m.get(p.project) ?? []), p]);
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [pages]);

  const filtered = useMemo(() => {
    let list = pages.filter((p) => p.zone !== "overview");
    if (tab === "resource") list = list.filter((p) => p.zone === "resource" && !p.project);
    else if (tab === "wiki") list = list.filter((p) => p.zone === "wiki" && !p.project);
    else if (tab === "projects") list = list.filter((p) => p.project && (!project || p.project === project));
    else if (tab === "other") list = list.filter((p) => !["resource", "wiki"].includes(p.zone) && !p.project);
    return list.sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? ""));
  }, [pages, tab, project]);

  const groups = useMemo(() => {
    const m = new Map<string, Page[]>();
    for (const p of filtered) {
      const key = p.segments.slice(1).join(" / ") || t("theme_root");
      m.set(key, [...(m.get(key) ?? []), p]);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, t]);

  const count = (f: (p: Page) => boolean) => pages.filter(f).length;

  if (!meta) return <div className="empty">{t("unknown_theme", { t: theme })}</div>;

  const tabs: [Tab, string, number][] = [
    ["all", t("tab_all"), pages.filter((p) => p.zone !== "overview").length],
    ["resource", t("tab_resource"), count((p) => p.zone === "resource" && !p.project)],
    ["wiki", t("tab_wiki"), count((p) => p.zone === "wiki" && !p.project)],
    ["projects", t("tab_projects"), count((p) => !!p.project)],
    ["other", t("tab_other"), count((p) => !["resource", "wiki", "overview"].includes(p.zone) && !p.project)],
  ];

  return (
    <div style={{ ["--c" as string]: meta.color }}>
      <div className="eyebrow" style={{ color: meta.color }}>{t("theme")}</div>
      <h1 className="title">{themeLabel(theme)}</h1>
      <p className="lede">{themeBlurb(theme, meta.blurb)}</p>

      <div className="grid cols-4" style={{ marginTop: 20 }}>
        <div className="card"><Stat n={pages.length} l={t("pages")} /></div>
        <div className="card"><Stat n={count((p) => p.zone === "resource")} l={t("resource")} /></div>
        <div className="card"><Stat n={count((p) => p.zone === "wiki")} l={t("wiki")} /></div>
        <div className="card"><Stat n={projects.length} l={t("projects")} /></div>
      </div>

      {overview && (
        <>
          <h2 className="section">{t("overview")} <Link to={pageUrl(overview)} className="small muted" style={{ textTransform: "none", letterSpacing: 0 }}>{t("open_as_page")}</Link></h2>
          <div className="overview-card">
            <Markdown source={overview.body} compact />
          </div>
        </>
      )}

      <h2 className="section">{t("pages_h")}</h2>
      <div className="tabs">
        {tabs
          .filter(([, , n]) => n > 0 || tab === "all")
          .map(([k, label, n]) => (
            <button key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => { setTab(k); setProject(null); }}>
              {label}<span className="n">{n}</span>
            </button>
          ))}
      </div>

      {tab === "projects" && projects.length > 0 && (
        <div className="row wrap" style={{ marginBottom: 12 }}>
          <button className={`chip link ${!project ? "on" : ""}`} onClick={() => setProject(null)}>{t("all_projects")}</button>
          {projects.map(([pn, ps]) => (
            <button key={pn} className={`chip link ${project === pn ? "on" : ""}`} onClick={() => setProject(pn)}>
              {pn} <span className="faint">{ps.length}</span>
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="empty">{t("no_pages_view")}</div>
      ) : groups.length === 1 ? (
        <PageList pages={filtered} />
      ) : (
        groups.map(([folder, ps]) => (
          <div key={folder} className="folder">
            <h3>{folder} <span className="n">{ps.length}</span></h3>
            <PageList pages={ps} />
          </div>
        ))
      )}
    </div>
  );
}
