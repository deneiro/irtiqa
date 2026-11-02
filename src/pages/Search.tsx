import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStore, useVault } from "../store";
import { THEMES, themeColor } from "../lib/themes";
import { snippet } from "../lib/search";
import { pageUrl } from "../lib/vault";
import { useT } from "../lib/i18n";
import type { Page, Zone } from "../lib/types";

const ZONES: Zone[] = ["resource", "wiki", "overview", "person", "tool", "personal", "other"];

export default function SearchPage() {
  const v = useVault();
  const { index, needIndex } = useStore();
  useEffect(needIndex, [needIndex]);
  const { t, zone, themeLabel } = useT();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [theme, setTheme] = useState<string>("");
  const [kind, setKind] = useState<string>("");

  const results: Page[] = useMemo(() => {
    if (!index) return [];
    const query = q.trim();
    let list: Page[];
    if (!query) list = [];
    else if (query.startsWith("#")) {
      const tag = query.slice(1).toLowerCase();
      list = v.pages.filter((p) => p.tags.some((x) => x.toLowerCase().includes(tag)));
    } else list = index.search(query).map((r) => v.byRel.get(r.id)!).filter(Boolean);
    if (theme) list = list.filter((p) => p.theme === theme);
    if (kind) list = list.filter((p) => p.zone === kind);
    return list.slice(0, 200);
  }, [q, theme, kind, index, v]);

  return (
    <div>
      <div className="eyebrow">{t("search")}</div>
      <h1 className="title">{q ? t("results_for", { q }) : t("search_vault")}</h1>
      <div className="row wrap" style={{ margin: "16px 0", gap: 8 }}>
        <input className="text grow" value={q} autoFocus placeholder={t("search_placeholder")} onChange={(e) => setParams({ q: e.target.value }, { replace: true })} />
        <select className="text" value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="">{t("all_themes")}</option>
          {THEMES.map((th) => <option key={th.name} value={th.name}>{themeLabel(th.name)}</option>)}
        </select>
        <select className="text" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">{t("all_kinds")}</option>
          {ZONES.map((z) => <option key={z} value={z}>{zone(z)}</option>)}
        </select>
      </div>
      {q && <div className="small muted" style={{ marginBottom: 10 }}>{results.length === 1 ? t("one_result") : t("n_results", { n: results.length })}</div>}
      <div className="stack">
        {results.map((p) => (
          <Link key={p.rel} to={pageUrl(p)} className="card" style={{ borderLeft: `4px solid ${themeColor(p.theme)}`, padding: "12px 16px" }}>
            <div className="row spread">
              <div style={{ fontWeight: 500 }}>{p.title}</div>
              <div className="mono faint">{p.updated ?? ""}</div>
            </div>
            <div className="small muted">
              {[p.project ?? (p.theme ? themeLabel(p.theme) : undefined), zone(p.zone), p.tags.length ? "#" + p.tags.slice(0, 4).join(" #") : ""].filter(Boolean).join(" · ")}
            </div>
            {!q.startsWith("#") && <div className="small" style={{ color: "var(--ink-2)", marginTop: 6, fontFamily: "var(--font-read)" }}>{snippet(p.body, q)}</div>}
          </Link>
        ))}
        {q && !results.length && <div className="empty">{t("search_none")}</div>}
      </div>
    </div>
  );
}
