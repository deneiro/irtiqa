import { type ReactNode, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { Block } from "../pages/main/Scene";
import { Err } from "./SectionBits";

const LABEL: Record<MemoState, string> = { none: "не начато", learning: "учу", done: "выучено" };

/** Head of a memorisation block: one bar in two tones and what each tone counts. */
function Progress({ done, learning, total }: { done: number; learning: number; total: number }) {
  return (
    <div className="g-memo-bar">
      <i><u className="done" style={{ width: `${(100 * done) / total}%` }} /><u className="learning" style={{ width: `${(100 * learning) / total}%` }} /></i>
      <div><span className="done">выучено {done}</span><span className="learning">учу {learning}</span><span>осталось {total - done - learning}</span></div>
    </div>
  );
}

/** The card of what is picked in the grid: what it is on the left, the buttons that change its state on the right. */
function Picked({ state, busy, set, before, children }: { state: MemoState; busy: boolean; set: (s: MemoState) => void; before?: ReactNode; children: ReactNode }) {
  return (
    <div className={`g-picked ${state}`}>
      <div>{children}</div>
      <div className="acts">
        {before}
        <button type="button" className={`g-btn${state === "learning" ? " on" : " sun"}`} disabled={busy} onClick={() => set(state === "learning" ? "none" : "learning")}>
          {state === "learning" ? "не учу" : "беру учить"}
        </button>
        <button type="button" className={`g-btn${state === "done" ? " on" : " sage"}`} disabled={busy} onClick={() => set(state === "done" ? "none" : "done")}>
          {state === "done" ? "снять «выучено»" : "выучил"}
        </button>
      </div>
    </div>
  );
}

/**
 * 114 suras: what is memorised, what is in work, and the text one click away. Rebuilt 2026-11-21: the bar, the suras
 * in work as chips, the grid of 114 numbers in three states, and the card of the picked one with its buttons.
 */
export function QuranSection() {
  const v = useVault();
  const { saveText, reload, life } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const list = useMemo(() => suras(v), [v]);
  const today = todayStr();
  if (!list.length) return <div className="g-play"><Block title="Коран"><p className="g-faint">Страниц сур в vault нет.</p></Block></div>;

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
    <div className="g-play">
      <Block title="114 сур" right="нажми на номер — откроются название, разбор и отметки">
        <Progress done={done.length} learning={learning.length} total={114} />
        {learning.length > 0 && (
          <div className="g-inwork">
            <span>в работе</span>
            {learning.map((s) => <button type="button" key={s.n} onClick={() => setSel(s.n)}>{s.n}. {s.name}<em>{dayOf(s.learning!, today)}-й день</em></button>)}
          </div>
        )}
        {cur && (
          <Picked state={cur.state} busy={busy} set={(s) => void set(cur.n, s)} before={<Link className="g-more" to={pageUrl(cur.page)}>читать →</Link>}>
            <b>{cur.n}. {cur.name}</b>
            <small>
              {cur.ayahs} аятов · {cur.revelation} · {LABEL[cur.state]}
              {cur.state === "learning" && ` ${dayOf(cur.learning!, today)}-й день`}
              {cur.state === "done" && cur.memorized ? ` ${cur.memorized}` : ""}
            </small>
          </Picked>
        )}
        <div className="g-suras">
          {list.map((s) => (
            <button
              type="button" key={s.n} className={`${s.state}${sel === s.n ? " sel" : ""}`}
              title={`${s.name} · ${s.ayahs} аятов · ${s.revelation} · ${LABEL[s.state]}`}
              onClick={() => setSel(sel === s.n ? null : s.n)}
            >
              {s.n}
            </button>
          ))}
        </div>
        <p className="g-cap">«Беру учить» заводит привычку дня с этой сурой; «выучил» и «не учу» убирают её в архив.</p>
        <Err text={err} />
      </Block>
    </div>
  );
}

/** A name written as `[[Страница]]` in the table links to its own page (spec v4 «99 имён»); the cell shows the plain name. */
const nameLink = (translit: string) => translit.match(/^\[\[([^\]|#]+)\]\]$/)?.[1].trim();
const plainName = (translit: string) => nameLink(translit) ?? translit;

/**
 * The 99 names: pick one, live with it two or three days, mark it learned. Rebuilt 2026-11-21: the same bar, the
 * names in work as chips (ripe from the third day), ninety-nine small cards, and the picked one with its Arabic large.
 */
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
  if (!page || !names.length) return <div className="g-play"><Block title="99 имён"><p className="g-faint">Страницы «{NAMES_PAGE}» с таблицей имён нет.</p></Block></div>;

  const done = names.filter((n) => n.state === "done");
  const learning = names.filter((n) => n.state === "learning");
  const cur = sel !== null ? names.find((x) => x.n === sel) : undefined;
  const curPage = cur && nameLink(cur.translit) ? v.resolve(nameLink(cur.translit)!) : undefined;

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
    <div className="g-play">
      <Block title="99 имён Аллаха" right={<>на одно имя — два-три дня<Link className="g-more" to={pageUrl(page)}>вся страница →</Link></>}>
        <Progress done={done.length} learning={learning.length} total={99} />
        {learning.length > 0 && (
          <div className="g-inwork">
            <span>в работе</span>
            {learning.map((x) => {
              const d = dayOf(x.learning!, today);
              return <button type="button" key={x.n} className={d >= 3 ? "ripe" : ""} onClick={() => setSel(x.n)} title={d >= 3 ? "пора отметить выученным" : ""}>{plainName(x.translit)}<em>{d}-й день</em></button>;
            })}
          </div>
        )}
        {cur && (
          <Picked state={cur.state} busy={busy} set={(s) => void set(cur.n, s)} before={curPage ? <Link className="g-more" to={pageUrl(curPage)}>страница имени →</Link> : undefined}>
            <span className="ar">{cur.arabic}</span>
            <b>{plainName(cur.translit)}</b>
            <small>
              {cur.meaning} · {LABEL[cur.state]}
              {cur.state === "learning" && ` ${dayOf(cur.learning!, today)}-й день`}
              {cur.state === "done" && cur.learned ? ` ${cur.learned}` : ""}
            </small>
          </Picked>
        )}
        <div className="g-names">
          {names.map((x) => (
            <button type="button" key={x.n} className={`${x.state}${sel === x.n ? " sel" : ""}`} onClick={() => setSel(sel === x.n ? null : x.n)}>
              <i>{x.n}</i><b>{plainName(x.translit)}</b><span>{x.meaning}</span>
            </button>
          ))}
        </div>
        <Err text={err} />
      </Block>
    </div>
  );
}

/** Past these lengths the title or the description is cut to three lines (each clamped on its own); a click opens the rest. */
const HALAL_LONG = { title: 80, text: 100 };
const HALAL_TONE: Record<string, string> = { halal: "sage", haram: "ember", makruh: "honey" };

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
  if (!page || !groups.length) return <div className="g-play"><Block title="Халяль · Харам · Макрух"><p className="g-faint">Страницы «{HALAL_PAGE}» с разделами Халяль, Харам, Макрух нет.</p></Block></div>;
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <div className="g-play">
      <p className="g-quote g-hl-lead">Конспект, не фетва: свой случай — с имамом.</p>
      {groups.map((g) => (
        <Block key={g.kind} className={`g-hl ${HALAL_TONE[g.kind] ?? ""}`} title={g.heading} right={`${g.cards.length}`}>
          <div className="g-hl-cards">
            {g.cards.map((c, i) => {
              const id = `${g.kind}-${i}`;
              const long = c.title.length > HALAL_LONG.title || (c.text?.length ?? 0) > HALAL_LONG.text;
              const isOpen = open.has(id);
              const cls = `${long ? "long" : ""}${isOpen ? " open" : ""}`;
              const body = <><b><Inline md={c.title} /></b>{c.text && <span><Inline md={c.text} /></span>}{long && <em>{isOpen ? "свернуть" : "ещё"}</em>}</>;
              return long
                ? <div key={id} className={cls} role="button" tabIndex={0} aria-expanded={isOpen} onClick={() => toggle(id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(id); } }}>{body}</div>
                : <div key={id}>{body}</div>;
            })}
          </div>
        </Block>
      ))}
    </div>
  );
}
