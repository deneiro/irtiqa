import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { THEMES, themeColor } from "../lib/themes";
import { pageUrl } from "../lib/vault";
import { useT } from "../lib/i18n";
import { openExternal } from "../lib/native";
import { todayStr } from "../lib/dates";
import { contactsOf, daysSinceContact, daysToBirthday, debtsFor, deepLinks } from "../lib/people";

type Sort = "name" | "contact" | "birthday";

export default function PeoplePage() {
  const v = useVault();
  const { life } = useStore();
  const { t, themeLabel } = useT();
  const today = todayStr();
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState("");
  const [sort, setSort] = useState<Sort>("name");

  const people = useMemo(
    () =>
      v.pages
        .filter((p) => p.zone === "person")
        .map((p) => {
          const c = contactsOf(p);
          const open = debtsFor(p, life?.debts ?? []).filter((d) => !d.closed);
          return {
            p,
            c,
            links: deepLinks(c),
            since: daysSinceContact(c.last_contact, today),
            bday: daysToBirthday(c.birthday, today),
            debt: open.reduce((s, d) => s + (d.direction === "я должен" ? -d.amount : d.amount), 0),
            connection: typeof p.fm.connection === "string" ? p.fm.connection : "",
          };
        })
        .filter(({ p }) => !theme || p.theme === theme)
        .filter(({ p, connection }) => !q || p.title.toLowerCase().includes(q.toLowerCase()) || p.aliases.some((a) => a.toLowerCase().includes(q.toLowerCase())) || connection.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => {
          if (sort === "contact") return (b.since ?? 1e9) - (a.since ?? 1e9);
          if (sort === "birthday") return (a.bday ?? 1e9) - (b.bday ?? 1e9);
          return a.p.title.localeCompare(b.p.title);
        }),
    [v, life, q, theme, sort, today],
  );

  const soon = people.filter((x) => x.bday !== undefined && x.bday <= 30).sort((a, b) => a.bday! - b.bday!);

  return (
    <div>
      <div className="eyebrow">{t("ent_eyebrow")}</div>
      <h1 className="title">{t("ent_title")}</h1>
      <p className="lede">{t("ent_lede")}</p>

      {soon.length > 0 && (
        <div className="notice" style={{ marginTop: 12 }}>
          🎂 Скоро: {soon.map((x) => <span key={x.p.rel}><Link to={pageUrl(x.p)}>{x.p.title}</Link> {x.bday === 0 ? "сегодня" : `через ${x.bday} дн.`}</span>).reduce<ReactNode[]>((acc, el, i) => (i ? [...acc, " · ", el] : [el]), [])}
        </div>
      )}

      <div className="row wrap" style={{ margin: "16px 0", gap: 8 }}>
        <input className="text" placeholder={t("filter")} value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 240 }} />
        <select className="text" value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="">{t("all_themes")}</option>
          {THEMES.map((th) => <option key={th.name} value={th.name}>{themeLabel(th.name)}</option>)}
        </select>
        <select className="text" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="name">по имени</option>
          <option value="contact">давно не общались</option>
          <option value="birthday">ближайшие дни рождения</option>
        </select>
        <span className="small faint" style={{ marginLeft: "auto" }}>{people.length}</span>
      </div>
      <table className="tbl">
        <thead><tr><th>{t("col_name")}</th><th>{t("col_connection")}</th><th>{t("col_theme")}</th><th>контакт</th><th>общались</th><th style={{ textAlign: "right" }}>долг</th></tr></thead>
        <tbody>
          {people.map(({ p, links, since, debt, connection }) => (
            <tr key={p.rel}>
              <td><Link to={pageUrl(p)} style={{ fontWeight: 500 }}>{p.title}</Link></td>
              <td className="muted">{connection || "—"}</td>
              <td><span className="chip c" style={{ ["--c" as string]: themeColor(p.theme) }}>{p.theme ? themeLabel(p.theme) : "—"}</span></td>
              <td>
                <span className="row" style={{ gap: 4 }}>
                  {links.map((l) => <button key={l.key} className="btn small ghost" title={l.url} onClick={() => void openExternal(l.url)}>{l.label}</button>)}
                </span>
              </td>
              <td className={`mono ${since !== undefined && since > 30 ? "muted" : ""}`}>{since === undefined ? "—" : since === 0 ? "сегодня" : `${since} дн.`}</td>
              <td className={`mono ${debt < 0 ? "muted" : ""}`} style={{ textAlign: "right" }}>{debt ? Math.round(debt).toLocaleString("ru-RU") : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!people.length && <div className="empty">{t("ent_none")}</div>}
      <div className="small faint" style={{ marginTop: 10 }}>Контакты и дата последнего общения хранятся во frontmatter страницы человека. Долг со знаком минус означает «я должен».</div>
    </div>
  );
}
