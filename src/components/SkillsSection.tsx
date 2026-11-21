import { useMemo, useState } from "react";
import { useStore } from "../store";
import { THEMES, themeColor } from "../lib/themes";
import { useT } from "../lib/i18n";
import { plural, todayStr } from "../lib/dates";
import { confirmAction } from "../lib/native";
import SourceLink from "../components/SourceLink";
import { LEVELS, SKILL_STATUS, daysSincePractice, isDrifting, serializeSkill, skillRel, type Skill, type SkillStatus } from "../lib/skills";
import { Block } from "../pages/main/Scene";
import { Err, Mini } from "./SectionBits";

/**
 * The skill registry (rebuilt 2026-11-21 the way «Сегодня» is): four numbers, then a block per status with a card a
 * skill — the level as five bars to tap, when it was last practised, «тренировал». A card's name opens its details.
 */
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
  const wanted = skills.filter((s) => s.status === "wanted").length;

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
    <div className="g-play">
      <Block title="Все навыки" right={adding ? undefined : <button type="button" className="g-btn sun" onClick={() => setAdding(true)}>+ навык</button>}>
        <div className="g-minis four">
          <Mini value={have.length} label="навыков есть" />
          <Mini value={have.length ? avg.toFixed(1) : "—"} label="средний уровень из 5" />
          <Mini value={wanted} label="в очереди" tone={wanted ? "now" : undefined} />
          <Mini value={drifting.length} label="давно не трогал" tone={drifting.length ? "bad" : undefined} />
        </div>
        {drifting.length > 0 && <p className="g-cap">Давно не трогал: {drifting.map((s) => s.title).join(", ")}.</p>}
        {adding && (
          <form className="g-addrow" onSubmit={(e) => { e.preventDefault(); void add(); }}>
            <input className="text wide" autoCorrect="off" autoCapitalize="off" spellCheck={false} autoFocus placeholder="Навык: арабский, слепая печать, деловое письмо…" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select className="text" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
              {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
            </select>
            <select className="text" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SkillStatus })}>
              {SKILL_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <select className="text" value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} disabled={form.status === "wanted" || form.status === "gap"}>
              {LEVELS.map((l, i) => <option key={l} value={i}>{i}. {l}</option>)}
            </select>
            <button type="submit" disabled={!form.title.trim() || busy}>Добавить</button>
            <button className="g-btn" type="button" onClick={() => setAdding(false)}>отмена</button>
          </form>
        )}
        <Err text={err} />
        {skills.length === 0 && <p className="g-faint">Навыков пока нет. Добавь первый: название, тема, уровень.</p>}
      </Block>

      {groups.map((g) => (
        <Block key={g.key} className={`g-skgroup ${g.key}`} title={<>{g.label} · {g.items.length}</>} right={g.hint}>
          <div className="g-skcards">
            {g.items.map((s) => {
              const since = daysSincePractice(s, today);
              const isOpen = open === s.rel;
              return (
                <div className={`g-skcard${isDrifting(s, today) ? " drift" : ""}${isOpen ? " open" : ""}`} key={s.rel} style={{ ["--c" as string]: themeColor(s.theme) }}>
                  <button type="button" className="nm" onClick={() => setOpen(isOpen ? null : s.rel)} title="подробности">{s.title}</button>
                  <div className="lv" title={`${LEVELS[s.level]} (${s.level} из 5)`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button type="button" key={n} className={n <= s.level ? "on" : ""} disabled={busy} title={`${n}. ${LEVELS[n]}`} aria-label={`уровень ${n}: ${LEVELS[n]}`} onClick={() => void write(s, { level: n === s.level ? n - 1 : n })} />
                    ))}
                    <span>{LEVELS[s.level]}</span>
                  </div>
                  <div className="ft">
                    <small>{since === undefined ? "ещё не отмечал" : since === 0 ? "сегодня" : `${since} ${plural(since, "день", "дня", "дней")} назад`}</small>
                    <button type="button" className="g-btn" disabled={busy} onClick={() => void write(s, { lastPracticed: today, status: s.status === "rusty" || s.status === "wanted" ? "growing" : s.status })}>тренировал</button>
                  </div>
                  {isOpen && (
                    <div className="more">
                      <div className="row">
                        <select className="text" value={s.status} disabled={busy} onChange={(e) => void write(s, { status: e.target.value as SkillStatus })}>
                          {SKILL_STATUS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                        </select>
                        <select className="text" value={s.theme ?? ""} disabled={busy} onChange={(e) => void write(s, { theme: e.target.value })}>
                          {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
                        </select>
                        {s.source && <SourceLink source={s.source} />}
                        <button type="button" className="g-btn ember" disabled={busy} onClick={() => void remove(s)}>убрать</button>
                      </div>
                      <textarea
                        className="text" rows={3} placeholder="Что именно умею, чем подтверждается, что дальше."
                        defaultValue={s.body} disabled={busy}
                        onBlur={(e) => { if (e.target.value.trim() !== s.body) void write(s, { body: e.target.value }); }}
                      />
                      <small>Текст сохраняется, когда уходишь из поля. Файл: {s.rel}</small>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Block>
      ))}
    </div>
  );
}
