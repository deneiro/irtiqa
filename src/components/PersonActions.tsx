import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import type { Page } from "../lib/types";
import { openExternal } from "../lib/native";
import { todayStr } from "../lib/dates";
import { setBody, setFrontmatterKeys } from "../lib/frontmatter";
import { planRename, planSummary } from "../lib/renamePerson";
import { renameFile } from "../lib/fs";
import { rawPageText } from "../lib/rawpage";
import { CONTACT_KEYS, CONTACT_LABELS, contactsOf, daysSinceContact, daysToBirthday, debtsFor, deepLinks, type Contacts } from "../lib/people";
import { eventUrl, eventsFor } from "../lib/events";
import { debtLeft } from "../lib/life";
import { mediaUrl } from "../lib/native";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("ru-RU");
}

/** The contact bar on a People page: deep links, editable contact fields, debts. */
export default function PersonActions({ page }: { page: Page }) {
  const { root, vault, life, saveText, reload } = useStore();
  const nav = useNavigate();
  const today = todayStr();
  const saved = contactsOf(page);
  const [edit, setEdit] = useState(false);
  const [card, setCard] = useState(false);
  const [fields, setFields] = useState({
    title: page.title,
    connection: typeof page.fm.connection === "string" ? page.fm.connection : "",
    how: typeof page.fm.how_we_met === "string" ? page.fm.how_we_met : "",
    aliases: page.aliases.join(", "),
    tags: page.tags.join(", "),
    body: page.body.replace(/^\s*# [^\n]*\n/, "").trim(),
  });
  useEffect(() => {
    setFields({
      title: page.title,
      connection: typeof page.fm.connection === "string" ? page.fm.connection : "",
      how: typeof page.fm.how_we_met === "string" ? page.fm.how_we_met : "",
      aliases: page.aliases.join(", "),
      tags: page.tags.join(", "),
      body: page.body.replace(/^\s*# [^\n]*\n/, "").trim(),
    });
  }, [page]);

  const rename = useMemo(
    () => (vault && fields.title.trim() !== page.title ? planRename(vault, page, fields.title, vault.life) : undefined),
    [vault, page, fields.title],
  );
  const [form, setForm] = useState<Contacts>(saved);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setForm(contactsOf(page)); }, [page]);

  const links = deepLinks(saved);
  const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);

  /** Save the fields, then move the page if the name changed. */
  const saveCard = async () => {
    if (!vault) return;
    setBusy(true);
    try {
      const raw = rawPageText(vault, page.rel);
      if (raw === null) throw new Error("не нашёл исходный текст страницы");
      const withFm = setFrontmatterKeys(raw, {
        connection: fields.connection.trim() || null,
        how_we_met: fields.how.trim() || null,
        aliases: list(fields.aliases),
        tags: list(fields.tags),
        updated: today,
      });
      const heading = page.body.match(/^\s*# ([^\n]*)\n/);
      const body = (heading ? `# ${fields.title.trim() || page.title}\n\n` : "") + fields.body.trim() + "\n";
      await saveText(page.rel, setBody(withFm, body));

      if (rename && !rename.error) {
        const plan = planRename({ ...vault, rawByRel: new Map(vault.rawByRel).set(page.rel, setBody(withFm, body)) }, page, fields.title, vault.life);
        if (plan.error) throw new Error(plan.error);
        await renameFile(root, plan.oldRel, plan.newRel);
        for (const e of plan.edits) await saveText(e.rel === plan.oldRel ? plan.newRel : e.rel, e.content);
        setErr(null);
        setCard(false);
        await reload();
        nav(`/page/${encodeURIComponent(plan.newRel)}`, { replace: true });
        return;
      }
      setErr(null);
      setCard(false);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };
  const debts = debtsFor(page, life?.debts ?? []);
  const open = debts.filter((d) => !d.closed && debtLeft(d) > 0);
  const events = eventsFor([page.title, page.file, ...page.aliases], life?.events ?? []);
  const left = open.reduce((s, d) => s + debtLeft(d), 0);
  const settled = debts.filter((d) => d.closed);
  const since = daysSinceContact(saved.last_contact, today);
  const bday = daysToBirthday(saved.birthday, today);

  const write = async (patch: Record<string, string | null>) => {
    const raw = vault ? rawPageText(vault, page.rel) : null;
    if (raw === null) throw new Error("не нашёл исходный текст страницы");
    await saveText(page.rel, setFrontmatterKeys(raw, patch));
  };

  const save = async () => {
    setBusy(true);
    try {
      const patch: Record<string, string | null> = {};
      for (const k of CONTACT_KEYS) {
        const v = (form[k] ?? "").trim();
        if (v !== (saved[k] ?? "")) patch[k] = v || null;
      }
      if (Object.keys(patch).length) await write(patch);
      setEdit(false);
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
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
        <button className="btn ghost" onClick={() => setEdit(!edit)}>{edit ? "скрыть" : "контакты"}</button>
        <button className="btn ghost" onClick={() => setCard(!card)}>{card ? "скрыть" : "карточка"}</button>
      </div>

      {(bday !== undefined || open.length > 0) && (
        <div className="row wrap small" style={{ marginTop: 10, gap: 14 }}>
          {bday !== undefined && <span className={bday <= 7 ? "hl" : "muted"}>🎂 {bday === 0 ? "день рождения сегодня" : `день рождения через ${bday} дн.`} ({saved.birthday})</span>}
          {left > 0 && <Link to="/finance" className={open[0]?.direction === "я должен" ? "muted" : ""}>{open[0]?.direction}: <b>{fmt(left)} ₸</b> в {open.length} {open.length === 1 ? "долге" : "долгах"}</Link>}
        </div>
      )}

      {edit && (
        <form className="cform" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          {CONTACT_KEYS.map((k) => (
            <label key={k} className="cfield">
              <span>{CONTACT_LABELS[k]}</span>
              <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} type={k === "last_contact" ? "date" : "text"} value={form[k] ?? ""} placeholder={k === "birthday" ? "ГГГГ-ММ-ДД или ММ-ДД" : ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </label>
          ))}
          <div className="row" style={{ gridColumn: "1 / -1" }}>
            <button className="btn primary" type="submit" disabled={busy}>сохранить</button>
            <button className="btn ghost" type="button" onClick={() => { setForm(saved); setEdit(false); }}>отмена</button>
            <span className="small faint">Пишется только во frontmatter страницы, текст не трогается.</span>
          </div>
        </form>
      )}
      {card && (
        <form className="pcard" onSubmit={(e) => { e.preventDefault(); void saveCard(); }}>
          <label className="cfield" style={{ gridColumn: "1 / -1" }}>
            <span>имя · переименует файл и ссылки во всём vault</span>
            <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={fields.title} onChange={(e) => setFields({ ...fields, title: e.target.value })} />
          </label>
          {rename && (
            <div className={`small ${rename.error ? "err-text" : "muted"}`} style={{ gridColumn: "1 / -1", marginTop: -4 }}>
              {rename.error ?? planSummary(rename)}
            </div>
          )}
          <label className="cfield"><span>связь</span><input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={fields.connection} onChange={(e) => setFields({ ...fields, connection: e.target.value })} /></label>
          <label className="cfield"><span>как познакомились</span><input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={fields.how} onChange={(e) => setFields({ ...fields, how: e.target.value })} /></label>
          <label className="cfield"><span>другие имена, через запятую</span><input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={fields.aliases} onChange={(e) => setFields({ ...fields, aliases: e.target.value })} /></label>
          <label className="cfield"><span>теги, через запятую</span><input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={fields.tags} onChange={(e) => setFields({ ...fields, tags: e.target.value })} /></label>
          <label className="cfield" style={{ gridColumn: "1 / -1" }}>
            <span>текст страницы</span>
            <textarea className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} rows={8} value={fields.body} onChange={(e) => setFields({ ...fields, body: e.target.value })} style={{ resize: "vertical", fontFamily: "var(--font-read)", fontSize: 14 }} />
          </label>
          <div className="row" style={{ gridColumn: "1 / -1" }}>
            <button className="btn primary" type="submit" disabled={busy || !!rename?.error}>сохранить</button>
            <button className="btn ghost" type="button" onClick={() => setCard(false)}>отмена</button>
            <span className="small faint">Пишется прямо в {page.rel}.</span>
          </div>
        </form>
      )}

      {debts.length > 0 && (
        <details className="pdebts" open={open.length > 0}>
          <summary className="small muted">Долги: {open.length} открытых на {fmt(left)} ₸{settled.length ? `, ${settled.length} закрытых` : ""}</summary>
          <table className="tbl" style={{ marginTop: 8 }}>
            <thead><tr><th>с даты</th><th style={{ textAlign: "right" }}>сумма</th><th style={{ textAlign: "right" }}>внесено</th><th style={{ textAlign: "right" }}>остаток</th><th>за что</th><th>статус</th></tr></thead>
            <tbody>
              {[...open, ...settled].map((d, i) => (
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
