import { type ReactNode, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { todayStr } from "../lib/dates";
import { setFrontmatterKeys } from "../lib/frontmatter";
import { rawPageText } from "../lib/rawpage";
import { NAMES_PAGE, dayOf, parseNames, suraPatch, suras, withNameState, type MemoState } from "../lib/quran";

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
  const { saveText, reload } = useStore();
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
        <Link to={pageUrl(page)} className="small muted" style={{ textTransform: "none", letterSpacing: 0 }}>вся страница</Link>
      </h2>
      <div className="card">
        <Progress done={done.length} learning={learning.length} total={99} />
        {learning.length > 0 && (
          <div className="inwork">
            {learning.map((x) => {
              const d = dayOf(x.learning!, today);
              return (
                <button key={x.n} className={`chip learning ${d >= 3 ? "ripe" : ""}`} onClick={() => setSel(x.n)} title={d >= 3 ? "пора отметить выученным" : ""}>
                  {x.translit} <span className="mono faint">{d}-й день</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="namegrid">
          {names.map((x) => (
            <button key={x.n} className={`nameitem ${x.state} ${sel === x.n ? "sel" : ""}`} onClick={() => setSel(sel === x.n ? null : x.n)}>
              <span className="mono faint">{x.n}</span>
              <span className="tr">{x.translit}</span>
              <span className="mean">{x.meaning}</span>
            </button>
          ))}
        </div>
        {cur ? (
          <div className="memo-panel">
            <div>
              <span className="ar big">{cur.arabic}</span>
              <b style={{ marginLeft: 10 }}>{cur.translit}</b>
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

/** The halal/haram reference, surfaced as a card rather than buried in Wiki. */
export function HalalSection() {
  const v = useVault();
  const page = useMemo(() => v.pages.find((p) => p.file === "Халяль и харам"), [v]);
  if (!page) return null;
  const heads = page.body.split(/\r?\n/).filter((l) => l.startsWith("## ")).map((l) => l.slice(3));
  return (
    <section className="tblock">
      <h2 className="section">Халяль и харам</h2>
      <Link to={pageUrl(page)} className="card profile-card">
        <b>Ханафитский мазхаб: что дозволено, что запрещено, что спорно</b>
        <span className="small muted">{heads.join(" · ")}</span>
        <span className="small faint">Конспект, не фетва. Спорное помечено «уточнить у алима».</span>
      </Link>
    </section>
  );
}
