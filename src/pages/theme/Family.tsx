import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useVault } from "../../store";
import { pageUrl } from "../../lib/vault";
import { buildFamily, ME } from "../../lib/family";
import "./Kin.css";

const GEN = ["прадеды", "деды", "родители", "ты и твоё поколение", "дети", "внуки"];
const genName = (g: number) => GEN[g + 3] ?? `поколение ${g > 0 ? "+" : ""}${g}`;

/**
 * «Родственники» (Eldar, 2026-11-08): who comes from whom. Rows are generations; a line runs from a parent
 * to a child, a double line joins a couple. The tree is drawn from `connection:` and `related:` only.
 */
export function FamilyTree() {
  const v = useVault();
  const fam = useMemo(() => buildFamily(v.pages), [v]);
  const box = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ d: string; kind: "kid" | "pair" }[]>([]);

  useLayoutEffect(() => {
    const draw = () => {
      const root = box.current;
      if (!root) return;
      const b = root.getBoundingClientRect();
      const at = (id: string) => { const el = root.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`); return el?.getBoundingClientRect(); };
      const out: { d: string; kind: "kid" | "pair" }[] = [];
      // One line a child, from the middle of its parents; each family's bar at its own height so families do not merge.
      const byChild = new Map<string, string[]>();
      for (const [p, c] of fam.edges) byChild.set(c, [...(byChild.get(c) ?? []), p]);
      const famIdx = new Map<string, number>();
      for (const [c, ps] of byChild) {
        const rs = ps.map(at).filter((r): r is DOMRect => !!r), z = at(c);
        if (!rs.length || !z) continue;
        const key = [...ps].sort().join("|");
        if (!famIdx.has(key)) famIdx.set(key, famIdx.size);
        const x1 = rs.reduce((s, r) => s + r.left + r.width / 2, 0) / rs.length - b.left;
        const y1 = Math.max(...rs.map((r) => r.bottom)) - b.top, x2 = z.left + z.width / 2 - b.left, y2 = z.top - b.top;
        const ym = y1 + (y2 - y1) * (0.25 + 0.12 * (famIdx.get(key)! % 5));
        out.push({ d: `M${x1},${y1} V${ym} H${x2} V${y2}`, kind: "kid" });
      }
      for (const [p, q] of fam.spouses) {
        const a = at(p), z = at(q);
        if (!a || !z) continue;
        const [l, r] = a.left < z.left ? [a, z] : [z, a];
        if (r.left - l.right > 40) continue; // only a couple standing side by side is joined; their children's lines show the rest
        const y = l.top + l.height / 2 - b.top;
        out.push({ d: `M${l.right - b.left},${y} H${r.left - b.left}`, kind: "pair" });
      }
      setLines(out);
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, [fam]);

  const count = fam.rows.reduce((n, r) => n + r.length, 0) - 1;
  return (
    <section className="tblock k-tree">
      <h2 className="section">Родственники <span className="n">{count}</span> <Link to="/people" className="small muted">контактная книга</Link></h2>
      <p className="small faint">Дерево строится из «кем приходится» и «свои люди» на страницах. Чтобы добавить человека в дерево — укажи на его странице, кто его отец, мать, брат или кто он тебе.</p>
      <div className="k-tree-box"><div className="k-tree-in" ref={box}>
        <svg className="k-lines" aria-hidden>{lines.map((l, i) => <path key={i} d={l.d} className={l.kind} />)}</svg>
        {fam.rows.map((row, i) => (
          <div key={i} className="k-gen">
            <span className="k-gen-n">{genName(row[0].gen)}</span>
            <div className="k-gen-row">
              {row.map((n) => n.id === ME ? (
                <span key={n.id} data-id={n.id} className="k-node me">Я</span>
              ) : (
                <Link key={n.id} data-id={n.id} to={pageUrl(n.page!)} className="k-node">
                  <b>{n.name}{n.gone && <span className="k-gone" title="нет с нами"> †</span>}</b>
                  {n.note && <span>{n.note}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div></div>
      {fam.loose.length > 0 && (
        <div className="k-loose">
          <span className="small muted">родня, чьё место в дереве не указано:</span>
          {fam.loose.map((p) => <Link key={p.rel} to={pageUrl(p)} className="chip link">{p.title}{typeof p.fm.connection === "string" && p.fm.connection ? ` · ${p.fm.connection}` : ""}</Link>)}
        </div>
      )}
    </section>
  );
}
