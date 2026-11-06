import { type ReactNode, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { todayStr } from "../lib/dates";
import { dayToday } from "../lib/maghrib";
import { setFrontmatterKeys } from "../lib/frontmatter";
import { rawPageText } from "../lib/rawpage";
import { NAMES_PAGE, dayOf, isSuraHabit, parseNames, suraHabitTitle, suraPatch, suras, withNameState, type MemoState } from "../lib/quran";
import { HABIT_DIR, safeFilename, serializeHabit } from "../lib/life";
import { HALAL_PAGE, halalGroups } from "../lib/themePages";
import { Inline } from "../pages/theme/parts";

const LABEL: Record<MemoState, string> = { none: "не начато", learning: "учу", done: "выучено" };

/** Head of a memorisation block: the counters and the bar. */
function Progress({ done, learning, total }: { done: number; learning: number; total: number }) {
  return (
    <>
      <div className="progress">
        <i className="done" style={{ width: `${(100 * done) / total}%` }} />
        <i className="learning" style={{ width: `${(100 * learning) / total}%` }} />
      </div>
      <div className="legend small">
        <span className="lg done">выучено {done}</span>
        <span className="lg learning">учу {learning}</span>
        <span className="lg none">осталось {total - done - learning}</span>
      </div>
    </>
  );
}

/** The three buttons that change a state, plus what is open right now. */
function Actions({ state, busy, set, before }: { state: MemoState; busy: boolean; set: (s: MemoState) => void; before?: ReactNode }) {
  return (
    <div className="memo-actions">
      {before}
      <button className={`btn small ${state === "learning" ? "on" : ""}`} disabled={busy} onClick={() => set(state === "learning" ? "none" : "learning")}>
        {state === "learning" ? "не учу" : "беру учить"}
      </button>
      <button className={`btn small ${state === "done" ? "on" : ""}`} disabled={busy} onClick={() => set(state === "done" ? "none" : "done")}>
        {state === "done" ? "снять «выучено»" : "выучил"}
      </button>
    </div>
  );
}

/** 114 suras: what is memorised, what is in work, and the text one click away. */
export function QuranSection() {
  const v = useVault();
  const { saveText, reload, life } = useStore();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const list = useMemo(() => suras(v), [v]);
  const today = todayStr();
  if (!list.length) return null;

  const done = list.filter((s) => s.state === "done");
  const learning = list.filter((s) => s.state === "learning");
  const cur = sel !== null ? list.find((s) => s.n === sel) : undefined;

  const set = async (n: number, state: MemoState) => {
    const s = list.find((x) => x.n === n);
    if (!s || busy) return;
    setBusy(true);
    try {
      const raw = rawPageText(v, s.page.rel);
      if (raw === null) throw new Error("не нашёл текст страницы суры");
      await saveText(s.page.rel, setFrontmatterKeys(raw, suraPatch(state, today)));
      // The sura in work is also a habit of the day; learned or dropped, it goes to the archive.
      const habit = life?.habits.find((h) => isSuraHabit(h.title, n));
      if (state === "learning") {
        if (!habit) {
          const title = suraHabitTitle(s);
          await saveText(`${HABIT_DIR}/${safeFilename(title)}.md`, serializeHabit({
            title, theme: "Spirituality & Religion", kind: "good", freq: "daily", status: "active", created: dayToday(),
            source: `[[${s.page.file}]]`, body: `Сура ${s.n}, ${s.ayahs} аятов. Взята учить ${today}.`,
          }));
        } else if (habit.status !== "active") await saveText(habit.rel, serializeHabit({ ...habit, status: "active" }));
      } else if (habit && habit.status === "active") await saveText(habit.rel, serializeHabit({ ...habit, status: "archived" }));
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  return (
    <section className="tblock">
      <h2 className="section">Коран <span className="n">{done.length} из 114</span></h2>
      <div className="card">
        <Progress done={done.length} learning={learning.length} total={114} />
        {learning.length > 0 && (
          <div className="inwork">
            {learning.map((s) => (
              <button key={s.n} className="chip learning" onClick={() => setSel(s.n)}>
                {s.n}. {s.name} <span className="mono faint">{dayOf(s.learning!, today)}-й день</span>
              </button>
            ))}
          </div>
        )}
        <div className="suragrid">
          {list.map((s) => (
            <button
              key={s.n}
              className={`sura ${s.state} ${sel === s.n ? "sel" : ""}`}
              title={`${s.name} · ${s.ayahs} аятов · ${s.revelation} · ${LABEL[s.state]}`}
              onClick={() => setSel(sel === s.n ? null : s.n)}
            >
              {s.n}
            </button>
          ))}
        </div>
        {cur ? (
          <div className="memo-panel">
            <div>
              <b>{cur.n}. {cur.name}</b>
              <div className="small faint">
                {cur.ayahs} аятов · {cur.revelation}
                {cur.state === "learning" && ` · учу ${dayOf(cur.learning!, today)}-й день`}
                {cur.state === "done" && ` · выучена ${cur.memorized}`}
              </div>
            </div>
            <Actions
              state={cur.state}
              busy={busy}
              set={(s) => void set(cur.n, s)}
              before={<button className="btn small" onClick={() => nav(pageUrl(cur.page))}>читать</button>}
            />
          </div>
        ) : (
          <div className="small faint memo-hint">Нажми на номер суры — откроются её название, разбор и отметки.</div>
        )}
        {err && <div className="small err-text">{err}</div>}
      </div>
    </section>
  );
}

/** A name written as `[[Страница]]` in the table links to its own page (spec v4 «99 имён»); the cell shows the plain name. */
const nameLink = (translit: string) => translit.match(/^\[\[([^\]|#]+)\]\]$/)?.[1].trim();
const plainName = (translit: string) => nameLink(translit) ?? translit;

/** The 99 names: pick one, live with it two or three days, mark it learned. */
export function NamesSection() {
  const v = useVault();
  const { saveText, reload } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const page = useMemo(() => v.pages.find((p) => p.file === NAMES_PAGE), [v]);
  const raw = page ? rawPageText(v, page.rel) : null;
  const names = useMemo(() => (raw ? parseNames(raw) : []), [raw]);
  const today = todayStr();
  if (!page || !names.length) return null;

  const done = names.filter((n) => n.state === "done");
  const learning = names.filter((n) => n.state === "learning");
  const cur = sel !== null ? names.find((x) => x.n === sel) : undefined;

  const set = async (n: number, state: MemoState) => {
    if (!raw || busy) return;
    setBusy(true);
    try {
      await saveText(page.rel, withNameState(raw, n, state, today));
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  return (
    <section className="tblock">
      <h2 className="section">
        99 имён Аллаха <span className="n">{done.length} из 99</span>
        <Link to={pageUrl(page)} className="small muted">вся страница</Link>
      </h2>
      <div className="card">
        <Progress done={done.length} learning={learning.length} total={99} />
        {learning.length > 0 && (
          <div className="inwork">
            {learning.map((x) => {
              const d = dayOf(x.learning!, today);
              return (
                <button key={x.n} className={`chip learning ${d >= 3 ? "ripe" : ""}`} onClick={() => setSel(x.n)} title={d >= 3 ? "пора отметить выученным" : ""}>
                  {plainName(x.translit)} <span className="mono faint">{d}-й день</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="namegrid">
          {names.map((x) => (
            <button key={x.n} className={`nameitem ${x.state} ${sel === x.n ? "sel" : ""}`} onClick={() => setSel(sel === x.n ? null : x.n)}>
              <span className="mono faint">{x.n}</span>
              <span className="tr">{plainName(x.translit)}</span>
              <span className="mean">{x.meaning}</span>
            </button>
          ))}
        </div>
        {cur ? (
          <div className="memo-panel">
            <div>
              <span className="ar big">{cur.arabic}</span>
              {(() => {
                const to = nameLink(cur.translit);
                const page = to ? v.resolve(to) : undefined;
                return page ? <Link to={pageUrl(page)} style={{ marginLeft: 10, fontWeight: 600 }}>{plainName(cur.translit)} →</Link> : <b style={{ marginLeft: 10 }}>{plainName(cur.translit)}</b>;
              })()}
              <div className="small faint">
                {cur.meaning}
                {cur.state === "learning" && ` · учу ${dayOf(cur.learning!, today)}-й день`}
                {cur.state === "done" && ` · выучено ${cur.learned}`}
              </div>
            </div>
            <Actions state={cur.state} busy={busy} set={(s) => void set(cur.n, s)} />
          </div>
        ) : (
          <div className="small faint memo-hint">Нажми на имя — увидишь его по-арабски и сможешь взять в работу. Обычный срок на одно имя — два-три дня.</div>
        )}
        {err && <div className="small err-text">{err}</div>}
      </div>
    </section>
  );
}

/** Past these lengths the title or the description is cut to three lines (each clamped on its own); a click opens the rest. */
const HALAL_LONG = { title: 80, text: 100 };

/**
 * Халяль · Харам · Макрух (Eldar, 2026-11-06: «каждый пункт… название, заголовок, и потом описание… источники не
 * нужны»): three groups, each with its colour, a card a bullet — the title and the description, never the source
 * (`halalGroups`). A long card opens in place on a click; nothing leaves the screen.
 */
export function HalalSection() {
  const v = useVault();
  const page = useMemo(() => v.pages.find((p) => p.file === HALAL_PAGE), [v]);
  const groups = useMemo(() => (page ? halalGroups(page.body) : []), [page]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  if (!page || !groups.length) return <div className="empty">Страницы «{HALAL_PAGE}» с разделами Халяль, Харам, Макрух нет.</div>;
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <section className="tblock t-hl">
      <h2 className="section">Халяль · Харам · Макрух</h2>
      <p className="t-hl-lead">Конспект, не фетва: свой случай — с имамом.</p>
      {groups.map((g) => (
        <div key={g.kind} className={`t-hl-group t-hl-${g.kind}`}>
          <h3><i />{g.heading}<span className="n">{g.cards.length}</span></h3>
          <div className="t-hl-grid">
            {g.cards.map((c, i) => {
              const id = `${g.kind}-${i}`;
              const long = c.title.length > HALAL_LONG.title || (c.text?.length ?? 0) > HALAL_LONG.text;
              const isOpen = open.has(id);
              const cls = `t-hl-card${long ? " t-hl-long" : ""}${isOpen ? " t-hl-open" : ""}`;
              const body = <><b><Inline md={c.title} /></b>{c.text && <span><Inline md={c.text} /></span>}{long && <em>{isOpen ? "свернуть" : "ещё"}</em>}</>;
              return long
                ? <div key={id} className={cls} role="button" tabIndex={0} aria-expanded={isOpen} onClick={() => toggle(id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(id); } }}>{body}</div>
                : <div key={id} className={cls}>{body}</div>;
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
