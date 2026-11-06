import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore, useVault } from "../store";
import { themeColor } from "../lib/themes";
import { useT } from "../lib/i18n";
import { pageUrl } from "../lib/vault";
import { confirmAction, mediaUrl, revealInFinder } from "../lib/native";
import { deleteFile, writeBinary } from "../lib/fs";
import { IMAGE_RE, personName, serializeEvent, type LifeEvent } from "../lib/events";
import { isAuthor } from "../lib/people";
import { normEnd, normalizeTime } from "../lib/calendar";
import { eventTheme } from "../lib/themeDays";

function fmtDate(d: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const s = new Date(d + "T12:00:00").toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function EventPage() {
  const { rel = "" } = useParams();
  const target = decodeURIComponent(rel);
  const v = useVault();
  const { root, life, saveText, reload } = useStore();
  const { themeLabel } = useT();
  const nav = useNavigate();
  const ev = life?.events.find((e) => e.rel === target);

  const [text, setText] = useState(ev?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const evRef = useRef<LifeEvent | undefined>(ev);
  evRef.current = ev;

  useEffect(() => { if (!dirty.current && ev) setText(ev.body); }, [ev]);

  const [time, setTime] = useState({ from: ev?.from ?? "", to: ev?.to ?? "" });
  useEffect(() => { setTime({ from: ev?.from ?? "", to: ev?.to ?? "" }); }, [ev?.from, ev?.to]);

  const people = useMemo(
    () => v.pages.filter((p) => p.zone === "person" && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p)).map((p) => p.title).sort(),
    [v],
  );

  const write = async (next: Partial<LifeEvent>, body?: string) => {
    const cur = evRef.current;
    if (!cur) return;
    const merged = { ...cur, ...next, body: body ?? (dirty.current ? text : cur.body) };
    await saveText(cur.rel, serializeEvent({ title: merged.title, date: merged.date, theme: merged.theme, place: merged.place, from: merged.from, to: merged.to, people: merged.people, tags: merged.tags, body: merged.body }));
    dirty.current = false;
  };

  const onText = (value: string) => {
    setText(value);
    dirty.current = true;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void write({}, value).then(() => reload()).catch((e) => setErr(String(e))); }, 800);
  };
  useEffect(() => () => { window.clearTimeout(timer.current); }, []);

  const togglePerson = async (name: string) => {
    if (!ev) return;
    const has = ev.people.some((p) => personName(p) === name);
    const people = has ? ev.people.filter((p) => personName(p) !== name) : [...ev.people, `[[${name}]]`];
    setBusy(true);
    try { await write({ people }); await reload(); setErr(null); } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length || !ev) return;
    setBusy(true);
    try {
      let n = ev.photos.length;
      for (const file of Array.from(files)) {
        if (!IMAGE_RE.test(file.name)) continue;
        const ext = file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase();
        n++;
        await writeBinary(root, `${ev.dir}/${String(n).padStart(2, "0")}.${ext}`, await file.arrayBuffer());
      }
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  /** Empty «с» clears the time; the event then leaves the calendar. */
  const saveTime = async () => {
    if (!ev) return;
    const from = time.from.trim() ? normalizeTime(time.from) : "";
    const to = from && time.to.trim() ? normEnd(time.to) : "";
    if (time.from.trim() && !from) { setErr("Время — в виде 19:00."); return; }
    if (from === ev.from && to === ev.to) return;
    setBusy(true);
    try { await write({ from, to }); await reload(); setErr(null); } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const removePhoto = async (photo: string) => {
    if (!(await confirmAction("Удалить эту фотографию?"))) return;
    setBusy(true);
    try { await deleteFile(root, photo); await reload(); } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const removeEvent = async () => {
    if (!ev || !(await confirmAction(`Удалить событие «${ev.title}» со всеми фотографиями?`))) return;
    setBusy(true);
    try { await deleteFile(root, ev.dir); await reload(); nav(`/theme/${encodeURIComponent(eventTheme(ev))}`); } catch (e) { setErr(String(e)); setBusy(false); }
  };

  if (!life) return null;
  if (!ev) return <div className="empty">Событие не найдено. <Link to="/theme/Memories%20%26%20Fun">К воспоминаниям</Link>.</div>;
  const color = themeColor(ev.theme);

  return (
    <div style={{ ["--c" as string]: color }}>
      <div className="eyebrow">
        {ev.theme ? <Link to={`/theme/${encodeURIComponent(ev.theme)}`} style={{ color }}>{themeLabel(ev.theme)}</Link> : "событие"} · {fmtDate(ev.date)}{ev.from ? ` · ${ev.from}${ev.to ? `–${ev.to}` : ""}` : ""}{ev.place ? ` · ${ev.place}` : ""}
      </div>
      <h1 className="title">{ev.title}</h1>

      <div className="row small muted" style={{ gap: 6, marginTop: 6 }}>
        <span>время</span>
        <input className="text mono" style={{ width: 66 }} placeholder="с" value={time.from} disabled={busy}
          onChange={(e) => setTime({ ...time, from: e.target.value })} onBlur={() => void saveTime()} onKeyDown={(e) => e.key === "Enter" && void saveTime()} />
        <span>—</span>
        <input className="text mono" style={{ width: 66 }} placeholder="до" value={time.to} disabled={busy}
          onChange={(e) => setTime({ ...time, to: e.target.value })} onBlur={() => void saveTime()} onKeyDown={(e) => e.key === "Enter" && void saveTime()} />
        <span className="faint">{ev.from ? "стоит в календаре" : "со временем событие встанет в календарь"}</span>
      </div>

      <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
        {people.map((name) => {
          const on = ev.people.some((p) => personName(p) === name);
          const page = v.resolve(name);
          return on && page ? (
            <span key={name} className="row" style={{ gap: 2 }}>
              <Link to={pageUrl(page)} className="chip c" style={{ ["--c" as string]: "var(--accent-2)" }}>{name}</Link>
              <button className="btn small ghost" title="убрать из события" disabled={busy} onClick={() => void togglePerson(name)}>×</button>
            </span>
          ) : null;
        })}
        <details className="addperson">
          <summary className="btn small ghost">+ кто был</summary>
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            {people.map((name) => (
              <button key={name} className={`chip link ${ev.people.some((p) => personName(p) === name) ? "on" : ""}`} disabled={busy} onClick={() => void togglePerson(name)}>{name}</button>
            ))}
          </div>
        </details>
      </div>

      {err && <div className="notice err" style={{ marginTop: 10 }}>{err}</div>}

      <div className="photos">
        {ev.photos.map((p) => (
          <div className="photo" key={p}>
            <img src={mediaUrl(root, p)} alt="" loading="lazy" onClick={() => setZoom(mediaUrl(root, p))} />
            <button className="btn small ghost rm" title="удалить" disabled={busy} onClick={() => void removePhoto(p)}>×</button>
          </div>
        ))}
        <label className="photo add">
          <input type="file" accept="image/*" multiple hidden onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
          <span>{busy ? "…" : "+ фото"}</span>
        </label>
      </div>

      <textarea
        className="text evtext"
        rows={8}
        placeholder="Как всё прошло. Свободный текст, он останется в файле события."
        value={text}
        onChange={(e) => onText(e.target.value)}
      />

      <div className="row wrap" style={{ gap: 8, marginTop: 14 }}>
        <button className="btn ghost" onClick={() => void revealInFinder(`${root}/${ev.dir}`)}>показать папку</button>
        <span className="grow" />
        <button className="btn ghost" disabled={busy} onClick={() => void removeEvent()} style={{ color: "var(--danger)" }}>удалить событие</button>
      </div>
      <div className="small faint" style={{ marginTop: 8 }}>Файл: {ev.rel}</div>

      {zoom && <div className="lightbox" onClick={() => setZoom(null)}><img src={zoom} alt="" /></div>}
    </div>
  );
}
