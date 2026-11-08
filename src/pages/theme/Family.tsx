import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useVault } from "../../store";
import { pageUrl } from "../../lib/vault";
import { buildFamily, ME } from "../../lib/family";
import { CARD_H, CARD_W, layoutFamily } from "../../lib/familyLayout";
import "./Kin.css";

const GEN = ["прадеды", "деды", "родители", "ты и твоё поколение", "дети", "внуки"];
const genName = (g: number) => GEN[g + 3] ?? `поколение ${g > 0 ? "+" : ""}${g}`;
const PAD = 120, LABEL = 150;

/**
 * «Родственники» (Eldar, 2026-11-08): the family as a tree on a field — the father's lineage and the mother's
 * apart, every generation on its own level, children under their parents by age. The wheel zooms, dragging the
 * field moves it; «к себе» comes back to «Я». Mother beside father is a pale copy, joined by a dashed line to her
 * card in her own family. Someone no longer living carries «марқұм».
 */
export function FamilyTree() {
  const v = useVault();
  const nav = useNavigate();
  const fam = useMemo(() => buildFamily(v.pages), [v]);
  const L = useMemo(() => layoutFamily(fam), [fam]);
  const W = L.width + PAD * 2 + LABEL, H = L.height + PAD * 2;
  const ox = PAD + LABEL, oy = PAD; // where the tree's (0,0) is in the field
  const port = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ s: 0.8, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;

  const me = L.cards.find((c) => c.id === ME);
  const toMe = useCallback((s = 0.85) => {
    const el = port.current;
    if (!el || !me) return;
    setView({ s, x: el.clientWidth / 2 - (ox + me.x + CARD_W / 2) * s, y: el.clientHeight * 0.62 - (oy + me.y) * s });
  }, [me?.x, me?.y, ox, oy]); // eslint-disable-line react-hooks/exhaustive-deps
  const fitAll = () => {
    const el = port.current;
    if (!el) return;
    const s = Math.min(el.clientWidth / W, el.clientHeight / H);
    setView({ s, x: (el.clientWidth - W * s) / 2, y: (el.clientHeight - H * s) / 2 });
  };
  useLayoutEffect(() => { toMe(); }, [toMe]);

  const zoomAt = (px: number, py: number, f: number) => setView((o) => {
    const s = Math.min(2.5, Math.max(0.08, o.s * f));
    const k = s / o.s;
    return { s, x: px - (px - o.x) * k, y: py - (py - o.y) * k };
  });
  useEffect(() => {
    const el = port.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); const r = el.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))); };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  const pan = useRef<{ cx: number; cy: number; x: number; y: number; moved: boolean } | null>(null);
  const down = (e: RPointerEvent) => {
    if (e.button !== 0 || (e.target as Element).closest(".k-zoom")) return;
    pan.current = { cx: e.clientX, cy: e.clientY, x: viewRef.current.x, y: viewRef.current.y, moved: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const move = (e: RPointerEvent) => {
    const p = pan.current;
    if (!p) return;
    if (Math.hypot(e.clientX - p.cx, e.clientY - p.cy) > 4) p.moved = true;
    setView((o) => ({ ...o, x: p.x + e.clientX - p.cx, y: p.y + e.clientY - p.cy }));
  };
  // A click (no drag) on a card opens the person; dragging anywhere moves the field.
  const up = (e: RPointerEvent) => {
    const p = pan.current;
    pan.current = null;
    if (p && !p.moved) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const card = el?.closest<HTMLElement>("[data-rel]");
      if (card?.dataset.rel) nav(`/page/${encodeURIComponent(card.dataset.rel)}`);
    }
  };

  const count = L.cards.filter((c) => !c.ghost).length - 1;
  const centre = () => { const el = port.current; return el ? { w: el.clientWidth, h: el.clientHeight } : { w: 0, h: 0 }; };
  return (
    <section className="tblock k-tree">
      <h2 className="section">Родственники <span className="n">{count}</span> <Link to="/people" className="small muted">контактная книга</Link></h2>
      <p className="small faint">Слева — родня отца, справа — родня мамы. Колесо мыши — крупнее и мельче, перетаскивание — двигать, нажатие на карточку — открыть человека. Чтобы добавить человека в дерево — укажи на странице, кто его отец, мать или кто он тебе.</p>
      <div className="k-port k-tree-port" ref={port} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { pan.current = null; }}>
        <div className="k-layer" style={{ width: W, height: H, transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
          {L.gens.map((g) => (
            <div key={g.gen} className="k-genband" style={{ top: oy + g.y - 30, height: CARD_H + 60, width: W }}>
              <span className="k-gen-n">{genName(g.gen)}</span>
            </div>
          ))}
          <svg className="k-lines" width={W} height={H} aria-hidden>
            <g transform={`translate(${ox},${oy})`}>{L.lines.map((l, i) => <path key={i} d={l.d} className={l.kind} />)}</g>
          </svg>
          {L.cards.map((c) => {
            const n = c.node;
            const style = { left: ox + c.x, top: oy + c.y, width: CARD_W, height: CARD_H };
            if (c.id === ME) return <div key="me" className="k-node me" style={style}>Я</div>;
            return (
              <div key={`${c.id}${c.ghost ? "~" : ""}`} data-rel={n.page!.rel} className={`k-node${c.ghost ? " ghost" : ""}${n.gone ? " gone" : ""}`} style={style} title={n.note}>
                <b>{n.name}</b>
                <span>{c.ghost ? "своя семья — по пунктиру" : n.gone ? `марқұм · ${n.note ?? ""}` : n.note}</span>
              </div>
            );
          })}
        </div>
        <div className="k-zoom" onPointerDown={(e) => e.stopPropagation()}>
          <button title="Крупнее" onClick={() => { const { w, h } = centre(); zoomAt(w / 2, h / 2, 1.25); }}>+</button>
          <button title="Мельче" onClick={() => { const { w, h } = centre(); zoomAt(w / 2, h / 2, 0.8); }}>−</button>
          <button title="К себе" onClick={() => toMe()}>Я</button>
          <button title="Всё дерево" onClick={fitAll}>⤢</button>
        </div>
      </div>
      {fam.loose.length > 0 && (
        <div className="k-loose">
          <span className="small muted">родня, чьё место в дереве не указано:</span>
          {fam.loose.map((p) => <Link key={p.rel} to={pageUrl(p)} className="chip link">{p.title}{typeof p.fm.connection === "string" && p.fm.connection ? ` · ${p.fm.connection}` : ""}</Link>)}
        </div>
      )}
    </section>
  );
}
