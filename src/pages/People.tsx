import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useVault } from "../store";
import { THEMES, themeColor } from "../lib/themes";
import { pageUrl } from "../lib/vault";
import { useT } from "../lib/i18n";

export default function PeoplePage() {
  const v = useVault();
  const { t, themeLabel } = useT();
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState("");

  const people = useMemo(
    () =>
      v.pages
        .filter((p) => p.zone === "person")
        .map((p) => ({
          p,
          refs: v.backlinks.get(p.rel)?.length ?? 0,
          connection: typeof p.fm.connection === "string" ? p.fm.connection : "",
        }))
        .filter(({ p }) => !theme || p.theme === theme)
        .filter(
          ({ p, connection }) =>
            !q ||
            p.title.toLowerCase().includes(q.toLowerCase()) ||
            p.aliases.some((a) => a.toLowerCase().includes(q.toLowerCase())) ||
            connection.toLowerCase().includes(q.toLowerCase()),
        )
        .sort((a, b) => a.p.title.localeCompare(b.p.title)),
    [v, q, theme],
  );

  return (
    <div>
      <div className="eyebrow">{t("ent_eyebrow")}</div>
      <h1 className="title">{t("ent_title")}</h1>
      <p className="lede">{t("ent_lede")}</p>
      <div className="row wrap" style={{ margin: "16px 0", gap: 8 }}>
        <input className="text" placeholder={t("filter")} value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 280 }} />
        <select className="text" value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="">{t("all_themes")}</option>
          {THEMES.map((th) => <option key={th.name} value={th.name}>{themeLabel(th.name)}</option>)}
        </select>
        <span className="small faint" style={{ marginLeft: "auto" }}>{people.length}</span>
      </div>
      <table className="tbl">
        <thead><tr><th>{t("col_name")}</th><th>{t("col_connection")}</th><th>{t("col_theme")}</th><th style={{ textAlign: "right" }}>{t("col_linked")}</th></tr></thead>
        <tbody>
          {people.map(({ p, refs, connection }) => (
            <tr key={p.rel}>
              <td><Link to={pageUrl(p)} style={{ fontWeight: 500 }}>{p.title}</Link></td>
              <td className="muted">{connection || "—"}</td>
              <td><span className="chip c" style={{ ["--c" as string]: themeColor(p.theme) }}>{p.theme ? themeLabel(p.theme) : "—"}</span></td>
              <td className="mono" style={{ textAlign: "right" }}>{refs}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!people.length && <div className="empty">{t("ent_none")}</div>}
    </div>
  );
}
