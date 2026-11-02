import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useVault } from "../store";
import { toolsOf, type Tool } from "../lib/tools";
import { pageUrl } from "../lib/vault";
import { PageList } from "../components/Bits";
import ToolActions from "../components/ToolActions";

/** First prose paragraph of a page: the one-line "what is it". */
function lede(tool: Tool): string {
  const paras = tool.page.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !/^(#|\||-|```|>|\*\*Где лежит)/.test(p));
  return (paras[0] ?? "").replace(/\s*\n\s*/g, " ").replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/\*\*|`|\*/g, "");
}

export default function ToolsPage() {
  const v = useVault();
  const { own, guides } = useMemo(() => toolsOf(v.pages), [v]);
  const overview = v.pages.find((p) => p.segments[0] === "Personal growth" && p.segments[1] === "tools" && p.file === "_Overview");

  return (
    <div>
      <div className="eyebrow">Личностный рост · tools</div>
      <h1 className="title">Инструменты</h1>
      <p className="lede">
        Свои программы из <span className="mono">~/Desktop/Projects</span> — запускаются отсюда. Ниже гайды по чужим.
        {overview && <> <Link to={pageUrl(overview)}>Обзор</Link>.</>}
      </p>

      <h2 className="section">Свои <span className="n">{own.length}</span></h2>
      {own.length ? (
        <div className="grid cols-3" style={{ marginBottom: 24 }}>
          {own.map((tool) => (
            <div key={tool.page.rel} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link to={pageUrl(tool.page)} style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>{tool.page.title}</Link>
              <div className="small muted" style={{ flex: 1 }}>{lede(tool)}</div>
              <div className="mono faint" style={{ fontSize: 11, wordBreak: "break-all" }}>{tool.folder!.replace(/^\/Users\/[^/]+/, "~")}</div>
              <ToolActions tool={tool} />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">Нет страниц с полем <span className="mono">folder:</span> в <span className="mono">Personal growth/tools/</span>.</div>
      )}

      <h2 className="section">Гайды <span className="n">{guides.length}</span></h2>
      <PageList pages={guides.map((t) => t.page)} />
    </div>
  );
}
