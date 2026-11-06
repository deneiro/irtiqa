import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import type { Page } from "../lib/types";
import { openExternal } from "../lib/native";
import { todayStr } from "../lib/dates";
import { setFrontmatterKeys } from "../lib/frontmatter";
import { rawPageText } from "../lib/rawpage";
import { categoryOf, closenessOf, contactsOf, daysSinceContact, daysToBirthday, debtsFor, deepLinks, isAuthor, relatedFrom, relationsOf, textOf, type Relation } from "../lib/people";
import { pageUrl } from "../lib/vault";
import { eventUrl, eventsFor } from "../lib/events";
import { debtLeft } from "../lib/life";
import { mediaUrl } from "../lib/native";
import PersonForm, { type PersonFormHandle } from "./PersonForm";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("ru-RU");
}

/**
 * The contact bar of the full person page (`?full=1`, spec v5), and the form
 * for everything Eldar knows about the person (`PersonForm`).
 */
export default function PersonActions({ page }: { page: Page }) {
  const { root, vault, life, saveText, reload } = useStore();
  const today = todayStr();
  const saved = contactsOf(page);
  const [open, setOpen] = useState(false);
  const form = useRef<PersonFormHandle>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const people = useMemo(
    () => (vault?.pages ?? []).filter((p) => p.zone === "person" && p !== page && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p)),
    [vault, page],
  );
  const pageOf = (name: string) => people.find((p) => p.title === name || p.file === name || p.aliases.includes(name));
  const relations = relationsOf(page);
  const backlinks = useMemo(() => relatedFrom(page, vault?.pages ?? []), [page, vault]);

  const links = deepLinks(saved);

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
        <button className={`btn ${open ? "ghost" : "primary"}`} onClick={() => (open ? void form.current?.cancel() : setOpen(true))}>{open ? "закрыть" : "заполнить"}</button>
      </div>

      <PersonFacts page={page} relations={relations} backlinks={backlinks} pageOf={pageOf} />

      {(bday !== undefined || openDebts.length > 0) && (
        <div className="row wrap small" style={{ marginTop: 10, gap: 14 }}>
          {bday !== undefined && <span className={bday <= 7 ? "hl" : "muted"}>🎂 {bday === 0 ? "день рождения сегодня" : `день рождения через ${bday} дн.`} ({saved.birthday})</span>}
          {left > 0 && <Link to="/finance" className={openDebts[0]?.direction === "я должен" ? "muted" : ""}>{openDebts[0]?.direction}: <b>{fmt(left)} ₸</b> в {openDebts.length} {openDebts.length === 1 ? "долге" : "долгах"}</Link>}
        </div>
      )}

      {open && <PersonForm ref={form} page={page} onClose={() => setOpen(false)} />}

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
