import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore, useVault } from "../../store";
import { pageUrl } from "../../lib/vault";
import { rawPageText } from "../../lib/rawpage";
import { setFrontmatterKeys } from "../../lib/frontmatter";
import { todayStr } from "../../lib/dates";
import { allGroups, closenessOf, groupsOf, isAuthor } from "../../lib/people";
import type { Page } from "../../lib/types";
import "./Kin.css";

/**
 * «Круги» (Eldar, 2026-11-08): he stands in the centre, the closest around him — closeness 10 the first ring,
 * 1 the last. A person is moved by dragging the name to another ring; the drop writes `closeness:`.
 * Without closeness a person waits in the tray under the rings and is dragged in from there.
 */
// Each ring is as wide as its people need (a name takes ~84 units of arc), and at least a step out from the last:
// the near rings, where most people are, get the room.
const CHIP = 84, GAP = 26, ME_R = 34, PAD = 70;
function ringRadii(counts: number[]): number[] {
  const r: number[] = new Array(11).fill(0);
  let prev = ME_R + 40;
  for (let k = 10; k >= 1; k--) { r[k] = Math.max(prev + (k === 10 ? 0 : counts[k] ? GAP : 16), (counts[k] * CHIP) / (2 * Math.PI)); prev = r[k]; }
  return r;
}

interface Drag { rel: string; x: number; y: number; ox: number; oy: number }

export function RingsBoard() {
  const v = useVault();
  const { saveText, reload } = useStore();
  const box = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [moved, setMoved] = useState<Record<string, number>>({});
  const [group, setGroup] = useState("");
  const [err, setErr] = useState<string>();
  const people = useMemo(() => v.pages.filter((p) => p.zone === "person" && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p)), [v]);
  const groups = useMemo(() => allGroups(people), [people]);
  const shown = people.filter((p) => !group || (group === "—" ? !groupsOf(p).length : groupsOf(p).includes(group)));
  const close = (p: Page) => moved[p.rel] ?? closenessOf(p);
  const RADII = useMemo(() => { const n = new Array(11).fill(0); for (const p of people) { const k = closenessOf(p); if (k) n[k]++; } return ringRadii(n); }, [people]);
  const SIZE = Math.round(2 * (RADII[1] + PAD)), C = SIZE / 2;
  const radius = (k: number) => RADII[k];
  const ringAt = (d: number) => {
    if (d > RADII[1] + GAP) return undefined;
    let best = 10;
    for (let k = 1; k <= 10; k++) if (Math.abs(d - RADII[k]) < Math.abs(d - RADII[best])) best = k;
    return best;
  };

  // Seats: each ring's people evenly round it, sorted by name; every other one a little in or out so names do not touch.
  const seats = new Map<string, { x: number; y: number; k: number }>();
  for (let k = 10; k >= 1; k--) {
    const ring = shown.filter((p) => close(p) === k).sort((a, b) => a.title.localeCompare(b.title));
    ring.forEach((p, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / ring.length + (k % 2 ? 0.18 : 0);
      const r = radius(k) + (ring.length > 6 ? (i % 2 ? 11 : -11) : 0);
      seats.set(p.rel, { x: C + r * Math.cos(a), y: C + r * Math.sin(a), k });
    });
  }
  const tray = shown.filter((p) => close(p) === undefined).sort((a, b) => a.title.localeCompare(b.title));

  const scale = () => { const b = box.current!.getBoundingClientRect(); return { b, s: SIZE / b.width }; };
  const down = (e: RPointerEvent, p: Page) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const { b, s } = scale();
    setDrag({ rel: p.rel, x: (e.clientX - b.left) * s, y: (e.clientY - b.top) * s, ox: e.clientX, oy: e.clientY });
  };
  // While a name is held, the window follows the pointer: the chip may leave the tray for the board mid-drag.
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;
  useEffect(() => {
    if (!drag) return;
    const mv = (e: PointerEvent) => { const d = dragRef.current; if (!d) return; const { b, s } = scale(); setDrag({ ...d, x: (e.clientX - b.left) * s, y: (e.clientY - b.top) * s }); };
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
    const k = ringAt(Math.hypot(d.x - C, d.y - C));
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
    const style = pt ? { left: `${(pt.x / SIZE) * 100}%`, top: `${(pt.y / SIZE) * 100}%` } : undefined;
    return (
      <button key={p.rel} className={`k-chip${at || dragging ? " on-ring" : ""}${dragging ? " drag" : ""}`} style={style}
        title={[p.title, groupsOf(p).join(", "), close(p) ? `близость ${close(p)}` : "без круга"].filter(Boolean).join(" · ")}
        onPointerDown={(e) => down(e, p)}>
        {p.title}
      </button>
    );
  };

  const hover = drag ? ringAt(Math.hypot(drag.x - C, drag.y - C)) : undefined;
  return (
    <section className="tblock k-rings">
      <h2 className="section">Круги <span className="n">{shown.length}</span> <Link to="/people" className="small muted">контактная книга</Link></h2>
      <p className="small faint">В центре — ты. Первый круг — близость 10, последний — 1. Перетащи имя на другой круг; нажатие открывает страницу.</p>
      {groups.length > 0 && (
        <div className="row wrap filters">
          <span className="small muted">группа:</span>
          <button className={`chip link ${!group ? "on" : ""}`} onClick={() => setGroup("")}>все</button>
          {groups.map((g) => <button key={g.name} className={`chip link ${group === g.name ? "on" : ""}`} onClick={() => setGroup(group === g.name ? "" : g.name)}>{g.name} <span className="faint">{g.n}</span></button>)}
          <button className={`chip link ${group === "—" ? "on" : ""}`} onClick={() => setGroup(group === "—" ? "" : "—")}>без группы</button>
        </div>
      )}
      {err && <p className="d-warn">{err}</p>}
      <div className="k-board" ref={box}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
          {Array.from({ length: 10 }, (_, i) => 10 - i).map((k) => (
            <g key={k}>
              <circle cx={C} cy={C} r={radius(k)} className={`k-ring${hover === k ? " hot" : ""}`} />
              <text x={C} y={C - radius(k) + 4} className="k-n">{k}</text>
            </g>
          ))}
          <circle cx={C} cy={C} r={ME_R} className="k-me" />
          <text x={C} y={C + 5} className="k-me-t">Я</text>
        </svg>
        {shown.filter((p) => seats.has(p.rel) || drag?.rel === p.rel).map((p) => chip(p, seats.get(p.rel)))}
      </div>
      {tray.length > 0 && (
        <div className="k-tray">
          <span className="small muted">без круга — перетащи на круг:</span>
          {tray.filter((p) => drag?.rel !== p.rel).map((p) => chip(p, undefined))}
        </div>
      )}
    </section>
  );
}
