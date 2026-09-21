import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore, useVault } from "../store";
import { THEMES, themeColor } from "../lib/themes";
import { useT } from "../lib/i18n";
import { pageUrl } from "../lib/vault";
import { confirmAction } from "../lib/native";
import { deleteFile } from "../lib/fs";
import { todayStr } from "../lib/dates";
import SourceLink from "../components/SourceLink";
import QuestTime from "../components/QuestTime";
import { fmtElapsed } from "../components/QuestRows";
import {
  activationBlocked, questDescription, questJournal, questMinutes, questSteps, questXp, serializeQuest, withQuestDescription, withQuestSteps,
  type Quest, type QuestStatus, type QuestStep,
} from "../lib/life";

const STATUS: { key: QuestStatus; label: string }[] = [
  { key: "active", label: "в работе" },
  { key: "proposed", label: "предложен" },
  { key: "done", label: "сделан" },
  { key: "dropped", label: "брошен" },
];

export default function QuestPage() {
  const { rel = "" } = useParams();
  const target = decodeURIComponent(rel);
  const v = useVault();
  const { life, timer, startTimer, stopTimer, saveText, reload, root, updateToday } = useStore();
  const { themeLabel } = useT();
  const nav = useNavigate();
  const q = life?.quests.find((x) => x.rel === target);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [desc, setDesc] = useState<string | null>(null);
  const [newStep, setNewStep] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [, force] = useState(0);
  useEffect(() => { const id = window.setInterval(() => force((n) => n + 1), 1000); return () => window.clearInterval(id); }, []);

  const projects = useMemo(
    () => [...new Set(v.pages.filter((p) => p.project).map((p) => p.project!))].sort(),
    [v],
  );

  if (!life) return null;
  if (!q) return <div className="empty">Квест не найден. <Link to="/quests">К квестам</Link>.</div>;

  const days = [...life.days.values()];
  const minutes = questMinutes(q.title, days);
  const journal = questJournal(q.body).slice().reverse();
  const running = timer?.quest === q.title;
  const color = themeColor(q.theme);
  const projectPage = q.project ? v.pages.find((p) => p.file === "_Overview" && p.project === q.project) : undefined;

  const write = async (patch: Partial<Quest>) => {
    setBusy(true);
    try { await saveText(q.rel, serializeQuest({ ...q, ...patch })); setErr(null); await reload(); }
    catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const close = async () => {
    if (!(await confirmAction(`Закрыть квест «${q.title}»? Он попадёт в файл сегодняшнего дня.`))) return;
    await write({ status: "done" });
    await updateToday((d) => (d.questsClosed.includes(q.title) ? d : { ...d, questsClosed: [...d.questsClosed, q.title] }));
  };

  const steps = questSteps(q.body);
  const doneSteps = steps.filter((x) => x.done).length;
  const setSteps = (next: QuestStep[]) => write({ body: withQuestSteps(q.body, next) });
  const toggleStep = (i: number) => void setSteps(steps.map((x, j) => (j === i ? { ...x, done: !x.done } : x)));
  const addStep = () => {
    const text = newStep.trim();
    if (!text) return;
    void setSteps([...steps, { done: false, text, detail: "" }]).then(() => setNewStep(""));
  };
  const removeStep = async (i: number) => {
    if (!(await confirmAction(`Убрать шаг «${steps[i].text}»?`))) return;
    await setSteps(steps.filter((_, j) => j !== i));
  };

  const remove = async () => {
    if (!(await confirmAction(`Удалить квест «${q.title}» вместе с журналом сессий?`))) return;
    setBusy(true);
    try { await deleteFile(root, q.rel); await reload(); nav("/quests"); }
    catch (e) { setErr(String(e)); setBusy(false); }
  };

  return (
    <div style={{ ["--c" as string]: color }}>
      <div className="eyebrow">
        <Link to="/quests" className="muted">Квесты</Link>
        {q.theme && <> · <Link to={`/theme/${encodeURIComponent(q.theme)}`} style={{ color }}>{themeLabel(q.theme)}</Link></>}
        {q.project && <> · {projectPage ? <Link to={pageUrl(projectPage)}>{q.project}</Link> : q.project}</>}
      </div>
      <h1 className="title">{q.title}</h1>

      <div className="qhead">
        <button
          className={`btn ${running ? "" : "primary"} big`}
          disabled={!!timer && !running}
          onClick={() => (running ? stopTimer() : startTimer(q.title))}
        >
          {running ? `■ остановить · ${fmtElapsed(Date.now() - timer!.startedAt)}` : "▶ начать сессию"}
        </button>
        {!!timer && !running && <span className="small muted">Сейчас идёт другой таймер: {timer.quest}.</span>}
        <span className="grow" />
        <div className="kpi"><b>{Math.floor(minutes / 60)} ч {minutes % 60} мин</b><span>всего</span></div>
        <div className="kpi"><b>{journal.length}</b><span>сессий</span></div>
        <div className="kpi"><b>+{questXp(minutes)}</b><span>XP</span></div>
      </div>
      {err && <div className="notice err">{err}</div>}

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Что считается сделанным</h3>
          {desc === null ? (
            <>
              <div className="md small" style={{ whiteSpace: "pre-wrap" }}>{questDescription(q.body) || <span className="faint">Критерий не записан.</span>}</div>
              <button className="btn small ghost" style={{ marginTop: 8 }} onClick={() => setDesc(questDescription(q.body))}>править</button>
            </>
          ) : (
            <>
              <textarea className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} style={{ width: "100%", resize: "vertical" }} />
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn primary" disabled={busy} onClick={() => { void write({ body: withQuestDescription(q.body, desc) }).then(() => setDesc(null)); }}>сохранить</button>
                <button className="btn ghost" onClick={() => setDesc(null)}>отмена</button>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <h3>Параметры</h3>
          <div className="qfields">
            <label className="cfield"><span>состояние</span>
              <select className="text" value={q.status} disabled={busy} onChange={(e) => {
                const status = e.target.value as QuestStatus;
                const blocked = status === "active" ? activationBlocked(life.quests, q.title) : null;
                if (blocked) { setErr(blocked); return; }
                void write({ status });
              }}>
                {STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            <label className="cfield"><span>тема</span>
              <select className="text" value={q.theme ?? ""} disabled={busy} onChange={(e) => void write({ theme: e.target.value })}>
                {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
              </select>
            </label>
            <label className="cfield"><span>проект из vault</span>
              <select className="text" value={q.project ?? ""} disabled={busy} onChange={(e) => void write({ project: e.target.value || undefined })}>
                <option value="">без проекта</option>
                {projects.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="cfield"><span>срок</span>
              <input className="text" type="date" value={q.due ?? ""} disabled={busy} onChange={(e) => void write({ due: e.target.value || undefined })} />
            </label>
          </div>
          {q.source && <div className="small muted" style={{ marginTop: 8 }}>откуда взялось: <SourceLink source={q.source} /></div>}
          <div className="row" style={{ marginTop: 12 }}>
            {q.status === "active" && <button className="btn primary" disabled={busy || running} onClick={() => void close()}>закрыть квест</button>}
            <span className="grow" />
            <button className="btn ghost" disabled={busy} style={{ color: "var(--danger)" }} onClick={() => void remove()}>удалить</button>
          </div>
        </div>
      </div>

      {q.status === "active" && <div style={{ marginTop: 16 }}><QuestTime quest={q} /></div>}

      <h2 className="section">Шаги <span className="n">{steps.length ? `${doneSteps} из ${steps.length}` : 0}</span></h2>
      <div className="card">
        {steps.length > 0 && (
          <div className="qprogress" title={`${doneSteps} из ${steps.length}`}><i style={{ width: `${Math.round((doneSteps / steps.length) * 100)}%` }} /></div>
        )}
        {steps.length === 0 && <div className="small muted">Шагов нет. Большой квест удобно разбить на мелкие: каждый шаг — одно действие, которое понятно, как сделать.</div>}
        {steps.map((st, i) => {
          const isNext = !st.done && steps.findIndex((x) => !x.done) === i;
          return (
            <div className={`qstep ${st.done ? "done" : ""} ${isNext ? "next" : ""}`} key={i}>
              <button className="qcheck" disabled={busy} onClick={() => toggleStep(i)} title={st.done ? "вернуть в работу" : "отметить сделанным"}>{st.done ? "✓" : ""}</button>
              <div style={{ minWidth: 0 }}>
                <div className="qstext" onClick={() => st.detail && setOpen(open === i ? null : i)} style={{ cursor: st.detail ? "pointer" : "default" }}>
                  {st.text}{isNext && <span className="qnext">дальше</span>}{st.detail && <span className="faint small"> {open === i ? "▾" : "▸"}</span>}
                </div>
                {st.detail && open === i && <div className="small muted qsdetail">{st.detail}</div>}
              </div>
              <button className="btn small ghost" disabled={busy} onClick={() => void removeStep(i)} title="убрать шаг">×</button>
            </div>
          );
        })}
        <form className="row" style={{ marginTop: 10, gap: 8 }} onSubmit={(e) => { e.preventDefault(); addStep(); }}>
          <input className="text" style={{ flex: 1 }} placeholder="новый шаг: одно действие" value={newStep} onChange={(e) => setNewStep(e.target.value)} disabled={busy} />
          <button className="btn" type="submit" disabled={busy || !newStep.trim()}>добавить</button>
        </form>
      </div>

      <h2 className="section">Журнал <span className="n">{journal.length}</span></h2>
      {journal.length === 0 ? (
        <div className="empty">Сессий пока не было. Нажми «начать сессию»: в конце приложение спросит, что сделано, и запишет это сюда.</div>
      ) : (
        <div className="card">
          {journal.map((e, i) => (
            <div className="qentry" key={i}>
              <span className="mono faint">{e.date === todayStr() ? "сегодня" : e.date}</span>
              <span className="mono">{e.minutes} мин</span>
              <span>{e.note}</span>
            </div>
          ))}
        </div>
      )}
      <div className="small faint" style={{ marginTop: 10 }}>Файл: {q.rel}</div>
    </div>
  );
}
