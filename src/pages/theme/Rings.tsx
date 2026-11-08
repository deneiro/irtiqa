import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore, useVault } from "../../store";
import { pageUrl } from "../../lib/vault";
import { rawPageText } from "../../lib/rawpage";
import { setFrontmatterKeys } from "../../lib/frontmatter";
import { todayStr } from "../../lib/dates";
import { allGroups, categoryOf, closenessOf, groupsOf, isAuthor } from "../../lib/people";
import { isGone } from "../../lib/family";
import type { Page } from "../../lib/types";
import "./Kin.css";

/**
 * «Круги» (Eldar, 2026-11-08): he stands in the centre, the closest around him — closeness 10 the first band,
 * 1 the last. Names sit inside the bands, between the lines, never on them; a band that holds many people
 * gets more rows. A name dragged into another band writes `closeness:`. The board zooms with the wheel
 * (or a pinch) round the pointer and pans by dragging the empty field — there is room for any number of people.
 * Without closeness a person waits in the column beside the board and is dragged in from there. His own family
 * («семья») is not on the board — «они по-любому все десятки» (2026-11-08) — nor is anyone no longer with him.
 */
const ME_R = 44;      // the centre
const NAME = 128;     // arc one name takes on a row
const ROW = 40;       // between two rows of names in one band
const PADB = 34;      // from a band's line to its first and last row
const MIN_BAND = 110; // a band with people is at least this wide
const EMPTY_BAND = 64; // an empty one, still wide enough to drop a name into
const MARGIN = 80;

interface Band { k: number; inner: number; outer: number; rows: number[] }

/** Bands from the centre out: each holds its people in as many rows as their names need. */
export function bandsFor(counts: number[]): Band[] {
  const out: Band[] = [];
  let inner = ME_R + 16;
  for (let k = 10; k >= 1; k--) {
    const rows: number[] = [];
    let left = counts[k], r = inner + PADB;
    while (left > 0) {
      const fit = Math.max(1, Math.floor((2 * Math.PI * r) / NAME));
      rows.push(r);
      left -= fit;
      if (left > 0) r += ROW;
    }
    const outer = Math.max(inner + (rows.length ? MIN_BAND : EMPTY_BAND), (rows.length ? rows[rows.length - 1] : inner) + PADB);
    out.push({ k, inner, outer, rows });
    inner = outer;
  }
  return out;
}

interface Drag { rel: string; x: number; y: number; ox: number; oy: number }
interface View { s: number; x: number; y: number } // scale and the layer's offset in the viewport

export function RingsBoard() {
  const v = useVault();
  const { saveText, reload } = useStore();
  const port = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [moved, setMoved] = useState<Record<string, number>>({});
  const [group, setGroup] = useState("");
  const [err, setErr] = useState<string>();
  const people = useMemo(() => v.pages.filter((p) => p.zone === "person" && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p) && categoryOf(p) !== "семья" && !isGone(p)), [v]);
  const groups = useMemo(() => allGroups(people), [people]);
  const shown = people.filter((p) => !group || (group === "—" ? !groupsOf(p).length : groupsOf(p).includes(group)));
  const close = (p: Page) => moved[p.rel] ?? closenessOf(p);

  const bands = useMemo(() => { const n = new Array(11).fill(0); for (const p of people) { const k = closenessOf(p); if (k) n[k]++; } return bandsFor(n); }, [people]);
  const SIZE = Math.round(2 * (bands[bands.length - 1].outer + MARGIN)), C = SIZE / 2;
  const bandAt = (d: number) => bands.find((b) => d >= b.inner && d < b.outer)?.k ?? (d < ME_R + 16 ? 10 : undefined);

  // Seats: a band's people by name, row after row from the inside, evenly round each row; rows offset so names do not line up.
  const seats = new Map<string, { x: number; y: number }>();
  for (const b of bands) {
    const ring = shown.filter((p) => close(p) === b.k).sort((a, c) => a.title.localeCompare(c.title));
    let i = 0;
    b.rows.forEach((r, ri) => {
      const fit = Math.max(1, Math.floor((2 * Math.PI * r) / NAME));
      const here = ring.slice(i, i + fit);
      here.forEach((p, j) => {
        const a = -Math.PI / 2 + (2 * Math.PI * (j + (ri % 2) * 0.5)) / here.length + b.k * 0.37;
        seats.set(p.rel, { x: C + r * Math.cos(a), y: C + r * Math.sin(a) });
      });
      i += fit;
    });
  }
  const tray = shown.filter((p) => close(p) === undefined).sort((a, b) => a.title.localeCompare(b.title));

  // ---- zoom and pan ----
  const [view, setView] = useState<View>({ s: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  // «Показать всё» fits every band; on opening, the bands that hold people fill the window.
  const used = bands.filter((b) => b.rows.length).reduce((m, b) => Math.max(m, b.outer), ME_R + 40);
  const fitTo = useCallback((radius: number, least = 0) => {
    const el = port.current;
    if (!el) return;
    const w = el.clientWidth, h = el.clientHeight, s = Math.max(least, Math.min(w, h) / (2 * radius + 40));
    setView({ s, x: w / 2 - C * s, y: h / 2 - C * s });
  }, [C]);
  const fit = () => fitTo(C - MARGIN);
  useLayoutEffect(() => { fitTo(used, 0.75); }, [fitTo, used]); // never so small that names cannot be read
  const zoomAt = (px: number, py: number, f: number) => setView((o) => {
    const s = Math.min(4, Math.max(0.15, o.s * f));
    const k = s / o.s;
    return { s, x: px - (px - o.x) * k, y: py - (py - o.y) * k };
  });
  useEffect(() => {
    const el = port.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      // A pinch arrives as a wheel with ctrl; a mouse wheel and a two-finger scroll both zoom here.
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  const pan = useRef<{ cx: number; cy: number; x: number; y: number } | null>(null);
  const panDown = (e: RPointerEvent) => {
    if (e.button !== 0 || (e.target as Element).closest(".k-chip")) return;
    pan.current = { cx: e.clientX, cy: e.clientY, x: viewRef.current.x, y: viewRef.current.y };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const panMove = (e: RPointerEvent) => {
    const p = pan.current;
    if (p) setView((o) => ({ ...o, x: p.x + e.clientX - p.cx, y: p.y + e.clientY - p.cy }));
  };
  const panUp = () => { pan.current = null; };

  /** A point of the screen in the board's own units. */
  const toBoard = (cx: number, cy: number) => {
    const r = port.current!.getBoundingClientRect(), o = viewRef.current;
    return { x: (cx - r.left - o.x) / o.s, y: (cy - r.top - o.y) / o.s };
  };

  // ---- dragging a name ----
  const down = (e: RPointerEvent, p: Page) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDrag({ rel: p.rel, ...toBoard(e.clientX, e.clientY), ox: e.clientX, oy: e.clientY });
  };
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;
  useEffect(() => {
    if (!drag) return;
    const mv = (e: PointerEvent) => { const d = dragRef.current; if (d) setDrag({ ...d, ...toBoard(e.clientX, e.clientY) }); };
    const end = (e: PointerEvent) => { const d = dragRef.current; const p = people.find((x) => x.rel === d?.rel); if (d && p) void up(e, d, p); };
    const cancel = () => setDrag(null);
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", cancel);
    return () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", cancel); };
  }, [drag !== null]); // eslint-disable-line react-hooks/exhaustive-deps
  const up = async (e: PointerEvent, d: Drag, p: Page) => {
    setDrag(null);
    if (Math.hypot(e.clientX - d.ox, e.clientY - d.oy) < 5) { nav(pageUrl(p)); return; } // a click opens the page
    const r = port.current!.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return; // dropped off the board
    const k = bandAt(Math.hypot(d.x - C, d.y - C));
    if (k === undefined || k === close(p)) return;
    setMoved((m) => ({ ...m, [p.rel]: k }));
    try {
      const raw = rawPageText(v, p.rel);
      if (raw === null) throw new Error("не нашёл страницу человека");
      await saveText(p.rel, setFrontmatterKeys(raw, { closeness: String(k), updated: todayStr() }));
      setErr(undefined);
      await reload();
    } catch (x) { setErr(String(x)); setMoved((m) => { const n = { ...m }; delete n[p.rel]; return n; }); }
  };

  const chip = (p: Page, at: { x: number; y: number } | undefined) => {
    const dragging = drag?.rel === p.rel;
    const pt = dragging ? drag : at;
    return (
      <button key={p.rel} className={`k-chip${pt ? " on-ring" : ""}${dragging ? " drag" : ""}`} style={pt ? { left: pt.x, top: pt.y } : undefined}
        title={[p.title, groupsOf(p).join(", "), close(p) ? `близость ${close(p)}` : "без круга"].filter(Boolean).join(" · ")}
        onPointerDown={(e) => down(e, p)}>
        {p.title}
      </button>
    );
  };

  const hover = drag ? bandAt(Math.hypot(drag.x - C, drag.y - C)) : undefined;
  const port0 = () => { const el = port.current; return el ? { w: el.clientWidth, h: el.clientHeight } : { w: 0, h: 0 }; };
  return (
    <section className="tblock k-rings">
      <h2 className="section">Круги <span className="n">{shown.length}</span> <Link to="/people" className="small muted">контактная книга</Link></h2>
      <p className="small faint">В центре — ты. Первое кольцо — близость 10, последнее — 1. Перетащи имя в другое кольцо; нажатие открывает страницу. Колесо мыши — крупнее и мельче, перетаскивание пустого места — двигать.</p>
      {groups.length > 0 && (
        <div className="row wrap filters">
          <span className="small muted">группа:</span>
          <button className={`chip link ${!group ? "on" : ""}`} onClick={() => setGroup("")}>все</button>
          {groups.map((g) => <button key={g.name} className={`chip link ${group === g.name ? "on" : ""}`} onClick={() => setGroup(group === g.name ? "" : g.name)}>{g.name} <span className="faint">{g.n}</span></button>)}
          <button className={`chip link ${group === "—" ? "on" : ""}`} onClick={() => setGroup(group === "—" ? "" : "—")}>без группы</button>
        </div>
      )}
      {err && <p className="d-warn">{err}</p>}
      <div className="k-wrap">
      <div className="k-port" ref={port} onPointerDown={panDown} onPointerMove={panMove} onPointerUp={panUp} onPointerCancel={panUp}>
        <div className="k-layer" style={{ width: SIZE, height: SIZE, transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
          <svg width={SIZE} height={SIZE} aria-hidden>
            {[...bands].reverse().map((b) => (
              <g key={b.k}>
                <circle cx={C} cy={C} r={(b.inner + b.outer) / 2} strokeWidth={b.outer - b.inner} className={`k-band${b.k % 2 ? " alt" : ""}${hover === b.k ? " hot" : ""}`} />
                <circle cx={C} cy={C} r={b.outer} className="k-ring" />
                <text x={C} y={C - b.outer + 22} className="k-n">{b.k}</text>
              </g>
            ))}
            <circle cx={C} cy={C} r={ME_R} className="k-me" />
            <text x={C} y={C + 6} className="k-me-t">Я</text>
          </svg>
          {shown.filter((p) => seats.has(p.rel) || drag?.rel === p.rel).map((p) => chip(p, seats.get(p.rel)))}
        </div>
        <div className="k-zoom" onPointerDown={(e) => e.stopPropagation()}>
          <button title="Крупнее" onClick={() => { const { w, h } = port0(); zoomAt(w / 2, h / 2, 1.25); }}>+</button>
          <button title="Мельче" onClick={() => { const { w, h } = port0(); zoomAt(w / 2, h / 2, 0.8); }}>−</button>
          <button title="Показать все круги" onClick={fit}>⤢</button>
        </div>
      </div>
      {tray.length > 0 && (
        <div className="k-tray">
          <span className="small muted">без круга · {tray.length} — перетащи в кольцо</span>
          {tray.filter((p) => drag?.rel !== p.rel).map((p) => chip(p, undefined))}
        </div>
      )}
      </div>
    </section>
  );
}
