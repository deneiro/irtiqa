import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { THEMES, themeColor } from "../lib/themes";
import { pageUrl } from "../lib/vault";
import { useT } from "../lib/i18n";
import { openExternal } from "../lib/native";
import { todayStr } from "../lib/dates";
import { CATEGORIES, allGroups, groupsOf, categoryOf, closenessOf, contactsOf, daysSinceContact, daysToBirthday, debtsFor, deepLinks, isAuthor, type Category } from "../lib/people";
import AddPersonSheet from "./person/AddPersonSheet";

type Sort = "name" | "contact" | "birthday";

export default function PeoplePage() {
  const v = useVault();
  const { life } = useStore();
  const { t, themeLabel } = useT();
  const today = todayStr();
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState("");
  // «Требует тебя» opens this list sorted by the longest silence (?sort=contact).
  const [sort, setSort] = useState<Sort>(() => {
    const s = new URLSearchParams(location.hash.split("?")[1] ?? "").get("sort");
    return s === "contact" || s === "birthday" ? s : "name";
  });
  const [cats, setCats] = useState<Set<Category>>(new Set());
  const [near, setNear] = useState<string>("");
  const [grp, setGrp] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const people = useMemo(
    () =>
      v.pages
        .filter((p) => p.zone === "person" && p.type !== "template" && !p.file.startsWith("_"))
        .map((p) => {
          const c = contactsOf(p);
          const open = debtsFor(p, life?.debts ?? []).filter((d) => !d.closed);
          const cat = categoryOf(p) ?? (isAuthor(p) ? ("автор" as Category) : undefined);
          const close = closenessOf(p);
          return {
            p,
            c,
            links: deepLinks(c),
            since: daysSinceContact(c.last_contact, today),
            bday: daysToBirthday(c.birthday, today),
            debt: open.reduce((s, d) => s + (d.direction === "я должен" ? -d.amount : d.amount), 0),
            connection: typeof p.fm.connection === "string" ? p.fm.connection : "",
            cat,
            close,
          };
        })
        .filter(({ cat }) => (cats.size ? (cat ? cats.has(cat) : false) : cat !== "автор"))
        .filter(({ close }) => {
          if (!near) return true;
          if (near === "—") return close === undefined;
          const min = Number(near);
          return close !== undefined && close >= min;
        })
        .filter(({ p }) => !grp || (grp === "—" ? !groupsOf(p).length : groupsOf(p).includes(grp)))
        .filter(({ p }) => !theme || p.theme === theme)
        .filter(({ p, connection }) => !q || p.title.toLowerCase().includes(q.toLowerCase()) || p.aliases.some((a) => a.toLowerCase().includes(q.toLowerCase())) || connection.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => {
          if (sort === "contact") return (b.since ?? 1e9) - (a.since ?? 1e9);
          if (sort === "birthday") return (a.bday ?? 1e9) - (b.bday ?? 1e9);
          return a.p.title.localeCompare(b.p.title);
        }),
    [v, life, q, theme, sort, today, cats, near, grp],
  );

  const groups = useMemo(() => allGroups(v.pages.filter((p) => p.zone === "person")), [v]);
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

      <div className="row wrap" style={{ margin: "16px 0 0", gap: 8 }}>
        <button className="btn primary" onClick={() => setAdding(true)}>+ Добавить человека</button>
        <Link className="btn" to={`/theme/${encodeURIComponent("Social & friends")}/rings`}>Круги</Link>
        <Link className="btn" to={`/theme/${encodeURIComponent("Social & friends")}/relatives`}>Родственники</Link>
      </div>
      <AddPersonSheet open={adding} onClose={() => setAdding(false)} />

      <div className="row wrap" style={{ margin: "12px 0", gap: 8 }}>
        <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder={t("filter")} value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 240 }} />
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

      <div className="row wrap filters">
        <span className="small muted">кто:</span>
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip link ${cats.has(c) ? "on" : ""}`} onClick={() => setCats((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; })}>{c}</button>
        ))}
        {cats.size > 0 && <button className="chip link" onClick={() => setCats(new Set())}>сбросить</button>}
      </div>
      <div className="row wrap filters">
        <span className="small muted">близость:</span>
        {["10", "9", "8", "7", "5", "—"].map((n) => (
          <button key={n} className={`chip link ${near === n ? "on" : ""}`} onClick={() => setNear(near === n ? "" : n)}>{n === "—" ? "не указана" : n === "10" ? "10" : `${n}+`}</button>
        ))}
      </div>
      {groups.length > 0 && (
        <div className="row wrap filters">
          <span className="small muted">группа:</span>
          {groups.map((g) => <button key={g.name} className={`chip link ${grp === g.name ? "on" : ""}`} onClick={() => setGrp(grp === g.name ? "" : g.name)}>{g.name} <span className="faint">{g.n}</span></button>)}
          <button className={`chip link ${grp === "—" ? "on" : ""}`} onClick={() => setGrp(grp === "—" ? "" : "—")}>без группы</button>
        </div>
      )}
      <table className="tbl">
        <thead><tr><th>{t("col_name")}</th><th>кто</th><th style={{ textAlign: "right" }}>близость</th><th>{t("col_connection")}</th><th>контакт</th><th>общались</th><th style={{ textAlign: "right" }}>долг</th></tr></thead>
        <tbody>
          {people.map(({ p, links, since, debt, connection, cat, close }) => (
            <tr key={p.rel}>
              <td><Link to={pageUrl(p)} style={{ fontWeight: 500 }}>{p.title}</Link>{groupsOf(p).map((g) => <span key={g} className="chip small" style={{ marginLeft: 6 }}>{g}</span>)}</td>
              <td><span className="chip c" style={{ ["--c" as string]: themeColor(p.theme) }} title={p.theme ? themeLabel(p.theme) : ""}>{cat ?? "—"}</span></td>
              <td className="mono" style={{ textAlign: "right" }}>{close ?? ""}</td>
              <td className="muted">{connection || "—"}</td>
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
