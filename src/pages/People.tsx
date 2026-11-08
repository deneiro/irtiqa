import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { themeColor } from "../lib/themes";
import { pageUrl } from "../lib/vault";
import { useT } from "../lib/i18n";
import { openExternal } from "../lib/native";
import { todayStr } from "../lib/dates";
import { allGroups, groupsOf, categoryOf, contactsOf, daysSinceContact, daysToBirthday, debtsFor, deepLinks, isAuthor, type Category } from "../lib/people";
import { setFrontmatterKeys } from "../lib/frontmatter";
import { planRename } from "../lib/renamePerson";
import { renameFile } from "../lib/fs";
import { rawPageText } from "../lib/rawpage";
import type { Page } from "../lib/types";
import AddPersonSheet from "./person/AddPersonSheet";

type Sort = "name" | "contact" | "birthday";

/** The kinds he sorts people by in the book (Eldar, 2026-11-08: наставник, экс, автор — «их не надо»). */
const LIST_CATEGORIES: Category[] = ["семья", "родня", "лучший друг", "друг", "знакомый", "коллега"];

/**
 * The contact book. Closeness lives on «Круги», the tie in the group, so the table is name · кто · контакт ·
 * общались · долг. The basic things are changed right in the row — ✎, type, Enter — without opening the page
 * (Eldar, 2026-11-08: «не заходя внутрь, изменить вот эти базовые вещи»); the rest is on the person page.
 */
export default function PeoplePage() {
  const v = useVault();
  const { life } = useStore();
  const { t, themeLabel } = useT();
  const today = todayStr();
  const [q, setQ] = useState("");
  // «Требует тебя» opens this list sorted by the longest silence (?sort=contact).
  const [sort, setSort] = useState<Sort>(() => {
    const s = new URLSearchParams(location.hash.split("?")[1] ?? "").get("sort");
    return s === "contact" || s === "birthday" ? s : "name";
  });
  const [cats, setCats] = useState<Set<Category>>(new Set());
  const [grp, setGrp] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const people = useMemo(
    () =>
      v.pages
        .filter((p) => p.zone === "person" && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p))
        .map((p) => {
          const c = contactsOf(p);
          const open = debtsFor(p, life?.debts ?? []).filter((d) => !d.closed);
          return {
            p,
            links: deepLinks(c),
            since: daysSinceContact(c.last_contact, today),
            bday: daysToBirthday(c.birthday, today),
            debt: open.reduce((s, d) => s + (d.direction === "я должен" ? -d.amount : d.amount), 0),
            cat: categoryOf(p),
          };
        })
        .filter(({ cat }) => (cats.size ? (cat ? cats.has(cat) : false) : cat !== "автор"))
        .filter(({ p }) => !grp || (grp === "—" ? !groupsOf(p).length : groupsOf(p).includes(grp)))
        .filter(({ p }) => {
          if (!q) return true;
          const s = q.toLowerCase();
          return p.title.toLowerCase().includes(s) || p.aliases.some((a) => a.toLowerCase().includes(s)) || groupsOf(p).some((g) => g.toLowerCase().includes(s));
        })
        .sort((a, b) => {
          if (sort === "contact") return (b.since ?? 1e9) - (a.since ?? 1e9);
          if (sort === "birthday") return (a.bday ?? 1e9) - (b.bday ?? 1e9);
          return a.p.title.localeCompare(b.p.title);
        }),
    [v, life, q, sort, today, cats, grp],
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
        <select className="text" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="name">по имени</option>
          <option value="contact">давно не общались</option>
          <option value="birthday">ближайшие дни рождения</option>
        </select>
        <span className="small faint" style={{ marginLeft: "auto" }}>{people.length}</span>
      </div>

      <div className="row wrap filters">
        <span className="small muted">кто:</span>
        {LIST_CATEGORIES.map((c) => (
          <button key={c} className={`chip link ${cats.has(c) ? "on" : ""}`} onClick={() => setCats((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; })}>{c}</button>
        ))}
        {cats.size > 0 && <button className="chip link" onClick={() => setCats(new Set())}>сбросить</button>}
      </div>
      {groups.length > 0 && (
        <div className="row wrap filters">
          <span className="small muted">группа:</span>
          {groups.map((g) => <button key={g.name} className={`chip link ${grp === g.name ? "on" : ""}`} onClick={() => setGrp(grp === g.name ? "" : g.name)}>{g.name} <span className="faint">{g.n}</span></button>)}
          <button className={`chip link ${grp === "—" ? "on" : ""}`} onClick={() => setGrp(grp === "—" ? "" : "—")}>без группы</button>
        </div>
      )}
      <datalist id="pl-groups">{groups.map((g) => <option key={g.name} value={g.name} />)}</datalist>
      <table className="tbl">
        <thead><tr><th>{t("col_name")}</th><th>кто</th><th>контакт</th><th>общались</th><th style={{ textAlign: "right" }}>долг</th><th /></tr></thead>
        <tbody>
          {people.map(({ p, links, since, debt, cat }) => editing === p.rel ? (
            <EditRow key={p.rel} page={p} onDone={() => setEditing(null)} />
          ) : (
            <tr key={p.rel}>
              <td><Link to={pageUrl(p)} style={{ fontWeight: 500 }}>{p.title}</Link>{groupsOf(p).map((g) => <span key={g} className="chip small" style={{ marginLeft: 6 }}>{g}</span>)}</td>
              <td><span className="chip c" style={{ ["--c" as string]: themeColor(p.theme) }} title={p.theme ? themeLabel(p.theme) : ""}>{cat ?? "—"}</span></td>
              <td>
                <span className="row" style={{ gap: 4 }}>
                  {links.map((l) => <button key={l.key} className="btn small ghost" title={l.url} onClick={() => void openExternal(l.url)}>{l.label}</button>)}
                </span>
              </td>
              <td className={`mono ${since !== undefined && since > 30 ? "muted" : ""}`}>{since === undefined ? "—" : since === 0 ? "сегодня" : `${since} дн.`}</td>
              <td className={`mono ${debt < 0 ? "muted" : ""}`} style={{ textAlign: "right" }}>{debt ? Math.round(debt).toLocaleString("ru-RU") : ""}</td>
              <td style={{ textAlign: "right" }}><button className="btn small ghost" title="Изменить в строке" onClick={() => setEditing(p.rel)}>✎</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!people.length && <div className="empty">{t("ent_none")}</div>}
      <div className="small faint" style={{ marginTop: 10 }}>✎ — поменять имя, «кто», группу и контакты прямо в строке; Enter — сохранить, Esc — отмена. Остальное — на странице человека. Долг со знаком минус означает «я должен».</div>
    </div>
  );
}

/** One row in edit mode: name, группа, кто, телефон, telegram. Saves only what changed; a new name moves every link. */
function EditRow({ page, onDone }: { page: Page; onDone: () => void }) {
  const { root, vault, saveText, reload } = useStore();
  const c = contactsOf(page);
  const was = { name: page.title, cat: categoryOf(page) ?? "", group: groupsOf(page).join(", "), phone: c.phone ?? "", telegram: c.telegram ?? "" };
  const [f, setF] = useState(was);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  const save = async () => {
    if (!vault || busy) return;
    setBusy(true);
    try {
      const raw = rawPageText(vault, page.rel);
      if (raw === null) throw new Error("не нашёл страницу человека");
      const patch: Record<string, string | string[] | null> = {};
      if (f.cat !== was.cat) patch.category = f.cat || null;
      if (f.group.trim() !== was.group) { const g = f.group.split(",").map((x) => x.trim()).filter(Boolean); patch.group = g.length > 1 ? g : g[0] ?? null; }
      if (f.phone.trim() !== was.phone) patch.phone = f.phone.trim() || null;
      if (f.telegram.trim() !== was.telegram) patch.telegram = f.telegram.trim() || null;
      const name = f.name.trim();
      const renaming = !!name && name !== was.name;
      if (!Object.keys(patch).length && !renaming) { onDone(); return; }
      patch.updated = todayStr();
      let next = setFrontmatterKeys(raw, patch);
      if (renaming) {
        next = next.replace(new RegExp(`^# ${was.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m"), `# ${name}`);
        const plan = planRename({ ...vault, rawByRel: new Map(vault.rawByRel).set(page.rel, next) }, page, name, vault.life);
        if (plan.error) throw new Error(plan.error);
        await saveText(page.rel, next);
        await renameFile(root, plan.oldRel, plan.newRel);
        for (const e of plan.edits) await saveText(e.rel === plan.oldRel ? plan.newRel : e.rel, e.content);
      } else if (next !== raw) await saveText(page.rel, next);
      onDone();
      await reload(renaming || undefined);
    } catch (e) { setErr(String(e).replace(/^Error: /, "")); } finally { setBusy(false); }
  };
  const keys = (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); void save(); } if (e.key === "Escape") onDone(); };
  const input = { className: "text", autoCorrect: "off", autoCapitalize: "off", spellCheck: false, onKeyDown: keys, disabled: busy } as const;

  return (
    <tr>
      <td style={{ whiteSpace: "nowrap" }}>
        <input {...input} autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="имя" style={{ width: 150 }} />
        <input {...input} list="pl-groups" value={f.group} onChange={(e) => set({ group: e.target.value })} placeholder="группа" style={{ width: 120, marginLeft: 6 }} />
        {err && <div className="d-warn small">{err}</div>}
      </td>
      <td>
        <select className="text" value={f.cat} disabled={busy} onChange={(e) => set({ cat: e.target.value })} onKeyDown={keys}>
          <option value="">—</option>
          {[...LIST_CATEGORIES, ...(f.cat && !LIST_CATEGORIES.includes(f.cat as Category) ? [f.cat] : [])].map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </td>
      <td colSpan={3} style={{ whiteSpace: "nowrap" }}>
        <input {...input} value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="телефон" style={{ width: 140 }} />
        <input {...input} value={f.telegram} onChange={(e) => set({ telegram: e.target.value })} placeholder="telegram" style={{ width: 120, marginLeft: 6 }} />
      </td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        <button className="btn small primary" disabled={busy} onClick={() => void save()}>✓</button>
        <button className="btn small ghost" disabled={busy} onClick={onDone} title="Отмена">×</button>
      </td>
    </tr>
  );
}
