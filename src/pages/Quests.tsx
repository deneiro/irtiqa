import { useMemo, useState } from "react";
import { useStore } from "../store";
import { confirmAction } from "../lib/native";
import { THEMES } from "../lib/themes";
import { useT } from "../lib/i18n";
import { todayStr } from "../lib/dates";
import { QUEST_DIR, questDescription, questMinutes, questSteps, questXp, safeFilename, serializeQuest, type Quest, type QuestStatus } from "../lib/life";
import QuestRows from "../components/QuestRows";
import SourceLink from "../components/SourceLink";

interface Form { title: string; theme: string; due: string; project: string; source: string; body: string }
const EMPTY: Form = { title: "", theme: THEMES[6].name, due: "", project: "", source: "", body: "" };

export default function QuestsPage() {
  const { vault, life, saveText, reload, updateToday, timer } = useStore();
  const { themeLabel } = useT();
  const today = todayStr();
  const [form, setForm] = useState<Form>(EMPTY);
  const [err, setErr] = useState<string | null>(null);
  const [manual, setManual] = useState<{ quest: string; minutes: string }>({ quest: "", minutes: "" });
  const [showDropped, setShowDropped] = useState(false);

  const quests = life?.quests ?? [];
  const days = life ? [...life.days.values()] : [];
  const groups = useMemo(() => ({
    proposed: quests.filter((q) => q.status === "proposed"),
    active: quests.filter((q) => q.status === "active"),
    done: quests.filter((q) => q.status === "done").slice().reverse(),
    dropped: quests.filter((q) => q.status === "dropped"),
  }), [quests]);
  const projects = useMemo(() => [...new Set((vault?.pages ?? []).map((p) => p.project).filter((x): x is string => !!x))].sort(), [vault]);

  const write = async (q: Quest, patch: Partial<Quest>) => {
    try { await saveText(q.rel, serializeQuest({ ...q, ...patch })); setErr(null); await reload(); } catch (e) { setErr(String(e)); }
  };
  const setStatus = (q: Quest, status: QuestStatus) => void write(q, { status });

  const closeQuest = async (q: Quest) => {
    if (!(await confirmAction(`Закрыть квест «${q.title}»? Он попадёт в файл сегодняшнего дня.`))) return;
    try {
      await saveText(q.rel, serializeQuest({ ...q, status: "done" }));
      await updateToday((d) => (d.questsClosed.includes(q.title) ? d : { ...d, questsClosed: [...d.questsClosed, q.title] }));
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); }
  };

  const submit = async () => {
    const title = form.title.trim();
    if (!title || !safeFilename(title)) return;
    if (quests.some((q) => q.title === title)) { setErr("Такой квест уже есть."); return; }
    try {
      await saveText(`${QUEST_DIR}/${safeFilename(title)}.md`, serializeQuest({
        title, theme: form.theme, status: "active", created: today, due: form.due || undefined,
        project: form.project || undefined, source: form.source.trim() || undefined, body: form.body,
      }));
      setForm(EMPTY);
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); }
  };

  const addManual = async () => {
    const minutes = Number(manual.minutes);
    if (!manual.quest || !Number.isFinite(minutes) || minutes <= 0) return;
    try {
      await updateToday((d) => ({ ...d, sessions: [...d.sessions, { quest: manual.quest, minutes: Math.round(minutes) }] }));
      setManual({ quest: manual.quest, minutes: "" });
      setErr(null);
    } catch (e) { setErr(String(e)); }
  };

  if (!life) return null;
  return (
    <div>
      <div className="eyebrow">life/quests</div>
      <h1 className="title">Квесты</h1>
      <p className="lede">
        {groups.active.length} активных · {groups.done.length} сделано · {groups.proposed.length} предложено из vault
        {timer && <> · <span className="hl">идёт таймер: {timer.quest}</span></>}
      </p>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Новый квест</h3>
        <form className="qform" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="text" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
            {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
          </select>
          <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} title="срок" />
          <select className="text" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}>
            <option value="">без проекта</option>
            {projects.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Откуда взялось: страница vault, [[IrtiQa StartUp/_Overview]]" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Что считается сделанным — критерий закрытия (необязательно)" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <div className="row"><button className="btn primary" type="submit">+ добавить</button></div>
        </form>
        {err && <div className="small" style={{ color: "var(--danger)", marginTop: 6 }}>{err}</div>}
      </div>

      {groups.proposed.length > 0 && (
        <>
          <h2 className="section">Предложено из vault <span className="n">{groups.proposed.length}</span></h2>
          <div className="card inbox">
            {groups.proposed.map((q) => (
              <div className="hrow" key={q.rel}>
                <div style={{ minWidth: 0 }}>
                  <div className="name">{q.title}</div>
                  <div className="sub">{q.theme ? themeLabel(q.theme) : "без темы"}{q.project ? ` · ${q.project}` : ""}{q.source ? <> · <SourceLink source={q.source} /></> : null}</div>
                  {questDescription(q.body) && <div className="small muted" style={{ marginTop: 4 }}>{questDescription(q.body)}</div>}
                  {questSteps(q.body).length > 0 && <div className="small faint" style={{ marginTop: 4 }}>шагов внутри: {questSteps(q.body).length}</div>}
                </div>
                <span />
                <span />
                <div className="hactions">
                  <button className="btn small primary" onClick={() => setStatus(q, "active")}>принять</button>
                  <button className="btn small ghost" onClick={() => setStatus(q, "dropped")}>отклонить</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section">Активные <span className="n">{groups.active.length}</span></h2>
      <div className="card">
        <QuestRows quests={groups.active} onClose={(q) => void closeQuest(q)} />
        {groups.active.length > 0 && (
          <form className="addrow manual" onSubmit={(e) => { e.preventDefault(); void addManual(); }}>
            <select className="text" value={manual.quest} onChange={(e) => setManual({ ...manual, quest: e.target.value })}>
              <option value="">добавить время вручную…</option>
              {groups.active.map((q) => <option key={q.rel} value={q.title}>{q.title}</option>)}
            </select>
            <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="минут" value={manual.minutes} onChange={(e) => setManual({ ...manual, minutes: e.target.value })} />
            <button className="btn" type="submit">+</button>
          </form>
        )}
        <div className="small faint" style={{ marginTop: 8 }}>Сессии короче 15 минут не считаются. Квест платит 20 XP плюс 55 за каждый час.</div>
      </div>

      {groups.done.length > 0 && (
        <>
          <h2 className="section">Сделано <span className="n">{groups.done.length}</span></h2>
          <div className="card">
            {groups.done.map((q) => {
              const m = questMinutes(q.title, days);
              return (
                <div className="hrow" key={q.rel}>
                  <div style={{ minWidth: 0 }}><div className="name">{q.title}</div><div className="sub">{q.theme ? themeLabel(q.theme) : ""}{q.project ? ` · ${q.project}` : ""}</div></div>
                  <span />
                  <div className="hstats"><span>{m} мин</span><span className="faint">+{questXp(m)} XP</span></div>
                  <div className="hactions"><button className="btn small ghost" onClick={() => setStatus(q, "active")}>вернуть</button></div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {groups.dropped.length > 0 && (
        <>
          <h2 className="section">
            <button className="tab" style={{ padding: 0, margin: 0, border: "none" }} onClick={() => setShowDropped(!showDropped)}>Отброшены {showDropped ? "▾" : "▸"}</button>
            <span className="n">{groups.dropped.length}</span>
          </h2>
          {showDropped && <div className="card">{groups.dropped.map((q) => (
            <div className="hrow" key={q.rel}><div><div className="name">{q.title}</div></div><span /><span /><div className="hactions"><button className="btn small ghost" onClick={() => setStatus(q, "active")}>вернуть</button></div></div>
          ))}</div>}
        </>
      )}
    </div>
  );
}
