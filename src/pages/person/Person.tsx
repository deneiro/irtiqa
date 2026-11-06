import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../../store";
import { themeColor, themeRu } from "../../lib/themes";
import { useDayToday } from "../../lib/useDayToday";
import { pageUrl } from "../../lib/vault";
import { mediaUrl, openExternal } from "../../lib/native";
import { rawPageText } from "../../lib/rawpage";
import { contactEdits } from "../../lib/contact";
import { coMet, eventsWith, type HabitCount } from "../../lib/circle";
import type { Cell } from "../../lib/dashboard";
import { fmt } from "../../lib/dashboard";
import { eventUrl } from "../../lib/events";
import { debtLeft, type Life } from "../../lib/life";
import { categoryOf, closenessOf, contactsOf, debtsFor, deepLinks, relatedFrom, relationsOf, textOf } from "../../lib/people";
import {
  RADICALS, countWords, influenceCount, meetingsFoot, memoriesOf, personNumbers, personView, radicalsDiff, radicalsOf, shortWhen,
  type Half, type Influence, type PersonTile, type PersonView, type RadicalsView,
} from "../../lib/person";
import { peopleOf } from "../../lib/themeNumbers";
import type { ColumnPart } from "../../lib/overview";
import type { Page, Vault } from "../../lib/types";
import PersonForm, { type PersonFormHandle } from "../../components/PersonForm";
import { Inline, glowOf } from "../theme/parts";
import MetSheet from "./MetSheet";
import AddPersonSheet from "./AddPersonSheet";
import "./Person.css";

/** The person's theme colour and its glows, as the theme pages set --th and --glow. */
function themeStyle(theme: string | undefined): Record<string, string> {
  const c = themeColor(theme);
  return { "--th": c, "--glow": glowOf(c, 0.09), "--glow-2": glowOf(c, 0.4), "--tint": glowOf(c, 0.15) };
}

/** Ten segments, as many lit as his 1–10; without closeness a dashed ring. Inside, the first letter of the file name. */
function Ring({ n, letter }: { n: number | undefined; letter: string }) {
  const c = 42, r = 39;
  const pt = (a: number) => [c + r * Math.cos((a * Math.PI) / 180), c + r * Math.sin((a * Math.PI) / 180)].map((x) => x.toFixed(2));
  return (
    <div className={`p-ava${n === undefined ? " p-ava-none" : ""}`} role="img" aria-label={n === undefined ? "Близость не оценена" : `Близость ${n} из 10`}>
      {n !== undefined && (
        <svg viewBox="0 0 84 84" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => {
            const [x0, y0] = pt(-90 + i * 36 + 4), [x1, y1] = pt(-90 + (i + 1) * 36 - 4);
            return <path key={i} className={i < n ? "p-lit" : "p-trk"} d={`M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`} />;
          })}
        </svg>
      )}
      <b>{letter}</b>
    </div>
  );
}

function Tile({ t, onClick, open }: { t: PersonTile; onClick?: () => void; open?: boolean }) {
  const body = (
    <>
      <span className="p-nt-k"><span className="p-label">{t.label}</span>{t.hint && <span className="p-hint">{t.hint}</span>}</span>
      <span className="p-nt-v">{t.value}{t.unit && <small>{t.unit}</small>}</span>
      {t.second && <span className="p-nt-v p-nt-v2">{t.second.value}<small>{t.second.unit} · {t.second.hint}</small></span>}
      {t.line && <span className="p-nt-s">{t.tone ? <span className={`p-st p-${t.tone}`}>{t.line}</span> : t.line}</span>}
      {t.note && <span className="p-nt-c">{t.note}</span>}
    </>
  );
  const cls = `p-nt${t.value === "—" ? " p-nt-none" : ""}`;
  return onClick
    ? <button type="button" className={cls} aria-expanded={open} title={open ? "скрыть записи долга" : "показать записи долга"} onClick={onClick}>{body}</button>
    : <div className={cls}>{body}</div>;
}

/** The rows of `debts.md` that name the person, as the full page has them. */
function DebtTable({ page, life }: { page: Page; life: Life }) {
  const debts = debtsFor(page, life.debts);
  const open = debts.filter((d) => !d.closed && debtLeft(d) > 0), closed = debts.filter((d) => d.closed);
  return (
    <section className="p-card p-debts">
      <h2><span>Долги</span><span className="p-r">открытых {open.length}{closed.length ? ` · закрытых ${closed.length}` : ""}</span></h2>
      <div className="p-scroll">
        <table className="p-tbl">
          <thead><tr><th>с даты</th><th className="p-num">сумма</th><th className="p-num">внесено</th><th className="p-num">остаток</th><th>за что</th><th>статус</th></tr></thead>
          <tbody>
            {[...open, ...closed].map((d, i) => (
              <tr key={i} className={d.closed ? "p-closed" : ""}>
                <td className="p-num" style={{ textAlign: "left" }}>{d.since}</td>
                <td className="p-num">{fmt(d.amount)}</td>
                <td className="p-num">{d.paid ? fmt(d.paid) : ""}</td>
                <td className="p-num">{d.closed ? "" : fmt(debtLeft(d))}</td>
                <td>{d.note}</td>
                <td>{d.closed ? `закрыт ${d.closed}` : d.direction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-foot">Вносить оплату — на экране <Link to="/finance">Финансы</Link>: сумма ложится на самые старые долги.</div>
    </section>
  );
}

function Step({ kind, title, part }: { kind: "past" | "now" | "next"; title: string; part: ColumnPart }) {
  return (
    <div className={`p-step p-${kind}`}>
      <h3>{title}</h3>
      <ul>
        {part.items.length
          ? part.items.map((it, j) => <li key={j}><Inline md={it.md} />{it.note && <span className="p-w">{it.note}</span>}</li>)
          : <li className="p-dash">—</li>}
      </ul>
      {part.caption && <div className="p-src"><Inline md={part.caption} /></div>}
    </div>
  );
}

/** A card of the page: a mono title, a pale right side, the body. */
function Card({ title, right, className, children }: { title: ReactNode; right?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`p-card${className ? ` ${className}` : ""}`}>
      <h2><span>{title}</span>{right && <span className="p-r">{right}</span>}</h2>
      {children}
    </section>
  );
}

const BEAD: Record<Cell, string> = { done: "h", late: "h", held: "h", failed: "f", fall: "f", unmarked: "u", pending: "u", nofile: "n", skip: "s", future: "s" };

function beadWord(c: Cell, bad: boolean): string {
  const k = BEAD[c];
  if (k === "f") return bad ? "срыв" : "не сделал";
  if (k === "h") return bad ? "держался" : "сделал";
  if (k === "u") return "без отметки";
  if (k === "n") return "нет файла дня";
  return "пропуск";
}

/** The habits a half links to: a row a habit, a bead a meeting, the words of the count. */
function Proof({ rows, today, none }: { rows: HabitCount[]; today: string; none?: boolean }) {
  if (!rows.length && !none) return null;
  const bad = rows.every((r) => r.habit.kind === "bad");
  return (
    <div className="p-proof">
      <span className="p-label">В дни встреч · 90 дней</span>
      {!rows.length && <p className="p-nothing">триггерных привычек нет — считать нечего</p>}
      {rows.map((r) => {
        const w = countWords(r);
        return (
          <div key={r.habit.rel} className="p-prow">
            <b>{r.habit.title}</b>
            <span className="p-mbs">{r.beads.map((b) => <i key={b.date} className={`p-mb p-mb-${BEAD[b.cell]}`} title={`${shortWhen(b.date, today)} — ${beadWord(b.cell, r.habit.kind === "bad")}`} />)}</span>
            <span className="p-prow-t">{w.together} <span className="p-x">· {w.apart}</span></span>
          </div>
        );
      })}
      {rows.length > 0 && (
        <div className="p-legend">
          <span><i className="p-mb p-mb-f" />{bad ? "срыв" : "срыв · не сделал"}</span>
          <span><i className="p-mb p-mb-h" />{bad ? "держался" : "держался · сделал"}</span>
          <span><i className="p-mb p-mb-u" />без отметки</span>
          <span><i className="p-mb p-mb-n" />нет файла дня</span>
        </div>
      )}
    </div>
  );
}

function HalfView({ kind, half, rows, today, none }: { kind: "up" | "down"; half: Half | undefined; rows: HabitCount[]; today: string; none?: boolean }) {
  return (
    <div className={`p-half p-${kind}`}>
      <h3><span className="p-ar">{kind === "up" ? "↑" : "↓"}</span>{kind === "up" ? "Тянет вверх" : "Тянет вниз"}</h3>
      {half?.pills.length
        ? <div className="p-pills">{half.pills.map((p, i) => <span key={i} className="p-pill">{p.target ? p.label : <Inline md={p.md} />}{p.note && <small>{p.note}</small>}</span>)}</div>
        : <p className="p-nothing">—</p>}
      {half?.note && <p className="p-said"><Inline md={half.note} /></p>}
      <Proof rows={rows} today={today} none={none} />
    </div>
  );
}

function InfluenceCard({ inf, page, people, life, today }: { inf: Influence; page: Page; people: Page[]; life: Life; today: string }) {
  const c = useMemo(() => influenceCount(inf, page, people, life, today), [inf, page, people, life, today]);
  const counted = c.up.length + c.down.length > 0;
  return (
    <Card title="Влияние" right={inf.note && <Inline md={inf.note} />}>
      {inf.verdict && <p className="p-verdict"><Inline md={inf.verdict} /><small>твой ответ: тянет вверх или вниз</small></p>}
      <div className="p-infl">
        <HalfView kind="up" half={inf.up} rows={c.up} today={today} />
        <HalfView kind="down" half={inf.down} rows={c.down} today={today} none={!counted} />
      </div>
      {counted && <div className="p-foot">{meetingsFoot(c.meetings, c.withFile, today)}</div>}
    </Card>
  );
}

function CharacterCard({ view }: { view: NonNullable<PersonView["character"]> }) {
  return (
    <Card title="Характер" right={view.note && <Inline md={view.note} />}>
      {view.five.length > 0 && <div className="p-five">{view.five.map((w, i) => <span key={i}><Inline md={w} /></span>)}</div>}
      {view.traits.length > 0 && (
        <dl className="p-kv">
          {view.traits.map((t, i) => t.label
            ? [<dt key={`t${i}`}><Inline md={t.label} /></dt>, <dd key={`d${i}`}><Inline md={t.text} /></dd>]
            : <dd key={`d${i}`} className="p-kv-whole"><Inline md={t.text} /></dd>)}
        </dl>
      )}
    </Card>
  );
}

function RadicalsCard({ r, formula }: { r: RadicalsView; formula: number[] }) {
  const diff = radicalsDiff(r);
  return (
    <Card title="Радикалы · твоё мнение" right="меняешь только ты" className="p-rcard">
      <div className="p-rads">
        {RADICALS.map((x, i) => {
          const on = r.lit.includes(i), rd = r.reading.includes(i);
          const tip = `R${i + 1} ${x.name}${on ? " — твоё мнение" : ""}${rd ? (on ? ", и в разборе" : " — только в разборе") : ""}`;
          return (
            <div key={x.name} className={`p-seat${on ? " p-on" : ""}${rd ? " p-rd" : ""}`} title={tip}>
              <small>R{i + 1}</small><i /><b>{x.name}</b><span>{x.word}</span>
            </div>
          );
        })}
      </div>
      <div className="p-rad-f">
        {r.his.length ? r.his.join(" · ") : "твоего мнения нет"}
        {diff && <>{" — "}<span className={diff.same ? "p-faint" : "p-diff"}>{diff.text}</span></>}
      </div>
      {r.reading.length
        ? <div className="p-legend p-rleg"><span><i className="p-his" />твоё мнение</span><span><i className="p-rd-i" />разбор по опроснику — формула {formula.join(", ")}</span></div>
        : <div className="p-foot">слово под радикалом — из методики Пономаренко, не о человеке</div>}
    </Card>
  );
}

function ProsCard({ view }: { view: NonNullable<PersonView["pros"]> }) {
  const list = (items: { md: string; note?: string }[]) => (items.length
    ? items.map((it, i) => <li key={i}><Inline md={it.md} />{it.note && <span className="p-w">{it.note}</span>}</li>)
    : <li className="p-dash">—</li>);
  return (
    <Card title="Плюсы и минусы" right={view.note && <Inline md={view.note} />}>
      <div className="p-pm">
        <div className="p-pros"><h3>Плюсы</h3><ul>{list(view.plus)}</ul></div>
        <div className="p-cons"><h3>Минусы</h3><ul>{list(view.minus)}</ul></div>
      </div>
    </Card>
  );
}

const LINK = /^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\\?\|([^\]]+))?\]\]$/;

/** A name of «Круг»: a link to a person page is a chip that opens it, anything else a dashed chip. */
function Who({ raw, vault, extra }: { raw: string; vault: Vault; extra?: string }) {
  const m = raw.match(LINK);
  const label = m ? (m[2] ?? m[1]).trim() : raw;
  const page = m ? vault.resolve(m[1]) : undefined;
  const tail = extra ? <small>{extra}</small> : null;
  return page ? <Link className="p-chip" to={pageUrl(page)}>{label}{tail}</Link> : <span className="p-chip p-chip-plain">{label}{tail}</span>;
}

function CircleCard({ page, view, people, vault, life }: { page: Page; view: PersonView; people: Page[]; vault: Vault; life: Life }) {
  const rows: { label: string; chips: ReactNode[] }[] = [];
  const related = relationsOf(page);
  if (related.length) rows.push({ label: "связанные", chips: related.map((r, i) => <Who key={i} raw={vault.resolve(r.name) ? `[[${r.name}]]` : r.name} vault={vault} extra={r.role || undefined} />) });
  for (const line of view.circle) rows.push({ label: line.label, chips: line.people.map((raw, i) => <Who key={i} raw={raw} vault={vault} />) });
  const often = coMet(page, people, life.events).slice(0, 5);
  if (often.length) rows.push({ label: "чаще всех рядом", chips: often.map((c) => <Who key={c.name} raw={c.page ? `[[${c.page.file}]]` : c.name} vault={vault} extra={String(c.n)} />) });
  const named = relatedFrom(page, vault.pages);
  if (named.length) rows.push({ label: "называют", chips: named.map((b) => <Who key={b.page.rel} raw={`[[${b.page.file}]]`} vault={vault} extra={b.role || undefined} />) });
  if (!rows.length) return null;
  return (
    <Card title="Круг">
      {rows.map((r, i) => <div key={i} className="p-crow"><span className="p-label">{r.label}</span><div className="p-chips">{r.chips}</div></div>)}
      {often.length > 0 && <div className="p-foot">число у имени в «чаще всех рядом» — сколько было общих событий</div>}
    </Card>
  );
}

/** «Пока не известно»: a line for each organ the page does not hold yet, the questionnaire, and Claude. */
function UnknownCard({ missing, page, vault, today }: { missing: [string, string][]; page: Page; vault: Vault; today: string }) {
  const questionnaire = vault.pages.find((p) => p.theme === "Social & friends" && p.type === "template" && p.segments.length === 1);
  return (
    <Card title="Пока не известно" right={page.created ? `страница с ${shortWhen(page.created, today)}` : undefined}>
      {missing.map(([what, why]) => <div key={what} className="p-erow"><b>{what}</b><span>{why}</span></div>)}
      <div className="p-cta">
        {questionnaire && <Link className="p-btn" to={pageUrl(questionnaire)}>Опросник о человеке →</Link>}
        <span className="p-faint">или расскажи Claude — он запишет твоими словами</span>
      </div>
    </Card>
  );
}

/**
 * The person page (spec v5, 2026-11-06): the head with the closeness ring and the four buttons of input,
 * four numbers, «Было · Сейчас · Дальше», the influence counted on the days of the meetings, the character,
 * his reading of the radicals, the pluses and minuses, the memories and the circle. What shows is what the
 * page in the vault holds; the whole page as it was is `?full=1`.
 */
export default function PersonPage({ page }: { page: Page }) {
  const vault = useVault();
  const { root, life, saveText, reload } = useStore();
  const today = useDayToday();
  const [editing, setEditing] = useState(false);
  const form = useRef<PersonFormHandle>(null);
  const [debtsOpen, setDebtsOpen] = useState(false);
  const [meeting, setMeeting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const people = useMemo(() => peopleOf(vault), [vault]);
  const view = useMemo(() => personView(page.body), [page]);
  const numbers = useMemo(() => (life ? personNumbers(page, people, life, today) : undefined), [page, people, life, today]);
  const style = themeStyle(page.theme);
  if (!life || !numbers) return <div className="p-page" style={style}><p className="p-faint">Загружаю vault…</p></div>;

  const contacts = contactsOf(page);
  const links = deepLinks(contacts);
  const close = closenessOf(page);
  const category = categoryOf(page);
  const how = textOf(page, "how_we_met").split(" — ")[0].trim();
  const connection = textOf(page, "connection");
  const metToday = eventsWith(page, people, life.events).some((e) => e.date === today);
  const wroteToday = contacts.last_contact === today && !metToday;
  const memories = memoriesOf(page, people, life.events, today);
  const radicals = radicalsOf(page, view.formula);
  const hasRadicals = radicals.his.length > 0 || radicals.reading.length > 0;
  const hasDebts = debtsFor(page, life.debts).length > 0;
  const birthday = numbers.birthday.hint;
  const missing: [string, string][] = [
    ...(view.influence ? [] : [["Влияние", "не записано"] as [string, string]]),
    ...(view.character ? [] : [["Характер", "не записан"] as [string, string]]),
    ...(hasRadicals ? [] : [["Радикалы", "твоего мнения нет"] as [string, string]]),
    ...(view.pros ? [] : [["Плюсы и минусы", "не записаны"] as [string, string]]),
  ];

  /** «Написал» and the first half of «Виделись»: `last_contact` is today, as the circle writes it. */
  const wrote = async () => {
    const raw = rawPageText(vault, page.rel);
    if (raw === null) throw new Error("не нашёл страницу человека");
    for (const e of contactEdits({ rel: page.rel, file: page.file, raw }, life.events, today, false)) await saveText(e.rel, e.content);
  };
  const run = async (what: () => Promise<void>) => {
    setBusy(true);
    try { await what(); setErr(null); await reload(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="p-page" style={style}>
      <div className="p-top">
        <Link className="p-crumb" to="/people">← Люди</Link>
        <button className="p-btn" type="button" onClick={() => setAdding(true)}><span className="p-plus">+</span>Добавить человека</button>
      </div>
      <header className="p-head">
        <Ring n={close} letter={[...page.file][0]?.toUpperCase() ?? ""} />
        <div>
          <div className="p-kick">
            {themeRu(page.theme)}{category && ` · ${category}`}
            <span>{category ? "" : " · кем приходится — не отмечено"}{close ? ` · близость ${close}` : ""}</span>
          </div>
          <h1 className="p-h1">{page.title}</h1>
          <div className="p-sub">
            {connection && <span>{connection}</span>}
            {how && how !== "—" && <span>{how}</span>}
            {birthday && <span className="p-bd">ДР {birthday}</span>}
          </div>
        </div>
        <Link className="p-whole" to={`${pageUrl(page)}?full=1`}>страница целиком{page.updated ? ` · ${shortWhen(page.updated, today)}` : ""}</Link>
      </header>

      <div className="p-acts">
        <button className={`p-btn p-primary${metToday ? " p-done" : ""}`} type="button" disabled={busy}
          onClick={() => void run(async () => { await wrote(); setMeeting(true); })}>{metToday ? "✓ Виделись сегодня" : "Виделись"}</button>
        <button className={`p-btn${wroteToday ? " p-done" : ""}`} type="button" disabled={busy} onClick={() => void run(wrote)}>{wroteToday ? "✓ Написал сегодня" : "Написал"}</button>
        <span className="p-sep" />
        {links.length
          ? links.map((l) => <button key={l.key} className="p-btn p-ghost" type="button" title={l.url} onClick={() => void openExternal(l.url)}>{l.label}</button>)
          : <span className="p-none">контактов нет — добавь в «изменить», и появятся кнопки чата</span>}
        <span className="p-grow" />
        <button className="p-btn p-ghost" type="button" onClick={() => (editing ? void form.current?.cancel() : setEditing(true))}>{editing ? "закрыть" : "изменить"}</button>
      </div>
      {err && <p className="p-err">{err}</p>}
      {editing && <div className="p-form"><PersonForm ref={form} page={page} onClose={() => setEditing(false)} /></div>}

      <div className="p-ntiles">
        <Tile t={numbers.contact} />
        <Tile t={numbers.together} />
        <Tile t={numbers.debt} onClick={hasDebts ? () => setDebtsOpen((o) => !o) : undefined} open={debtsOpen} />
        <Tile t={numbers.birthday} />
      </div>
      {debtsOpen && hasDebts && <DebtTable page={page} life={life} />}

      <div className="p-ascent">
        <Step kind="past" title="Было" part={view.past} />
        <Step kind="now" title="Сейчас" part={view.now} />
        <Step kind="next" title="Дальше" part={view.next} />
      </div>

      <div className="p-organs">
        {view.influence && <InfluenceCard inf={view.influence} page={page} people={people} life={life} today={today} />}
        {view.character && hasRadicals ? (
          <div className="p-two"><CharacterCard view={view.character} /><RadicalsCard r={radicals} formula={view.formula} /></div>
        ) : (
          <>
            {view.character && <CharacterCard view={view.character} />}
            {hasRadicals && <RadicalsCard r={radicals} formula={view.formula} />}
          </>
        )}
        {view.pros && <ProsCard view={view.pros} />}
        {missing.length > 0 && <UnknownCard missing={missing} page={page} vault={vault} today={today} />}
        <Card title={<>Вместе · {memories.length}</>} right="«Виделись» спросит, создать ли воспоминание">
          {memories.length ? (
            <div className="p-evs">
              {memories.map((e) => (
                <Link key={e.rel} className={`p-ev${e.rel === fresh ? " p-new" : ""}`} to={eventUrl(e)}>
                  <span className="p-ph">{e.photos[0] ? <img src={mediaUrl(root, e.photos[0])} alt="" loading="lazy" /> : "без фото"}</span>
                  <b>{e.title}</b>
                  <span className="p-ev-d">{shortWhen(e.date, today)}{e.place ? ` · ${e.place}` : ""}</span>
                </Link>
              ))}
            </div>
          ) : <p className="p-ev-empty">Общих воспоминаний нет.</p>}
        </Card>
        <CircleCard page={page} view={view} people={people} vault={vault} life={life} />
      </div>

      <MetSheet open={meeting} page={page} people={people} today={today} onClose={() => setMeeting(false)} onSaved={setFresh} />
      <AddPersonSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
