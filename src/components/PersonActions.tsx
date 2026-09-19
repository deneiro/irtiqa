import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import type { Page } from "../lib/types";
import { confirmAction, openExternal } from "../lib/native";
import { todayStr } from "../lib/dates";
import { setBody, setFrontmatterKeys } from "../lib/frontmatter";
import { deleteSummary, planDelete, planRename, planSummary } from "../lib/renamePerson";
import { renameFile, trashPerson } from "../lib/fs";
import { rawPageText } from "../lib/rawpage";
import {
  CATEGORIES, CONTACT_KEYS, CONTACT_LABELS, ROLES, categoryOf, closenessOf, contactsOf, daysSinceContact, daysToBirthday, debtsFor, deepLinks,
  formatRelation, isAuthor, relatedFrom, relationsOf, textOf, type Contacts, type Relation,
} from "../lib/people";
import { pageUrl } from "../lib/vault";
import { eventUrl, eventsFor } from "../lib/events";
import { debtLeft } from "../lib/life";
import { mediaUrl } from "../lib/native";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("ru-RU");
}

interface Fields {
  title: string;
  category: string;
  closeness: string;
  connection: string;
  how: string;
  lives: string;
  work: string;
  related: Relation[];
  contacts: Contacts;
  aliases: string;
  tags: string;
  body: string;
}

function fieldsOf(page: Page): Fields {
  return {
    title: page.title,
    category: categoryOf(page) ?? "",
    closeness: String(closenessOf(page) ?? ""),
    connection: textOf(page, "connection"),
    how: textOf(page, "how_we_met"),
    lives: textOf(page, "lives"),
    work: textOf(page, "work"),
    related: relationsOf(page),
    contacts: contactsOf(page),
    aliases: page.aliases.join(", "),
    tags: page.tags.join(", "),
    body: page.body.replace(/^\s*# [^\n]*\n/, "").trim(),
  };
}

const INPUT = { autoCorrect: "off", autoCapitalize: "off", spellCheck: false } as const;

/**
 * The contact bar on a People page, and one form for everything Eldar knows
 * about the person. Typing touches nothing on disk: the page is written once,
 * when «сохранить» is pressed.
 */
export default function PersonActions({ page }: { page: Page }) {
  const { root, vault, life, saveText, reload } = useStore();
  const nav = useNavigate();
  const today = todayStr();
  const saved = contactsOf(page);
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<Fields>(() => fieldsOf(page));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // A write elsewhere re-parses the page; an open form keeps what is being typed.
  useEffect(() => { if (!open) setFields(fieldsOf(page)); }, [page, open]);
  const set = (patch: Partial<Fields>) => setFields((f) => ({ ...f, ...patch }));

  const people = useMemo(
    () => (vault?.pages ?? []).filter((p) => p.zone === "person" && p !== page && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p)),
    [vault, page],
  );
  const known = (name: string) => people.some((p) => p.title === name || p.file === name);
  const pageOf = (name: string) => people.find((p) => p.title === name || p.file === name || p.aliases.includes(name));
  const relations = relationsOf(page);
  const backlinks = useMemo(() => relatedFrom(page, vault?.pages ?? []), [page, vault]);

  const rename = useMemo(
    () => (open && vault && fields.title.trim() && fields.title.trim() !== page.title ? planRename(vault, page, fields.title, vault.life) : undefined),
    [open, vault, page, fields.title],
  );
  const dirty = open && JSON.stringify(fields) !== JSON.stringify(fieldsOf(page));
  const links = deepLinks(saved);
  const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);

  /** One write for the whole form, then a move if the name changed. */
  const saveAll = async () => {
    if (!vault) return;
    setBusy(true);
    try {
      const raw = rawPageText(vault, page.rel);
      if (raw === null) throw new Error("не нашёл исходный текст страницы");
      // Only what was actually changed is rewritten: an untouched key keeps its bytes.
      const was = fieldsOf(page);
      const patch: Record<string, string | string[] | null> = {};
      const text = (k: string, v: string, old: string) => { if (v.trim() !== old.trim()) patch[k] = v.trim() || null; };
      text("connection", fields.connection, was.connection);
      text("how_we_met", fields.how, was.how);
      text("lives", fields.lives, was.lives);
      text("work", fields.work, was.work);
      text("category", fields.category, was.category);
      if (fields.closeness !== was.closeness) {
        const n = Number(fields.closeness);
        patch.closeness = Number.isFinite(n) && n > 0 && n <= 10 ? String(Math.round(n)) : null;
      }
      if (list(fields.aliases).join() !== list(was.aliases).join()) patch.aliases = list(fields.aliases);
      if (list(fields.tags).join() !== list(was.tags).join()) patch.tags = list(fields.tags);
      const rel = fields.related.map((r) => ({ role: r.role.trim(), name: r.name.trim() })).filter((r) => r.name);
      if (JSON.stringify(rel) !== JSON.stringify(was.related)) patch.related = rel.length ? rel.map((r) => formatRelation(r, known)) : null;
      for (const k of CONTACT_KEYS) {
        const v = (fields.contacts[k] ?? "").trim();
        if (v !== (saved[k] ?? "")) patch[k] = v || null;
      }
      const bodyChanged = fields.body.trim() !== was.body.trim() || fields.title.trim() !== page.title;
      if (!Object.keys(patch).length && !bodyChanged && !rename) { setOpen(false); return; }
      patch.updated = today;
      let next = setFrontmatterKeys(raw, patch);
      if (bodyChanged) {
        const heading = page.body.match(/^\s*# ([^\n]*)\n/);
        next = setBody(next, (heading ? `# ${fields.title.trim() || page.title}\n\n` : "") + fields.body.trim() + "\n");
      }
      if (next !== raw) await saveText(page.rel, next);

      if (rename && !rename.error) {
        const plan = planRename({ ...vault, rawByRel: new Map(vault.rawByRel).set(page.rel, next) }, page, fields.title, vault.life);
        if (plan.error) throw new Error(plan.error);
        await renameFile(root, plan.oldRel, plan.newRel);
        for (const e of plan.edits) await saveText(e.rel === plan.oldRel ? plan.newRel : e.rel, e.content);
        setErr(null);
        setOpen(false);
        await reload();
        nav(`/page/${encodeURIComponent(plan.newRel)}`, { replace: true });
        return;
      }
      setErr(null);
      setOpen(false);
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  /** The page to the Trash, its list lines gone, every link left as the plain name. */
  const remove = async () => {
    if (!vault) return;
    const plan = planDelete(vault, page, vault.life);
    if (!(await confirmAction(`Удалить «${page.title}»?\n\n${deleteSummary(plan)}.`, "Удалить человека"))) return;
    setBusy(true);
    try {
      await trashPerson(root, page.rel);
      for (const e of plan.edits) await saveText(e.rel, e.content);
      setErr(null);
      setOpen(false);
      await reload(true);
      nav("/people", { replace: true });
    } catch (e) { setErr(String(e)); setBusy(false); }
  };

  const cancel = async () => {
    if (dirty && !(await confirmAction("Закрыть без сохранения? Введённое пропадёт."))) return;
    setOpen(false);
    setFields(fieldsOf(page));
  };

  const debts = debtsFor(page, life?.debts ?? []);
  const openDebts = debts.filter((d) => !d.closed && debtLeft(d) > 0);
  const events = eventsFor([page.title, page.file, ...page.aliases], life?.events ?? []);
  const left = openDebts.reduce((s, d) => s + debtLeft(d), 0);
  const settled = debts.filter((d) => d.closed);
  const since = daysSinceContact(saved.last_contact, today);
  const bday = daysToBirthday(saved.birthday, today);

  const write = async (patch: Record<string, string | null>) => {
    const raw = vault ? rawPageText(vault, page.rel) : null;
    if (raw === null) throw new Error("не нашёл исходный текст страницы");
    await saveText(page.rel, setFrontmatterKeys(raw, patch));
  };

  const touch = async () => {
    setBusy(true);
    try { await write({ last_contact: today }); setErr(null); await reload(); } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="ractions person">
      <div className="row wrap" style={{ gap: 8 }}>
        {links.map((l) => (
          <button key={l.key} className="btn" onClick={() => void openExternal(l.url)} title={l.url}>{l.label}</button>
        ))}
        {links.length === 0 && <span className="small muted">Контактов нет. Добавь телефон или ник, и появятся кнопки для чата.</span>}
        <span className="grow" />
        <button className="btn" onClick={() => void touch()} disabled={busy} title="поставить last_contact = сегодня">
          {since === undefined ? "Связались сегодня" : since === 0 ? "✓ общались сегодня" : `Связались сегодня · ${since} дн. назад`}
        </button>
        <button className={`btn ${open ? "ghost" : "primary"}`} onClick={() => (open ? void cancel() : setOpen(true))}>{open ? "закрыть" : "заполнить"}</button>
      </div>

      <PersonFacts page={page} relations={relations} backlinks={backlinks} pageOf={pageOf} />

      {(bday !== undefined || openDebts.length > 0) && (
        <div className="row wrap small" style={{ marginTop: 10, gap: 14 }}>
          {bday !== undefined && <span className={bday <= 7 ? "hl" : "muted"}>🎂 {bday === 0 ? "день рождения сегодня" : `день рождения через ${bday} дн.`} ({saved.birthday})</span>}
          {left > 0 && <Link to="/finance" className={openDebts[0]?.direction === "я должен" ? "muted" : ""}>{openDebts[0]?.direction}: <b>{fmt(left)} ₸</b> в {openDebts.length} {openDebts.length === 1 ? "долге" : "долгах"}</Link>}
        </div>
      )}

      {open && (
        <form className="pform" onSubmit={(e) => { e.preventDefault(); void saveAll(); }}>
          <datalist id="pf-people">{people.map((p) => <option key={p.rel} value={p.title} />)}</datalist>
          <datalist id="pf-roles">{ROLES.map((r) => <option key={r} value={r} />)}</datalist>

          <fieldset>
            <legend>кто он тебе</legend>
            <div className="row wrap" style={{ gap: 6 }}>
              {CATEGORIES.map((c) => (
                <button key={c} type="button" className={`chip ${fields.category === c ? "on" : ""}`} onClick={() => set({ category: fields.category === c ? "" : c })}>{c}</button>
              ))}
            </div>
            <div className="row wrap" style={{ gap: 4, marginTop: 10 }}>
              <span className="small muted" style={{ marginRight: 6 }}>близость</span>
              {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
                <button key={n} type="button" className={`chip small ${fields.closeness === n ? "on" : ""}`} onClick={() => set({ closeness: fields.closeness === n ? "" : n })}>{n}</button>
              ))}
            </div>
            <div className="pgrid">
              <label className="cfield"><span>кем приходится</span><input className="text" {...INPUT} placeholder="одноклассник, дядя по отцу…" value={fields.connection} onChange={(e) => set({ connection: e.target.value })} /></label>
              <label className="cfield"><span>как познакомились</span><input className="text" {...INPUT} value={fields.how} onChange={(e) => set({ how: e.target.value })} /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>жизнь</legend>
            <div className="pgrid">
              <label className="cfield"><span>где живёт</span><input className="text" {...INPUT} placeholder="Шымкент, мкр Нурсат" value={fields.lives} onChange={(e) => set({ lives: e.target.value })} /></label>
              <label className="cfield"><span>кем работает</span><input className="text" {...INPUT} placeholder="таксист, свой магазин…" value={fields.work} onChange={(e) => set({ work: e.target.value })} /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>связанные люди</legend>
            {fields.related.map((r, i) => (
              <div className="prel" key={i}>
                <input className="text" {...INPUT} list="pf-roles" placeholder="кто: жена, сын…" value={r.role}
                  onChange={(e) => set({ related: fields.related.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)) })} />
                <input className="text" {...INPUT} list="pf-people" placeholder="имя" value={r.name}
                  onChange={(e) => set({ related: fields.related.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <span className="small faint">{r.name.trim() ? (known(r.name.trim()) ? "есть страница" : "без страницы") : ""}</span>
                <button type="button" className="btn small ghost" title="убрать" onClick={() => set({ related: fields.related.filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
            <button type="button" className="btn small" onClick={() => set({ related: [...fields.related, { role: "", name: "" }] })}>+ человек</button>
          </fieldset>

          <fieldset>
            <legend>контакты</legend>
            <div className="pgrid three">
              {CONTACT_KEYS.map((k) => (
                <label key={k} className="cfield">
                  <span>{CONTACT_LABELS[k]}</span>
                  <input className="text" {...INPUT} type={k === "last_contact" ? "date" : "text"} value={fields.contacts[k] ?? ""} placeholder={k === "birthday" ? "ГГГГ-ММ-ДД или ММ-ДД" : ""}
                    onChange={(e) => set({ contacts: { ...fields.contacts, [k]: e.target.value } })} />
                </label>
              ))}
            </div>
          </fieldset>

          <details className="pmore">
            <summary className="small muted">имя, другие имена, теги, текст страницы</summary>
            <div className="pgrid">
              <label className="cfield" style={{ gridColumn: "1 / -1" }}>
                <span>имя · переименует файл и ссылки во всём vault</span>
                <input className="text" {...INPUT} value={fields.title} onChange={(e) => set({ title: e.target.value })} />
              </label>
              {rename && <div className={`small ${rename.error ? "err-text" : "muted"}`} style={{ gridColumn: "1 / -1", marginTop: -4 }}>{rename.error ?? planSummary(rename)}</div>}
              <label className="cfield"><span>другие имена, через запятую</span><input className="text" {...INPUT} value={fields.aliases} onChange={(e) => set({ aliases: e.target.value })} /></label>
              <label className="cfield"><span>теги, через запятую</span><input className="text" {...INPUT} value={fields.tags} onChange={(e) => set({ tags: e.target.value })} /></label>
              <label className="cfield" style={{ gridColumn: "1 / -1" }}>
                <span>текст страницы</span>
                <textarea className="text" {...INPUT} rows={8} value={fields.body} onChange={(e) => set({ body: e.target.value })} style={{ resize: "vertical", fontFamily: "var(--font-read)", fontSize: 14 }} />
              </label>
            </div>
          </details>

          <div className="pfoot">
            <button className="btn primary" type="submit" disabled={busy || !dirty || !!rename?.error}>{busy ? "сохраняю…" : "сохранить"}</button>
            <button className="btn ghost" type="button" onClick={() => void cancel()}>отмена</button>
            <span className="small faint">{dirty ? "есть несохранённые изменения — в файл ничего не ушло" : "изменений нет"}</span>
            <span className="grow" />
            <button className="btn ghost danger" type="button" disabled={busy} onClick={() => void remove()} title="страница уйдёт в Корзину, ссылки на неё станут просто именем">удалить человека</button>
          </div>
        </form>
      )}

      {debts.length > 0 && (
        <details className="pdebts" open={openDebts.length > 0}>
          <summary className="small muted">Долги: {openDebts.length} открытых на {fmt(left)} ₸{settled.length ? `, ${settled.length} закрытых` : ""}</summary>
          <table className="tbl" style={{ marginTop: 8 }}>
            <thead><tr><th>с даты</th><th style={{ textAlign: "right" }}>сумма</th><th style={{ textAlign: "right" }}>внесено</th><th style={{ textAlign: "right" }}>остаток</th><th>за что</th><th>статус</th></tr></thead>
            <tbody>
              {[...openDebts, ...settled].map((d, i) => (
                <tr key={i} className={d.closed ? "muted" : ""}>
                  <td className="mono">{d.since}</td>
                  <td className="amt mono" style={{ textAlign: "right" }}>{fmt(d.amount)}</td>
                  <td className="amt mono" style={{ textAlign: "right" }}>{d.paid ? fmt(d.paid) : ""}</td>
                  <td className="amt mono neg" style={{ textAlign: "right" }}>{d.closed ? "" : fmt(debtLeft(d))}</td>
                  <td>{d.note}</td>
                  <td className="small">{d.closed ? `закрыт ${d.closed}` : d.direction}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="small faint" style={{ marginTop: 6 }}>Вносить оплату — на экране <Link to="/finance">Финансы</Link>: сумма ложится на самые старые долги.</div>
        </details>
      )}

      {events.length > 0 && (
        <div className="pevents">
          <div className="small muted">вместе: {events.length}</div>
          <div className="row wrap" style={{ gap: 8, marginTop: 6 }}>
            {events.map((e) => (
              <Link key={e.rel} to={eventUrl(e)} className="pevent">
                {e.photos[0] && <img src={mediaUrl(root, e.photos[0])} alt="" loading="lazy" />}
                <span>
                  <b>{e.title}</b>
                  <span className="small faint">{e.date}{e.place ? ` · ${e.place}` : ""}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {err && <div className="small" style={{ color: "var(--danger)", marginTop: 6 }}>{err}</div>}
    </div>
  );
}

/** What is already known, in one line: the tie, where they live, what they do, who is theirs. */
function PersonFacts({ page, relations, backlinks, pageOf }: {
  page: Page;
  relations: Relation[];
  backlinks: { page: Page; role: string }[];
  pageOf: (name: string) => Page | undefined;
}) {
  const category = categoryOf(page);
  const closeness = closenessOf(page);
  const lives = textOf(page, "lives");
  const work = textOf(page, "work");
  const who = (name: string) => {
    const p = pageOf(name);
    return p ? <Link to={pageUrl(p)}>{name}</Link> : <span>{name}</span>;
  };
  if (!category && !closeness && !lives && !work && !relations.length && !backlinks.length) return null;
  return (
    <div className="pfacts">
      {(category || closeness) && <span className="pf"><b>{category ?? "—"}</b>{closeness ? ` · близость ${closeness}/10` : ""}</span>}
      {lives && <span className="pf"><span className="k">живёт</span> {lives}</span>}
      {work && <span className="pf"><span className="k">работа</span> {work}</span>}
      {relations.map((r, i) => <span key={`r${i}`} className="pf">{r.role && <span className="k">{r.role}</span>} {who(r.name)}</span>)}
      {backlinks.map((b) => (
        <span key={b.page.rel} className="pf"><Link to={pageUrl(b.page)}>{b.page.title}</Link> <span className="k">называет {b.role ? `как «${b.role}»` : "связанным"}</span></span>
      ))}
    </div>
  );
}
