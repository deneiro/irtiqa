import { Link, useParams } from "react-router-dom";
import { useStore, useVault } from "../store";
import { themeColor } from "../lib/themes";
import { pageUrl, sourceTarget, themeUrl } from "../lib/vault";
import type { Page } from "../lib/types";
import { openExternal, revealInFinder } from "../lib/native";
import { useT } from "../lib/i18n";
import Markdown from "../components/Markdown";
import { TagChips } from "../components/Bits";
import ResourceActions from "../components/ResourceActions";
import PersonActions from "../components/PersonActions";

export default function PageView() {
  const { rel = "" } = useParams();
  const v = useVault();
  const { root } = useStore();
  const { t, zone, themeLabel } = useT();
  const page = v.byRel.get(decodeURIComponent(rel));

  if (!page) return <div className="empty">{t("page_gone")} <Link to="/">{t("go_home")}</Link>.</div>;

  const color = themeColor(page.theme);
  // "Projects / <Name>" in the path is a place, not a label: make it lead somewhere.
  const projectOverview: Page | undefined = page.project
    ? v.pages.find((p) => p.file === "_Overview" && p.project === page.project && p.segments.length === 3)
    : undefined;
  const backlinks = (v.backlinks.get(page.rel) ?? []).sort((a, b) => a.title.localeCompare(b.title));
  const outgoing = [...new Set(page.links.map((l) => v.resolve(l)).filter(Boolean).map((p) => p!.rel))]
    .map((r) => v.byRel.get(r)!)
    .filter((p) => p.rel !== page.rel)
    .sort((a, b) => a.title.localeCompare(b.title));
  const sources = page.sources.map(sourceTarget);
  const vaultName = root.split("/").pop() ?? "";
  const obsidianUrl = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(page.rel.replace(/\.md$/, ""))}`;
  const body = page.body.replace(/^\s*# [^\n]*\n/, (m) => (m.slice(2).trim() === page.title ? "" : m));

  return (
    <div>
      <div className="pagehead" style={{ ["--c" as string]: color }}>
        <div className="crumbs">
          {page.theme && <Link to={themeUrl(page.theme)} style={{ color }}>{themeLabel(page.theme)}</Link>}
          {page.segments.slice(1).map((s, i) => {
            const isProject = !!page.project && s === page.project;
            const to = isProject && projectOverview && projectOverview.rel !== page.rel ? pageUrl(projectOverview) : undefined;
            return (
              <span key={i} className="row" style={{ gap: 6 }}>
                <span className="sep">/</span>
                {to ? <Link to={to}>{s}</Link> : <span>{s}</span>}
              </span>
            );
          })}
        </div>
        <h1 className="title">{page.title}</h1>
        <div className="metas">
          <span>{t("m_type")} <b>{page.type}</b></span>
          {page.project && <span>{t("m_project")} <b>{page.project}</b></span>}
          {page.created && <span>{t("m_created")} <b className="mono">{page.created}</b></span>}
          {page.updated && <span>{t("m_updated")} <b className="mono">{page.updated}</b></span>}
          <span><b className="mono">{page.words}</b> {t("m_words")}</span>
        </div>
        <div className="row wrap" style={{ marginTop: 12, gap: 8 }}>
          <TagChips tags={page.tags} />
          <span className="grow" />
          {page.sourceUrl && (
            <button className="btn" onClick={() => void openExternal(page.sourceUrl!)} title={page.sourceUrl}>{t("btn_source")}</button>
          )}
          <button className="btn" onClick={() => void openExternal(obsidianUrl)}>{t("btn_obsidian")}</button>
          <button className="btn ghost" onClick={() => void revealInFinder(`${root}/${page.rel}`)}>{t("btn_finder")}</button>
        </div>
      </div>

      {page.zone === "resource" && <ResourceActions page={page} />}
      {page.zone === "person" && <PersonActions page={page} />}

      <div className="pagecols">
        <Markdown source={body} />
        <aside className="aside">
          {sources.length > 0 && (
            <div>
              <h4>{t("sources")}</h4>
              <ul>
                {sources.map((s, i) => {
                  const p = s.isRaw ? undefined : v.resolve(s.target);
                  return (
                    <li key={i}>
                      {p ? (
                        <Link to={pageUrl(p)} title={p.title}>{p.title}</Link>
                      ) : s.isRaw ? (
                        <a href="#" onClick={(e) => { e.preventDefault(); void revealInFinder(`${root}/${s.target}`); }} title={s.target} className="muted">
                          {t("raw_prefix")} · {s.target.split("/").pop()}
                        </a>
                      ) : (
                        <span className="muted" title={t("not_in_vault")}>{s.target}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div>
            <h4>{t("linked_from", { n: backlinks.length })}</h4>
            {backlinks.length ? (
              <ul>
                {backlinks.map((p) => (
                  <li key={p.rel}><Link to={pageUrl(p)} title={p.title}>{p.title}</Link> <span className="who">{zone(p.zone)}</span></li>
                ))}
              </ul>
            ) : (
              <div className="faint small">{t("no_incoming")}{page.zone === "wiki" ? ` ${t("orphan")}` : ""}.</div>
            )}
          </div>
          {outgoing.length > 0 && (
            <div>
              <h4>{t("links_to", { n: outgoing.length })}</h4>
              <ul>
                {outgoing.slice(0, 40).map((p) => (
                  <li key={p.rel}><Link to={pageUrl(p)} title={p.title}>{p.title}</Link></li>
                ))}
                {outgoing.length > 40 && <li className="faint">{t("and_more", { n: outgoing.length - 40 })}</li>}
              </ul>
            </div>
          )}
          <div>
            <h4>{t("file")}</h4>
            <div className="mono faint" style={{ wordBreak: "break-all", fontSize: 11 }}>{page.rel}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
