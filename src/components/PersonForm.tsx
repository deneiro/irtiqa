import { useImperativeHandle, useMemo, useState, type Ref } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import type { Page } from "../lib/types";
import { confirmAction } from "../lib/native";
import { todayStr } from "../lib/dates";
import { setBody, setFrontmatterKeys } from "../lib/frontmatter";
import { deleteSummary, planDelete, planRename, planSummary } from "../lib/renamePerson";
import { renameFile, trashPerson } from "../lib/fs";
import { rawPageText } from "../lib/rawpage";
import {
  CATEGORIES, CONTACT_KEYS, groupsOf, CONTACT_LABELS, ROLES, categoryOf, closenessOf, contactsOf, formatRelation, isAuthor, relationsOf, textOf,
  type Contacts, type Relation,
} from "../lib/people";

interface Fields {
  title: string;
  category: string;
  closeness: string;
  group: string;
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
    group: groupsOf(page).join(", "),
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

/** What the button that opened the form calls to close it: asks first when something typed is not saved. */
export interface PersonFormHandle { cancel: () => Promise<void> }

/**
 * One form for everything Eldar knows about the person — «заполнить» on the
 * full page, «изменить» on the person page (spec v5). It lives while it is
 * open, so it always starts from the page as it is on disk. Typing touches
 * nothing on disk: the page is written once, when «сохранить» is pressed.
 */
export default function PersonForm({ page, onClose, ref }: { page: Page; onClose: () => void; ref?: Ref<PersonFormHandle> }) {
  const { root, vault, saveText, reload } = useStore();
  const nav = useNavigate();
  const today = todayStr();
  const saved = contactsOf(page);
  const [fields, setFields] = useState<Fields>(() => fieldsOf(page));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (patch: Partial<Fields>) => setFields((f) => ({ ...f, ...patch }));

  const people = useMemo(
    () => (vault?.pages ?? []).filter((p) => p.zone === "person" && p !== page && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p)),
    [vault, page],
  );
  const known = (name: string) => people.some((p) => p.title === name || p.file === name);

  const rename = useMemo(
    () => (vault && fields.title.trim() && fields.title.trim() !== page.title ? planRename(vault, page, fields.title, vault.life) : undefined),
    [vault, page, fields.title],
  );
  const dirty = JSON.stringify(fields) !== JSON.stringify(fieldsOf(page));
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
      if (list(fields.group).join() !== list(was.group).join()) { const g = list(fields.group); patch.group = g.length > 1 ? g : g[0] ?? null; }
      if (list(fields.aliases).join() !== list(was.aliases).join()) patch.aliases = list(fields.aliases);
      if (list(fields.tags).join() !== list(was.tags).join()) patch.tags = list(fields.tags);
      const rel = fields.related.map((r) => ({ role: r.role.trim(), name: r.name.trim() })).filter((r) => r.name);
      if (JSON.stringify(rel) !== JSON.stringify(was.related)) patch.related = rel.length ? rel.map((r) => formatRelation(r, known)) : null;
      for (const k of CONTACT_KEYS) {
        const v = (fields.contacts[k] ?? "").trim();
        if (v !== (saved[k] ?? "")) patch[k] = v || null;
      }
      const bodyChanged = fields.body.trim() !== was.body.trim() || fields.title.trim() !== page.title;
      if (!Object.keys(patch).length && !bodyChanged && !rename) { onClose(); return; }
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
        onClose();
        await reload();
        nav(`/page/${encodeURIComponent(plan.newRel)}`, { replace: true });
        return;
      }
      setErr(null);
      onClose();
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
      onClose();
      await reload(true);
      nav("/people", { replace: true });
    } catch (e) { setErr(String(e)); setBusy(false); }
  };

  const cancel = async () => {
    if (dirty && !(await confirmAction("Закрыть без сохранения? Введённое пропадёт."))) return;
    onClose();
  };
  useImperativeHandle(ref, () => ({ cancel }));

  return (
    <>
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
            <label className="cfield"><span>группа</span><input className="text" {...INPUT} placeholder="12C, Crocus, Shym… — откуда знаешь" value={fields.group} onChange={(e) => set({ group: e.target.value })} /></label>
            <label className="cfield"><span>как познакомились</span><input className="text" {...INPUT} value={fields.how} onChange={(e) => set({ how: e.target.value })} /></label>
          </div>
        </fieldset>

        <fieldset>
          <legend>жизнь</legend>
          <div className="pgrid">
            <label className="cfield"><span>где живёт</span><input className="text" {...INPUT} placeholder="город, район" value={fields.lives} onChange={(e) => set({ lives: e.target.value })} /></label>
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
      {err && <div className="small" style={{ color: "var(--danger)", marginTop: 6 }}>{err}</div>}
    </>
  );
}
