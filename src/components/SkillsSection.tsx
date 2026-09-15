import { useMemo, useState } from "react";
import { useStore } from "../store";
import { THEMES, themeColor } from "../lib/themes";
import { useT } from "../lib/i18n";
import { todayStr } from "../lib/dates";
import { confirmAction } from "../lib/native";
import SourceLink from "../components/SourceLink";
import { LEVELS, SKILL_STATUS, daysSincePractice, isDrifting, serializeSkill, skillRel, type Skill, type SkillStatus } from "../lib/skills";

/** The skill registry: level, state, when it was last practised. */
export default function SkillsSection() {
  const { life, saveText, reload } = useStore();
  const { themeLabel } = useT();
  const today = todayStr();
  const skills = life?.skills ?? [];
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", theme: THEMES[2].name, level: 2, status: "growing" as SkillStatus });
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const groups = useMemo(
    () => SKILL_STATUS.map((s) => ({ ...s, items: skills.filter((x) => x.status === s.key) })).filter((g) => g.items.length > 0),
    [skills],
  );
  const have = skills.filter((s) => s.level > 0);
  const avg = have.length ? have.reduce((n, s) => n + s.level, 0) / have.length : 0;
  const drifting = skills.filter((s) => isDrifting(s, today));

  const write = async (s: Skill, patch: Partial<Skill>) => {
    setBusy(true);
    try {
      await saveText(s.rel, serializeSkill({ ...s, ...patch }));
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const add = async () => {
    const title = form.title.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      if (skills.some((s) => s.title.toLowerCase() === title.toLowerCase())) throw new Error("Такой навык уже есть");
      await saveText(skillRel(title), serializeSkill({
        title, theme: form.theme, level: form.status === "wanted" || form.status === "gap" ? 0 : form.level,
        status: form.status, lastPracticed: undefined, source: undefined, tags: [], body: "",
      }));
      setForm({ ...form, title: "" });
      setAdding(false);
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const remove = async (s: Skill) => {
    if (!(await confirmAction(`Убрать навык «${s.title}»?`))) return;
    await write(s, { status: "gap" }); // keep the file; a removed skill is really a gap
  };

  return (
    <section className="tblock">
      <h2 className="section">
        Навыки <span className="n">{have.length} есть · {skills.filter((s) => s.status === "wanted").length} в очереди</span>
      </h2>
      <p className="small muted" style={{ marginTop: -4 }}>
        {have.length > 0 ? `Средний уровень ${avg.toFixed(1)} из 5.` : "Пока пусто."}{" "}
        {drifting.length > 0 && <span className="hl">{drifting.length} давно не трогал: {drifting.map((s) => s.title).join(", ")}.</span>}
      </p>

      <div className="row" style={{ margin: "10px 0" }}>
        {adding ? (
          <form className="addrow skill" onSubmit={(e) => { e.preventDefault(); void add(); }}>
            <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} autoFocus placeholder="Навык: арабский, слепая печать, деловое письмо…" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select className="text" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
              {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
            </select>
            <select className="text" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SkillStatus })}>
              {SKILL_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <select className="text" value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} disabled={form.status === "wanted" || form.status === "gap"}>
              {LEVELS.map((l, i) => <option key={l} value={i}>{i}. {l}</option>)}
            </select>
            <button className="btn primary" type="submit" disabled={!form.title.trim() || busy}>добавить</button>
            <button className="btn ghost" type="button" onClick={() => setAdding(false)}>отмена</button>
          </form>
        ) : (
          <button className="btn primary" onClick={() => setAdding(true)}>+ навык</button>
        )}
      </div>
      {err && <div className="small" style={{ color: "var(--danger)" }}>{err}</div>}

      {groups.map((g) => (
        <div className="skgroup" key={g.key}>
          <h3>{g.label} <span className="n">{g.items.length}</span> <span className="small faint">{g.hint}</span></h3>
          {g.items.map((s) => {
            const since = daysSincePractice(s, today);
            const isOpen = open === s.rel;
            return (
              <div className={`skill ${isDrifting(s, today) ? "drift" : ""}`} key={s.rel} style={{ ["--c" as string]: themeColor(s.theme) }}>
                <div className="skrow">
                  <span className="bar" />
                  <button className="skname" onClick={() => setOpen(isOpen ? null : s.rel)} title="подробности">{s.title}</button>
                  <span className="dots" title={`${LEVELS[s.level]} (${s.level} из 5)`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} className={`lv ${n <= s.level ? "on" : ""}`} disabled={busy} title={`${n}. ${LEVELS[n]}`} onClick={() => void write(s, { level: n === s.level ? n - 1 : n })} />
                    ))}
                  </span>
                  <span className="small muted lvl-label">{LEVELS[s.level]}</span>
                  <span className="grow" />
                  <span className="small faint">{since === undefined ? "" : since === 0 ? "сегодня" : `${since} дн. назад`}</span>
                  <button className="btn small ghost" disabled={busy} onClick={() => void write(s, { lastPracticed: today, status: s.status === "rusty" || s.status === "wanted" ? "growing" : s.status })}>тренировал</button>
                </div>
                {isOpen && (
                  <div className="skdetail">
                    <div className="row wrap" style={{ gap: 8 }}>
                      <select className="text" value={s.status} disabled={busy} onChange={(e) => void write(s, { status: e.target.value as SkillStatus })}>
                        {SKILL_STATUS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                      </select>
                      <select className="text" value={s.theme ?? ""} disabled={busy} onChange={(e) => void write(s, { theme: e.target.value })}>
                        {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
                      </select>
                      {s.source && <SourceLink source={s.source} />}
                      <span className="grow" />
                      <button className="btn small ghost" disabled={busy} onClick={() => void remove(s)}>убрать</button>
                    </div>
                    <textarea
                      className="text"
                      rows={3}
                      placeholder="Что именно умею, чем подтверждается, что дальше."
                      defaultValue={s.body}
                      disabled={busy}
                      onBlur={(e) => { if (e.target.value.trim() !== s.body) void write(s, { body: e.target.value }); }}
                      style={{ marginTop: 8, width: "100%", resize: "vertical" }}
                    />
                    <div className="small faint" style={{ marginTop: 4 }}>Текст сохраняется, когда уходишь из поля. Файл: {s.rel}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {skills.length === 0 && <div className="empty">Навыков пока нет. Добавь первый: название, тема, уровень.</div>}
    </section>
  );
}
