import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { todayStr } from "../lib/dates";
import { setFrontmatterKeys } from "../lib/frontmatter";
import { rawPageText } from "../lib/rawpage";
import { NAMES_PAGE, parseNames, suras, withNameLearned } from "../lib/quran";

/** 114 suras with what is memorised, and the text one click away. */
export function QuranSection() {
  const v = useVault();
  const { saveText, reload } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const list = useMemo(() => suras(v), [v]);
  const done = list.filter((s) => s.memorized);
  const today = todayStr();

  const toggle = async (n: number) => {
    const s = list.find((x) => x.n === n);
    if (!s || busy) return;
    setBusy(true);
    try {
      const raw = rawPageText(v, s.page.rel);
      if (raw === null) throw new Error("не нашёл текст страницы");
      await saveText(s.page.rel, setFrontmatterKeys(raw, { memorized: s.memorized ? null : today }));
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  if (!list.length) return null;
  const pct = Math.round((100 * done.length) / 114);
  return (
    <section className="tblock">
      <h2 className="section">Коран <span className="n">{done.length} из 114 выучено</span></h2>
      <div className="card">
        <div className="progress"><i style={{ width: `${pct}%` }} /></div>
        <div className="small muted" style={{ marginTop: 6 }}>
          {done.length === 0 ? "Ни одна сура пока не отмечена." : `${pct}% Корана по числу сур. Последняя отмеченная: ${done[done.length - 1].name}.`}
          {" "}Клик по номеру открывает суру, галочка отмечает выученной.
        </div>
        {err && <div className="small err-text">{err}</div>}
        <div className="suragrid">
          {list.map((s) => (
            <div key={s.n} className={`sura ${s.memorized ? "done" : ""}`} title={`${s.name} · ${s.ayahs} аятов · ${s.revelation}${s.memorized ? ` · выучена ${s.memorized}` : ""}`}>
              <Link to={pageUrl(s.page)} className="num">{s.n}</Link>
              <button className="tick" disabled={busy} onClick={() => void toggle(s.n)}>{s.memorized ? "✓" : ""}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The 99 names, with the same one-tap memorisation. */
export function NamesSection() {
  const v = useVault();
  const { saveText, reload } = useStore();
  const [busy, setBusy] = useState(false);
  const page = useMemo(() => v.pages.find((p) => p.file === NAMES_PAGE), [v]);
  const raw = page ? rawPageText(v, page.rel) : null;
  const names = useMemo(() => (raw ? parseNames(raw) : []), [raw]);
  const today = todayStr();
  if (!page || !names.length) return null;
  const done = names.filter((n) => n.learned);
  const pct = Math.round((100 * done.length) / 99);

  const toggle = async (n: number) => {
    if (!raw || busy) return;
    setBusy(true);
    try {
      const cur = names.find((x) => x.n === n);
      await saveText(page.rel, withNameLearned(raw, n, cur?.learned ? undefined : today));
      await reload();
    } finally { setBusy(false); }
  };

  return (
    <section className="tblock">
      <h2 className="section">99 имён Аллаха <span className="n">{done.length} из 99 выучено</span> <Link to={pageUrl(page)} className="small muted" style={{ textTransform: "none", letterSpacing: 0 }}>открыть страницу</Link></h2>
      <div className="card">
        <div className="progress"><i style={{ width: `${pct}%` }} /></div>
        <div className="namegrid">
          {names.map((x) => (
            <button key={x.n} className={`nameitem ${x.learned ? "done" : ""}`} disabled={busy} title={`${x.arabic} · ${x.meaning}${x.learned ? ` · выучено ${x.learned}` : ""}`} onClick={() => void toggle(x.n)}>
              <span className="mono faint">{x.n}</span>
              <span className="tr">{x.translit}</span>
              <span className="mean">{x.meaning}</span>
            </button>
          ))}
        </div>
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
