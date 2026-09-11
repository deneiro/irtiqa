import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import Markdown from "../components/Markdown";
import { todayStr } from "../lib/dates";
import { inTauri } from "../lib/native";
import { sourceTarget } from "../lib/vault";
import { cancelRun, startRun } from "../lib/claude";
import { useRuns, type OpKind, type Run } from "../lib/claudeRuns";

function dur(r: Run): string {
  const ms = (r.endedAt ?? Date.now()) - r.startedAt;
  return ms < 60000 ? `${Math.round(ms / 1000)} с` : `${Math.floor(ms / 60000)} мин ${Math.round((ms % 60000) / 1000)} с`;
}

export default function ClaudePage() {
  const v = useVault();
  const { root, reload } = useStore();
  const runs = useRuns();
  const today = todayStr();
  const [question, setQuestion] = useState("");
  const [rawPick, setRawPick] = useState("");
  const [follow, setFollow] = useState(true);
  const running = runs.find((r) => r.status === "running");
  const lastAsk = runs.find((r) => r.op === "ask" && r.sessionId && r.status === "done");

  /** Raw files no Resource page cites yet: the ingest queue. */
  const uningested = useMemo(() => {
    const cited = new Set<string>();
    for (const p of v.pages) for (const s of p.sources) { const t = sourceTarget(s); if (t.isRaw) cited.add(t.target.normalize("NFC")); }
    return v.raw.filter((r) => /\.(md|txt|pdf|html?)$/i.test(r.rel) && !cited.has(r.rel.normalize("NFC"))).sort((a, b) => b.mtime - a.mtime);
  }, [v]);

  const go = async (op: OpKind, arg = "") => {
    if (running) return;
    const resume = op === "ask" && follow && lastAsk ? lastAsk.sessionId : undefined;
    await startRun(root, op, arg, today, resume);
  };
  const finished = (r: Run) => r.status !== "running";

  return (
    <div>
      <div className="eyebrow">claude -p в папке vault</div>
      <h1 className="title">Claude</h1>
      <p className="lede">Регламент живёт в CLAUDE.md, приложение только называет операцию. После завершения экраны обновляются сами.</p>
      {!inTauri && <div className="notice" style={{ marginTop: 12 }}>В браузере команды идут через dev-сервер Vite. В окне приложения их запускает Rust.</div>}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row wrap" style={{ gap: 8 }}>
          <select className="text" value={rawPick} onChange={(e) => setRawPick(e.target.value)} style={{ maxWidth: 360 }} disabled={!!running}>
            <option value="">Ingest: выбрать источник ({uningested.length} не разобрано)</option>
            {uningested.map((r) => <option key={r.rel} value={r.rel}>{r.rel.replace(/^raw\//, "")}</option>)}
          </select>
          <button className="btn primary" disabled={!rawPick || !!running} onClick={() => { void go("ingest", rawPick); setRawPick(""); }}>Ingest</button>
          <span className="grow" />
          <button className="btn" disabled={!!running} onClick={() => void go("digest")}>Дайджест недели</button>
          <button className="btn" disabled={!!running} onClick={() => void go("lint")}>Lint</button>
        </div>
        <form className="row" style={{ marginTop: 12, gap: 8, alignItems: "flex-start" }} onSubmit={(e) => { e.preventDefault(); if (question.trim()) { void go("ask", question.trim()); setQuestion(""); } }}>
          <textarea className="text" rows={2} placeholder="Вопрос к vault: что я знаю о…, что источники говорят про…, что делать с…" value={question} onChange={(e) => setQuestion(e.target.value)} style={{ flex: 1, resize: "vertical" }} disabled={!!running}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
          <div className="stack" style={{ gap: 6 }}>
            <button className="btn primary" type="submit" disabled={!question.trim() || !!running}>Спросить</button>
            {lastAsk && <label className="small muted row" style={{ gap: 4 }}><input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> в продолжение</label>}
          </div>
        </form>
        <div className="small faint" style={{ marginTop: 6 }}>⌘↩ отправляет. Правки файлов принимаются автоматически, команды кроме git и чтения запрещены.</div>
      </div>

      {runs.length === 0 && <div className="empty" style={{ marginTop: 16 }}>Запусков ещё не было.</div>}
      {runs.map((r) => (
        <div key={r.id} className={`card run ${r.status}`} style={{ marginTop: 14 }}>
          <div className="row" style={{ gap: 10 }}>
            <span className={`rdot ${r.status}`} />
            <b>{r.title}</b>
            <span className="small muted">{r.op} · {dur(r)}{r.blocks.map((b) => (b.kind === "result" && b.costUsd !== undefined ? ` · $${b.costUsd.toFixed(2)}` : "")).join("")}</span>
            <span className="grow" />
            {r.status === "running" ? <button className="btn small ghost" onClick={() => void cancelRun(r.id)}>остановить</button>
              : <button className="btn small ghost" onClick={() => void reload()} title="перечитать vault">↻</button>}
          </div>
          <details className="small muted" style={{ marginTop: 6 }}><summary style={{ cursor: "pointer" }}>промпт</summary><pre className="prompt">{r.prompt}</pre></details>
          <div className="rblocks">
            {r.blocks.map((b, i) => {
              if (b.kind === "tool") return <div key={i} className="rtool"><span className="mono faint">›</span> {b.name} <span className="mono">{b.detail}</span></div>;
              if (b.kind === "note") return <div key={i} className="rnote">{b.text}</div>;
              if (b.kind === "text") return <div key={i} className="rtext"><Markdown source={b.text} compact /></div>;
              return (
                <div key={i} className={`rresult ${b.isError ? "err" : ""}`}>
                  {b.text ? <Markdown source={b.text} compact /> : <span className="muted">{b.isError ? "ошибка без текста" : "готово"}</span>}
                  {b.isError && /authenticat|OAuth|login/i.test(b.text) && <div className="small" style={{ marginTop: 8 }}>CLI не залогинен. В терминале: <code>claude login</code>, затем повтори запуск.</div>}
                </div>
              );
            })}
            {r.status === "running" && <div className="rnote">работает…</div>}
            {finished(r) && r.status === "error" && !r.blocks.some((b) => b.kind === "result") && <div className="rnote err">завершилось с кодом {r.exitCode}. Если это первый запуск: проверь, что `claude` залогинен в терминале.</div>}
          </div>
        </div>
      ))}
      <div className="small faint" style={{ marginTop: 16 }}>Предложения Claude появляются во входящих на экранах <Link to="/habits">Привычки</Link> и <Link to="/quests">Квесты</Link>; изменения страниц видны в <Link to="/log">Ленте</Link>.</div>
    </div>
  );
}
