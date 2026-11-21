import { useNavigate } from "react-router-dom";
import { BANNER } from "../assets/play";
import { Block, SceneFrame, SceneNumber, SceneTitle, SideCard } from "./main/Scene";
import { actStatus } from "./main/parts";
import { activityView, actName, plainStep, questUrl } from "../lib/dashboard";
import { fmtElapsed } from "../components/QuestRows";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useMemo, useState } from "react";
import { useStore } from "../store";
import { THEMES, themeColor } from "../lib/themes";
import { useT } from "../lib/i18n";
import { todayStr } from "../lib/dates";
import { QUEST_DIR, questDescription, questMinutes, questSteps, questXp, safeFilename, serializeQuest, stepTally, type Quest, type QuestStatus } from "../lib/life";
import SourceLink from "../components/SourceLink";

interface Form { title: string; theme: string; due: string; project: string; source: string; body: string }
const EMPTY: Form = { title: "", theme: THEMES[6].name, due: "", project: "", source: "", body: "" };

export default function QuestsPage() {
  const { vault, life, saveText, reload, updateToday, timer, startTimer, stopTimer } = useStore();
  const [, tick] = useState(0);
  useEffect(() => { if (!timer) return; const id = window.setInterval(() => tick((n) => n + 1), 1000); return () => window.clearInterval(id); }, [timer]);
  const nav = useNavigate();
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
    passive: quests.filter((q) => q.status === "passive" || q.status === "paused"),
    active: quests.filter((q) => q.status === "active"),
    done: quests.filter((q) => q.status === "done").slice().reverse(),
    dropped: quests.filter((q) => q.status === "dropped"),
  }), [quests]);
  const projects = useMemo(() => [...new Set((vault?.pages ?? []).map((p) => p.project).filter((x): x is string => !!x))].sort(), [vault]);

  const write = async (q: Quest, patch: Partial<Quest>) => {
    try { await saveText(q.rel, serializeQuest({ ...q, ...patch })); setErr(null); await reload(); } catch (e) { setErr(String(e)); }
  };
  const setStatus = (q: Quest, status: QuestStatus) => {
    void write(q, { status });
  };

  // Closing asks for the outcome, which lives on the quest's own page.
  const closeQuest = (q: Quest) => nav(`/quest/${encodeURIComponent(q.rel)}?close=done`);

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
  const views = new Map(quests.map((q) => [q.rel, activityView(q, life.days, today)]));
  const moving = groups.active.filter((q) => views.get(q.rel)?.state === "moving").length;

  /** One activity as a card: its step now, how it moves, the timer, and where it can go. */
  const card = (q: Quest, move: { label: string; to: QuestStatus }) => {
    const a = views.get(q.rel)!;
    const running = timer?.quest === q.title;
    const minutes = questMinutes(q.title, days);
    const tally = stepTally(questSteps(q.body));
    const { name, sub } = actName(q);
    const step = a.now ? plainStep(a.now) : "";
    return (
      <div key={q.rel} className={`g-acard${running ? " running" : ""}`} style={{ ["--c" as string]: themeColor(q.theme) }}>
        <div className="hd"><Link to={questUrl(q.rel)}><b>{name}</b>{sub && <span> · {sub}</span>}</Link>{actStatus(a)}</div>
        <small>{q.theme ? themeLabel(q.theme) : "без темы"} · {q.cadence ?? "без ритма"}{q.due ? ` · до ${q.due}` : ""}{q.source ? <> · <SourceLink source={q.source} /></> : null}</small>
        {step && <p><em>сейчас</em>{step}</p>}
        {tally.total > 0 && <div className="pr"><span className="g-bar"><i style={{ width: `${(tally.done / tally.total) * 100}%`, background: themeColor(q.theme) }} /></span><span>шаги {tally.done} / {tally.total}</span></div>}
        <div className="ft">
          <button className="tm" type="button" disabled={!!timer && !running} title={running ? "остановить и записать время" : "запустить таймер"} onClick={() => (running ? stopTimer() : startTimer(q.title))}>{running ? `■ ${fmtElapsed(Date.now() - timer!.startedAt)}` : "▶ начать"}</button>
          <span>{minutes} мин · +{questXp(minutes)} XP · за 7 дней: {a.week}</span>
          <span className="acts"><button type="button" disabled={running} onClick={() => setStatus(q, move.to)}>{move.label}</button><button type="button" disabled={running} onClick={() => closeQuest(q)}>закрыть</button></span>
        </div>
      </div>
    );
  };

  return (
    <div className="g-page">
      <div className="g-play">
        <div className="g-top">
          <SceneFrame art={BANNER.quests}>
            <SceneTitle kicker={`деятельности · ${groups.active.length} в работе · ${groups.passive.length} в фоне · ${groups.done.length} сделано`} title="Деятельности" />
            <div className="g-xp8">
              {timer ? <span>идёт таймер: <b>{timer.quest}</b> · {fmtElapsed(Date.now() - timer.startedAt)}</span> : <span>таймер не идёт</span>}
              <span>сессии от 15 минут · 20 XP и 55 за час</span>
            </div>
            <SceneNumber value={moving} unit={` / ${groups.active.length}`} label="движутся" sub="были записи за последние дни" />
          </SceneFrame>
          <SideCard kicker="новая деятельность">
            <form className="g-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
              <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <div className="two">
                <select className="text" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
                  {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
                </select>
                <input className="text" type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} title="срок" />
              </div>
              <select className="text" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}>
                <option value="">без проекта</option>
                {projects.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Откуда взялось: [[страница]]" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Что считается сделанным" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              <div className="g-line"><button type="submit">Добавить</button></div>
            </form>
            {err && <p className="g-error" role="alert">{err}</p>}
          </SideCard>
        </div>

        <Block title={`В работе · ${groups.active.length}`} right="карточка открывает страницу деятельности">
          {groups.active.length ? <div className="g-acards">{groups.active.map((q) => card(q, { label: "в фон", to: "passive" }))}</div> : <p className="g-faint">Ничего в работе. Заведи деятельность в карточке справа от картины, пусть маленькую.</p>}
        </Block>

        {groups.passive.length > 0 && <Block title={`В фоне · ${groups.passive.length}`} right="идёт по расписанию или ждёт своего часа"><div className="g-acards">{groups.passive.map((q) => card(q, { label: "в работу", to: "active" }))}</div></Block>}

        {groups.active.length > 0 && (
          <Block title="Время вручную" right="если таймер не запускал">
            <form className="g-manual" onSubmit={(e) => { e.preventDefault(); void addManual(); }}>
              <select className="text" value={manual.quest} onChange={(e) => setManual({ ...manual, quest: e.target.value })}>
                <option value="">деятельность…</option>
                {groups.active.map((q) => <option key={q.rel} value={q.title}>{q.title}</option>)}
              </select>
              <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="минут" value={manual.minutes} onChange={(e) => setManual({ ...manual, minutes: e.target.value })} />
              <div className="g-line"><button type="submit">Записать</button></div>
            </form>
          </Block>
        )}

        {groups.proposed.length > 0 && (
          <Block title={`Предложено из vault · ${groups.proposed.length}`}>
            {groups.proposed.map((q) => (
              <div className="g-rowx" key={q.rel}>
                <div><b>{q.title}</b><small>{q.theme ? themeLabel(q.theme) : "без темы"}{q.project ? ` · ${q.project}` : ""}{stepTally(questSteps(q.body)).total > 0 && ` · шагов ${stepTally(questSteps(q.body)).total}`}</small>{questDescription(q.body) && <p>{questDescription(q.body)}</p>}</div>
                <span className="acts"><button onClick={() => setStatus(q, "active")}>принять</button><button onClick={() => setStatus(q, "passive")}>в фон</button><button onClick={() => setStatus(q, "dropped")}>отклонить</button></span>
              </div>
            ))}
          </Block>
        )}

        {groups.done.length > 0 && (
          <Block title={`Сделано · ${groups.done.length}`}>
            {groups.done.map((q) => { const m = questMinutes(q.title, days); return (
              <div className="g-rowx" key={q.rel}>
                <div><Link to={questUrl(q.rel)}><b>{q.title}</b></Link><small>{q.theme ? themeLabel(q.theme) : ""}{q.project ? ` · ${q.project}` : ""} · {m} мин · +{questXp(m)} XP</small></div>
                <span className="acts"><button onClick={() => setStatus(q, "active")}>вернуть</button></span>
              </div>
            ); })}
          </Block>
        )}

        {groups.dropped.length > 0 && (
          <Block title={`Отброшены · ${groups.dropped.length}`} right={<button className="g-link" onClick={() => setShowDropped(!showDropped)}>{showDropped ? "свернуть" : "показать"}</button>}>
            {showDropped ? groups.dropped.map((q) => <div className="g-rowx" key={q.rel}><div><b>{q.title}</b></div><span className="acts"><button onClick={() => setStatus(q, "active")}>вернуть</button></span></div>) : <p className="g-faint">То, что решено не делать.</p>}
          </Block>
        )}
      </div>
    </div>
  );
}
