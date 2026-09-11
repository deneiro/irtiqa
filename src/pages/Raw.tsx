import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { fmtBytes, pageUrl, sourceTarget } from "../lib/vault";
import { revealInFinder } from "../lib/native";
import { useT } from "../lib/i18n";
import { Stat } from "../components/Bits";

export default function RawPage() {
  const v = useVault();
  const { root } = useStore();
  const { t } = useT();

  const cited = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of v.pages) {
      for (const s of p.sources) {
        const x = sourceTarget(s);
        if (x.isRaw) m.set(x.target.toLowerCase(), p.rel);
      }
      const r = p.fm.raw;
      if (typeof r === "string") m.set(r.replace(/^\[\[|\]\]$/g, "").toLowerCase(), p.rel);
    }
    return m;
  }, [v]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof v.raw>();
    for (const r of v.raw) {
      const folder = r.rel.split("/").slice(0, 2).join("/");
      m.set(folder, [...(m.get(folder) ?? []), r]);
    }
    return [...m.entries()].sort();
  }, [v.raw]);

  const citedCount = v.raw.filter((r) => cited.has(r.rel.toLowerCase())).length;
  const lede = t("raw_lede", { dir: "§DIR§" }).split("§DIR§");

  return (
    <div>
      <div className="eyebrow">{t("raw_eyebrow")}</div>
      <h1 className="title">{t("raw_title")}</h1>
      <p className="lede">{lede[0]}<span className="mono">raw/</span>{lede[1]}</p>
      <div className="grid cols-3" style={{ margin: "20px 0" }}>
        <div className="card"><Stat n={v.raw.length} l={t("files")} /></div>
        <div className="card"><Stat n={citedCount} l={t("cited")} /></div>
        <div className="card"><Stat n={fmtBytes(v.raw.reduce((a, r) => a + r.size, 0))} l={t("total_size")} /></div>
      </div>
      {groups.map(([folder, files]) => (
        <div key={folder} className="folder">
          <h3>{folder} <span className="n">{files.length}</span></h3>
          <table className="tbl">
            <tbody>
              {[...files].sort((a, b) => b.mtime - a.mtime).map((r) => {
                const page = cited.get(r.rel.toLowerCase());
                const p = page ? v.byRel.get(page) : undefined;
                return (
                  <tr key={r.rel}>
                    <td style={{ width: "55%" }}>
                      <a href="#" onClick={(e) => { e.preventDefault(); void revealInFinder(`${root}/${r.rel}`); }} title={t("btn_finder")}>
                        {r.rel.split("/").slice(2).join("/")}
                      </a>
                    </td>
                    <td className="mono faint">{fmtBytes(r.size)}</td>
                    <td className="mono faint">{new Date(r.mtime * 1000).toISOString().slice(0, 10)}</td>
                    <td>{p ? <Link to={pageUrl(p)} className="chip link">→ {p.title}</Link> : <span className="faint small">{t("not_cited")}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
