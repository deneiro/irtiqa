import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, useVault } from "../../store";
import { THEMES } from "../../lib/themes";
import { useT } from "../../lib/i18n";
import { coMet } from "../../lib/circle";
import { contactEdits, memoryEdits } from "../../lib/contact";
import { MEMORY_THEME, whoLink } from "../../lib/memory";
import { IMAGE_RE, eventDir } from "../../lib/events";
import { writeBinary } from "../../lib/fs";
import { rawPageText } from "../../lib/rawpage";
import { dateWords } from "../../lib/themeNumbers";
import type { Page } from "../../lib/types";

/** A name to tick, linked as the bot links it: the page's file (and its title, when it differs), the plain name without a page. */
const entryOf = (name: string, page: Page | undefined) => whoLink(page ? { name: page.title, rel: page.rel, file: page.file } : { name });

/**
 * «Виделись» → «Создать воспоминание?» (spec v5). The button has already put
 * today into `last_contact`. «Нет — просто встреча», the cross and Esc add the
 * person to the day's «Встреча», as «виделись» in the circle does; «Да,
 * создать» asks what happened, where, with whom, a few words, the photos and
 * the theme, and «Сохранить» writes the event (`memoryEdits`) with the photos
 * beside it as 01, 02… The memory is the meeting: no «Встреча» then.
 */
export default function MetSheet({ open, page, people, today, onClose, onSaved }: {
  open: boolean;
  page: Page;
  people: Page[];
  today: string;
  onClose: () => void;
  onSaved: (rel: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const vault = useVault();
  const { root, life, saveText, reload } = useStore();
  const { themeLabel } = useT();
  const [step, setStep] = useState<"ask" | "form">("ask");
  const [what, setWhat] = useState("");
  const [place, setPlace] = useState("");
  const [words, setWords] = useState("");
  const [theme, setTheme] = useState(MEMORY_THEME);
  const [chosen, setChosen] = useState<string[]>([]);
  const [more, setMore] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // The sheet ends once: by a memory or by a meeting, never both.
  const ended = useRef(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setStep("ask"); setWhat(""); setPlace(""); setWords(""); setTheme(MEMORY_THEME); setChosen([]); setMore(false); setPhotos([]); setErr(null);
      ended.current = false;
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const thumbs = useMemo(() => photos.slice(0, 6).map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => thumbs.forEach((u) => URL.revokeObjectURL(u)), [thumbs]);

  const events = life?.events ?? [];
  const suggested = useMemo(() => coMet(page, people, events, 1).slice(0, 5), [page, people, events]);
  const others = useMemo(() => {
    const shown = new Set(suggested.map((s) => s.page?.rel ?? s.name));
    return people.filter((p) => p.rel !== page.rel && !shown.has(p.rel)).sort((a, b) => a.title.localeCompare(b.title, "ru"));
  }, [people, page, suggested]);
  const toggle = (entry: string) => setChosen((c) => (c.includes(entry) ? c.filter((x) => x !== entry) : [...c, entry]));

  /** Closed without a memory: he joins the day's «Встреча»; `last_contact` is already written. */
  const justMet = async () => {
    if (ended.current || busy || !life) return;
    ended.current = true;
    setBusy(true);
    try {
      const raw = rawPageText(vault, page.rel) ?? "";
      for (const e of contactEdits({ rel: page.rel, file: page.file, raw }, life.events, today, true, page.theme)) if (e.rel !== page.rel) await saveText(e.rel, e.content);
      await reload();
      onClose();
    } catch (e) { ended.current = false; setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };

  const save = async () => {
    if (busy || !life || !what.trim()) return;
    setBusy(true);
    try {
      const e = memoryEdits({ name: page.title, rel: page.rel, file: page.file }, { title: what, place, people: chosen, body: words, theme }, today, life.events);
      await saveText(e.rel, e.content);
      ended.current = true;
      const dir = e.rel.slice(0, e.rel.lastIndexOf("/"));
      let n = 0;
      for (const f of photos) {
        if (!IMAGE_RE.test(f.name)) continue;
        n++;
        await writeBinary(root, `${dir}/${String(n).padStart(2, "0")}.${f.name.slice(f.name.lastIndexOf(".") + 1).toLowerCase()}`, await f.arrayBuffer());
      }
      await reload();
      onSaved(e.rel);
      onClose();
    } catch (x) { setErr(x instanceof Error ? x.message : String(x)); } finally { setBusy(false); }
  };

  const day = dateWords(today, today);
  const cross = <button className="p-xb" type="button" aria-label="Закрыть" disabled={busy} onClick={() => (ended.current ? onClose() : void justMet())}>×</button>;
  return (
    <dialog ref={ref} className="p-sheet" aria-labelledby="p-met-q" onCancel={(e) => { e.preventDefault(); if (ended.current) onClose(); else void justMet(); }}>
      {step === "ask" ? (
        <div className="p-sh">
          <div className="p-sh-top"><span className="p-label">Виделись · {day}</span>{cross}</div>
          <div className="p-sh-ok">✓ {page.title} — связь сегодня</div>
          <h2 className="p-sh-q" id="p-met-q">Создать воспоминание?</h2>
          <p className="p-sh-p">Что было, где, с кем и фото — ляжет в «Вместе» и в события.</p>
          <div className="p-sh-acts">
            <button className="p-btn p-primary" type="button" disabled={busy} onClick={() => setStep("form")}>Да, создать</button>
            <button className="p-btn" type="button" disabled={busy} onClick={() => void justMet()}>Нет — просто встреча</button>
          </div>
          {err && <p className="p-sh-err">{err}</p>}
          <div className="p-sh-foot">«Нет» — как «виделись» в «Круге»: человек добавится во «Встречу» дня</div>
        </div>
      ) : (
        <form className="p-sh" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div className="p-sh-top"><span className="p-label" id="p-met-q">Воспоминание · {day}</span>{cross}</div>
          <label className="p-fld"><span>Что было</span><input className="p-inp" autoFocus autoComplete="off" spellCheck={false} placeholder="ночёвка в горах, день рождения…" value={what} onChange={(e) => setWhat(e.target.value)} /></label>
          <label className="p-fld"><span>Где</span><input className="p-inp" autoComplete="off" spellCheck={false} placeholder="место" value={place} onChange={(e) => setPlace(e.target.value)} /></label>
          <div className="p-fld">
            <span>С кем</span>
            <div className="p-chips">
              <button type="button" className="p-tg" aria-pressed="true" disabled title="всегда">{page.title}</button>
              {suggested.map((s) => {
                const entry = entryOf(s.name, s.page);
                return <button key={entry} type="button" className="p-tg" aria-pressed={chosen.includes(entry)} onClick={() => toggle(entry)}>{s.name}</button>;
              })}
              {more && others.map((p) => {
                const entry = entryOf(p.title, p);
                return <button key={p.rel} type="button" className="p-tg" aria-pressed={chosen.includes(entry)} onClick={() => toggle(entry)}>{p.title}</button>;
              })}
              <button type="button" className="p-tg" aria-expanded={more} onClick={() => setMore((m) => !m)}>{more ? "свернуть" : "+ ещё"}</button>
            </div>
          </div>
          <label className="p-fld"><span>Пара слов</span><textarea className="p-inp" rows={2} spellCheck={false} placeholder="как прошло — можно одной фразой" value={words} onChange={(e) => setWords(e.target.value)} /></label>
          <div className="p-fld">
            <span>Фото</span>
            <label className="p-drop">
              <input type="file" accept="image/*" multiple onChange={(e) => { setPhotos([...(e.target.files ?? [])].filter((f) => IMAGE_RE.test(f.name))); e.target.value = ""; }} />
              <span>{photos.length ? `${photos.length} фото — лягут рядом с заметкой` : "Выбери фото — лягут рядом с заметкой"}</span>
              <span className="p-thumbs">{thumbs.map((u) => <img key={u} alt="" src={u} />)}</span>
            </label>
          </div>
          <label className="p-fld">
            <span>Тема</span>
            <select className="p-inp" value={theme} onChange={(e) => setTheme(e.target.value)}>
              {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
            </select>
          </label>
          <div className="p-sh-acts">
            <button className="p-btn p-primary" type="submit" disabled={busy || !what.trim()}>{busy ? "Сохраняю…" : "Сохранить"}</button>
            <button className="p-btn p-ghost" type="button" disabled={busy} onClick={() => setStep("ask")}>← назад</button>
          </div>
          {err && <p className="p-sh-err">{err}</p>}
          <div className="p-sh-foot">→ <b>{eventDir(today, what.trim() || "…")}/event.md</b><br />отдельной «Встречи» дня не будет: воспоминание — уже встреча</div>
        </form>
      )}
    </dialog>
  );
}
