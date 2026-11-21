import { useMemo, useState } from "react";
import { BANNER } from "../assets/play";
import { FlameIcon } from "../components/GameBits";
import { Block, SceneFrame, SceneNumber, SceneTitle, SideCard } from "./main/Scene";
import { useDayEdit } from "./main/Play";
import { askOf } from "../lib/game";
import { PRAYER_ORDER, cell, type Cell } from "../lib/dashboard";
import { withMark, type DayMark } from "../lib/life";
import { useStore } from "../store";
import { THEMES, themeColor } from "../lib/themes";
import { useT } from "../lib/i18n";
import { WEEKDAYS_RU, addDays } from "../lib/dates";
import { HABIT_DIR, HABIT_TIMES, byHabitTime, habitTimeLabel, type HabitTime, bestStreak, habitDue, habitRate, markOf, safeFilename, serializeHabit, streak, type Habit, type HabitKind, type HabitStatus } from "../lib/life";
import { Link } from "react-router-dom";
import SourceLink from "../components/SourceLink";
import { confirmAction } from "../lib/native";
import { deleteFile } from "../lib/fs";
import { useDayToday } from "../lib/useDayToday";

const ORDER: (typeof WEEKDAYS_RU)[number][] = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

function freqLabel(f: string | string[]): string {
  if (Array.isArray(f)) return f.join(", ");
  return f === "weekly" ? "раз в неделю" : "ежедневно";
}

interface Form { title: string; theme: string; kind: HabitKind; time: HabitTime | ""; days: string[]; body: string; source: string }
const EMPTY: Form = { title: "", theme: THEMES[2].name, kind: "good", time: "", days: [...ORDER], body: "", source: "" };

function formFreq(days: string[]): string | string[] {
  return days.length === 7 ? "daily" : ORDER.filter((d) => days.includes(d));
}
function freqDays(f: string | string[]): string[] {
  return Array.isArray(f) ? f : f === "daily" ? [...ORDER] : [];
}

export default function HabitsPage() {
  const { root, life, saveText, reload } = useStore();
  const { themeLabel } = useT();
  const today = useDayToday();
  const [form, setForm] = useState<Form>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null); // rel
  const [err, setErr] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const habits = life?.habits ?? [];
  const lifeOrEmpty = useMemo(() => life ?? ({ days: new Map(), habits: [] } as unknown as NonNullable<typeof life>), [life]);
  const { day, edit, error: dayErr } = useDayEdit(lifeOrEmpty, today);
  const daysNow = useMemo(() => new Map(lifeOrEmpty.days).set(today, day), [lifeOrEmpty, today, day]);
  const groups = useMemo(() => ({
    proposed: habits.filter((h) => h.status === "proposed"),
    active: habits.filter((h) => h.status === "active"),
    paused: habits.filter((h) => h.status === "paused"),
    archived: habits.filter((h) => h.status === "archived"),
  }), [habits]);

  const write = async (h: Habit, patch: Partial<Habit>) => {
    const next = { ...h, ...patch };
    try {
      await saveText(next.rel, serializeHabit(next));
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); }
  };
  const setStatus = (h: Habit, status: HabitStatus) => void write(h, { status });

  const submit = async () => {
    const title = form.title.trim();
    if (!title || !safeFilename(title)) return;
    if (!form.days.length) { setErr("Выбери хотя бы один день."); return; }
    if (editing) {
      const h = habits.find((x) => x.rel === editing);
      if (h) await write(h, { theme: form.theme, kind: form.kind, time: form.time || undefined, freq: formFreq(form.days), body: form.body, source: form.source.trim() || undefined });
      setEditing(null);
      setForm(EMPTY);
      return;
    }
    if (habits.some((h) => h.title === title)) { setErr("Такая привычка уже есть."); return; }
    try {
      await saveText(`${HABIT_DIR}/${safeFilename(title)}.md`, serializeHabit({ title, theme: form.theme, kind: form.kind, time: form.time || undefined, freq: formFreq(form.days), status: "active", created: today, source: form.source.trim() || undefined, body: form.body }));
      setForm(EMPTY);
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); }
  };

  /** A habit written by mistake should leave, not sit in the archive forever. */
  const remove = async (h: Habit) => {
    const marks = [...(life?.days.values() ?? [])].filter((d) =>
      [...d.habitsDone, ...d.habitsFailed, ...d.habitsSkipped].includes(h.title)).length;
    const tail = marks ? ` Отметки за ${marks} дн. останутся в файлах дней как история.` : "";
    if (!(await confirmAction(`Удалить привычку «${h.title}» насовсем?${tail}`))) return;
    try { await deleteFile(root, h.rel); await reload(); } catch (e) { setErr(String(e)); }
  };

  const startEdit = (h: Habit) => {
    setEditing(h.rel);
    setForm({ title: h.title, theme: h.theme ?? THEMES[2].name, kind: h.kind, time: h.time ?? "", days: freqDays(h.freq), body: h.body, source: h.source ?? "" });
    document.querySelector(".main")?.scrollTo(0, 0);
  };

  const BEAD: Record<Cell, string> = { done: "h", late: "l", held: "h", failed: "f", fall: "f", unmarked: "u", pending: "u", nofile: "n", skip: "s", future: "s" };
  const last30 = useMemo(() => Array.from({ length: 30 }, (_, i) => addDays(today, -(29 - i))), [today]);
  const cycle = (h: Habit) => {
    const order: (DayMark | undefined)[] = h.kind === "prayer" ? [undefined, "done", "late", "failed"] : [undefined, "done", "failed"];
    edit((d) => withMark(d, h.title, order[(order.indexOf(markOf(d, h.title)) + 1) % order.length]));
  };

  /** One habit as a card: the tap that marks today, thirty days as beads, the run, and what can be done with it. */
  const habitCard = (h: Habit) => {
    const live = h.status === "active";
    const m = live ? markOf(day, h.title) : undefined;
    const s = streak(h, daysNow, today);
    const rate = habitRate(h, daysNow, today);
    const bad = h.kind === "bad";
    const state = m === "done" ? (bad ? "чисто" : h.kind === "prayer" ? "вовремя" : "сделал") : m === "failed" ? (bad ? "срыв" : h.kind === "prayer" ? "пропустил" : "не сделал") : m === "late" ? "поздно" : "";
    const dueToday = live && habitDue(h, today);
    return (
      <div key={h.rel} className={`g-hcard ${m ?? "none"}${live ? "" : " idle"}`} style={{ ["--c" as string]: themeColor(h.theme) }}>
        <button className="hit" type="button" disabled={!dueToday} onClick={() => cycle(h)} aria-label={`${h.title}: ${state || (dueToday ? "не отмечено" : "сегодня не спрашивается")}`}>
          <span className="ico">{askOf(h).icon ?? h.title.slice(0, 1)}</span>
          <b>{h.title}</b>
          <small>{state || (dueToday ? (bad ? "нажми — чисто" : "нажми — сделал") : live ? "сегодня не спрашивается" : h.status === "paused" ? "на паузе" : h.status === "proposed" ? "предложена" : "в архиве")}</small>
        </button>
        {live && <div className="beads" title="30 дней, слева старые">{last30.map((d) => <i key={d} className={BEAD[cell(life!, h, d, today)]} />)}</div>}
        <div className="meta">
          {live && <em className={s > 0 ? "on" : ""}><FlameIcon />{s}</em>}
          {live && <span>макс {bestStreak(h, daysNow)}</span>}
          {live && <span>{rate.due ? `${Math.round((100 * rate.done) / rate.due)} %` : "—"} за 30 дн</span>}
          <span>{h.theme ? themeLabel(h.theme) : "без темы"} · {habitTimeLabel(h.time)} · {freqLabel(h.freq)}</span>
          {h.source && <span><SourceLink source={h.source} /></span>}
        </div>
        {h.body.trim() && <p>{h.body.trim()}</p>}
        <div className="acts">
          {h.status === "proposed" && <><button onClick={() => setStatus(h, "active")}>принять</button><button onClick={() => setStatus(h, "archived")}>отклонить</button></>}
          {h.status === "active" && <><button onClick={() => startEdit(h)}>править</button><button onClick={() => setStatus(h, "paused")}>пауза</button><button onClick={() => setStatus(h, "archived")}>в архив</button></>}
          {h.status === "paused" && <><button onClick={() => setStatus(h, "active")}>вернуть</button><button onClick={() => setStatus(h, "archived")}>в архив</button></>}
          {h.status === "archived" && <button onClick={() => setStatus(h, "active")}>вернуть</button>}
          <button title="удалить насовсем" onClick={() => void remove(h)}>удалить</button>
        </div>
      </div>
    );
  };

  if (!life) return null;
  const active = [...groups.active].sort(byHabitTime);
  const dueToday = active.filter((h) => habitDue(h, today));
  const doneToday = dueToday.filter((h) => markOf(day, h.title) === "done").length;
  const leaders = active.filter((h) => h.kind !== "prayer").map((h) => ({ h, n: streak(h, daysNow, today) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
  const KINDS: [HabitKind, string, string][] = [["prayer", "Намаз", "вовремя → поздно → пропустил"], ["bad", "Держусь", "чисто → срыв"], ["good", "Полезные", "сделал → не сделал"]];
  return (
    <div className="g-page">
      <div className="g-play">
        <div className="g-top">
          <SceneFrame art={BANNER.habits}>
            <SceneTitle kicker={`привычки · ${groups.active.length} активных · ${groups.paused.length} на паузе`} title="Привычки" />
            {leaders.length > 0 && <div className="g-leaders"><span>самые длинные серии</span>{leaders.map((x) => <div key={x.h.rel}><FlameIcon /><b>{x.n}</b>{x.h.title}</div>)}</div>}
            <SceneNumber value={doneToday} unit={` / ${dueToday.length}`} label="сегодня" sub="карточка отмечает сегодняшний день нажатием" />
          </SceneFrame>
          <SideCard kicker={editing ? `правка · ${form.title}` : "новая привычка"}>
            <form className="g-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
              <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Название" value={form.title} disabled={!!editing} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <div className="two">
                <select className="text" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
                  {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
                </select>
                <select className="text" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as HabitKind })}>
                  <option value="good">хорошая</option>
                  <option value="bad">плохая</option>
                </select>
              </div>
              <select className="text" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value as HabitTime | "" })}>
                <option value="">весь день</option>
                {HABIT_TIMES.map((t) => <option key={t} value={t}>{habitTimeLabel(t)}</option>)}
              </select>
              <div className="g-chips wrap g-daypick">
                {ORDER.map((d) => <button type="button" key={d} className={form.days.includes(d) ? "on" : ""} aria-pressed={form.days.includes(d)} onClick={() => setForm({ ...form, days: form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d] })}>{d}</button>)}
                <button type="button" onClick={() => setForm({ ...form, days: form.days.length === 7 ? [] : [...ORDER] })}>{form.days.length === 7 ? "снять" : "все"}</button>
              </div>
              <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Источник, например [[Atomic Habits]]" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Зачем (одна строка)" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              <div className="g-line">
                <button type="submit">{editing ? "Сохранить" : "Добавить"}</button>
                {editing && <button className="g-link" type="button" onClick={() => { setEditing(null); setForm(EMPTY); }}>отмена</button>}
              </div>
            </form>
            {(err || dayErr) && <p className="g-error" role="alert">{err ?? dayErr}</p>}
          </SideCard>
        </div>

        {groups.proposed.length > 0 && (
          <Block title={`Предложено из vault · ${groups.proposed.length}`} right={<>новую предлагает <Link to="/claude">Claude</Link> — «Привычка месяца»</>}>
            <div className="g-hcards">{groups.proposed.map(habitCard)}</div>
          </Block>
        )}

        {KINDS.map(([kind, title, hint]) => {
          const rank = (t: string) => { const i = PRAYER_ORDER.indexOf(t); return i < 0 ? PRAYER_ORDER.length : i; };
          const of = active.filter((h) => h.kind === kind).sort((x, y) => (kind === "prayer" ? rank(x.title) - rank(y.title) : 0));
          if (!of.length) return null;
          return (
            <Block key={kind} title={`${title} · ${of.length}`} right={`нажатие отмечает сегодня: ${hint} · бусины — 30 дней`}>
              <div className="g-hcards">{of.map(habitCard)}</div>
            </Block>
          );
        })}
        {!active.length && <Block title="Активные"><p className="g-faint">Пока пусто. Добавь первую привычку в карточке справа от картины.</p></Block>}

        {groups.paused.length > 0 && <Block title={`На паузе · ${groups.paused.length}`}><div className="g-hcards">{groups.paused.map(habitCard)}</div></Block>}

        {groups.archived.length > 0 && (
          <Block title={`Архив · ${groups.archived.length}`} right={<button className="g-link" onClick={() => setShowArchived(!showArchived)}>{showArchived ? "свернуть" : "показать"}</button>}>
            {showArchived ? <div className="g-hcards">{groups.archived.map(habitCard)}</div> : <p className="g-faint">Привычки, которые больше не ведутся. Отметки остаются в файлах дней.</p>}
          </Block>
        )}
      </div>
    </div>
  );
}
