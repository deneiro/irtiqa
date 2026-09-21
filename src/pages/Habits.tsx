import { useMemo, useState } from "react";
import { useStore } from "../store";
import { THEMES } from "../lib/themes";
import { useT } from "../lib/i18n";
import { WEEKDAYS_RU, addDays } from "../lib/dates";
import { HABIT_DIR, bestStreak, habitDue, habitRate, markOf, safeFilename, serializeHabit, streak, type Habit, type HabitKind, type HabitStatus } from "../lib/life";
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

interface Form { title: string; theme: string; kind: HabitKind; days: string[]; body: string; source: string }
const EMPTY: Form = { title: "", theme: THEMES[2].name, kind: "good", days: [...ORDER], body: "", source: "" };

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
  const days = life?.days ?? new Map();
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
      if (h) await write(h, { theme: form.theme, kind: form.kind, freq: formFreq(form.days), body: form.body, source: form.source.trim() || undefined });
      setEditing(null);
      setForm(EMPTY);
      return;
    }
    if (habits.some((h) => h.title === title)) { setErr("Такая привычка уже есть."); return; }
    try {
      await saveText(`${HABIT_DIR}/${safeFilename(title)}.md`, serializeHabit({ title, theme: form.theme, kind: form.kind, freq: formFreq(form.days), status: "active", created: today, source: form.source.trim() || undefined, body: form.body }));
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
    setForm({ title: h.title, theme: h.theme ?? THEMES[2].name, kind: h.kind, days: freqDays(h.freq), body: h.body, source: h.source ?? "" });
    window.scrollTo(0, 0);
  };

  const last14 = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, -(13 - i))), [today]);

  const Row = ({ h }: { h: Habit }) => {
    const s = streak(h, days, today);
    const rate = habitRate(h, days, today);
    return (
      <div className="hrow">
        <div style={{ minWidth: 0 }}>
          <div className="name">{h.title} {h.kind === "bad" && <span className="chip">плохая</span>}</div>
          <div className="sub">
            {h.theme ? themeLabel(h.theme) : "без темы"} · {freqLabel(h.freq)}
            {h.source ? <> · <SourceLink source={h.source} /></> : null}
          </div>
          {h.body && <div className="small muted" style={{ marginTop: 4 }}>{h.body}</div>}
        </div>
        <div className="dots" title="последние 14 дней">
          {last14.map((d) => {
            const m = days.get(d) ? markOf(days.get(d)!, h.title) : undefined;
            const due = habitDue(h, d);
            return <i key={d} className={`dot ${m ?? (due ? "none" : "off")}`} />;
          })}
        </div>
        <div className="hstats">
          <span title="текущий стрик"><b>{s}</b> дн.</span>
          <span title="лучший стрик" className="faint">макс {bestStreak(h, days)}</span>
          <span title="за 30 дней, из отмеченных" className="faint">{rate.due ? `${Math.round((100 * rate.done) / rate.due)}%` : "—"}</span>
          {rate.unmarked > 0 && <span title="дней без отметки за 30 дней — не считаются ни сделанными, ни сорванными" className="faint">без отметки {rate.unmarked}</span>}
        </div>
        <div className="hactions">
          {h.status === "proposed" && <><button className="btn small primary" onClick={() => setStatus(h, "active")}>принять</button><button className="btn small ghost" onClick={() => setStatus(h, "archived")}>отклонить</button></>}
          {h.status === "active" && <><button className="btn small ghost" onClick={() => startEdit(h)}>править</button><button className="btn small ghost" onClick={() => setStatus(h, "paused")}>пауза</button><button className="btn small ghost" onClick={() => setStatus(h, "archived")}>в архив</button></>}
          <button className="btn small ghost" title="удалить насовсем" onClick={() => void remove(h)}>×</button>
          {h.status === "paused" && <><button className="btn small" onClick={() => setStatus(h, "active")}>вернуть</button><button className="btn small ghost" onClick={() => setStatus(h, "archived")}>в архив</button></>}
          {h.status === "archived" && <button className="btn small ghost" onClick={() => setStatus(h, "active")}>вернуть</button>}
        </div>
      </div>
    );
  };

  if (!life) return null;
  return (
    <div>
      <div className="eyebrow">life/habits</div>
      <h1 className="title">Привычки</h1>
      <p className="lede">{groups.active.length} активных · {groups.paused.length} на паузе · {groups.proposed.length} предложено из vault</p>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>{editing ? `Правка: ${form.title}` : "Новая привычка"}</h3>
        <form className="hform" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Название" value={form.title} disabled={!!editing} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="text" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
            {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
          </select>
          <select className="text" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as HabitKind })}>
            <option value="good">хорошая</option>
            <option value="bad">плохая</option>
          </select>
          <div className="daypick">
            {ORDER.map((d) => (
              <label key={d} className={`dp ${form.days.includes(d) ? "on" : ""}`}>
                <input type="checkbox" checked={form.days.includes(d)} onChange={(e) => setForm({ ...form, days: e.target.checked ? [...form.days, d] : form.days.filter((x) => x !== d) })} />
                {d}
              </label>
            ))}
            <button type="button" className="btn small ghost" onClick={() => setForm({ ...form, days: form.days.length === 7 ? [] : [...ORDER] })}>{form.days.length === 7 ? "снять" : "все"}</button>
          </div>
          <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Источник, например [[Atomic Habits]]" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Зачем (одна строка, необязательно)" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <div className="row">
            <button className="btn primary" type="submit">{editing ? "сохранить" : "+ добавить"}</button>
            {editing && <button className="btn ghost" type="button" onClick={() => { setEditing(null); setForm(EMPTY); }}>отмена</button>}
          </div>
        </form>
        {err && <div className="small" style={{ color: "var(--danger)", marginTop: 6 }}>{err}</div>}
      </div>

      {groups.proposed.length > 0 && (
        <>
          <h2 className="section">Предложено из vault <span className="n">{groups.proposed.length}</span></h2>
          <p className="small muted" style={{ marginTop: -4 }}>Claude читает профиль, темы и последние дни и предлагает привычку. Запросить новую — на панели <Link to="/claude">Claude</Link>, кнопка «Привычка месяца».</p>
          <div className="card inbox">
            {groups.proposed.map((h) => (
              <div key={h.rel} className="proposal">
                <Row h={h} />
                {h.body.trim() && <div className="why">{h.body.trim()}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section">Активные <span className="n">{groups.active.length}</span></h2>
      {groups.active.length ? <div className="card">{groups.active.map((h) => <Row key={h.rel} h={h} />)}</div> : <div className="empty">Пока пусто. Добавь первую привычку выше.</div>}

      {groups.paused.length > 0 && (
        <>
          <h2 className="section">На паузе <span className="n">{groups.paused.length}</span></h2>
          <div className="card">{groups.paused.map((h) => <Row key={h.rel} h={h} />)}</div>
        </>
      )}

      {groups.archived.length > 0 && (
        <>
          <h2 className="section">
            <button className="tab" style={{ padding: 0, margin: 0, border: "none" }} onClick={() => setShowArchived(!showArchived)}>Архив {showArchived ? "▾" : "▸"}</button>
            <span className="n">{groups.archived.length}</span>
          </h2>
          {showArchived && <div className="card">{groups.archived.map((h) => <Row key={h.rel} h={h} />)}</div>}
        </>
      )}
    </div>
  );
}
