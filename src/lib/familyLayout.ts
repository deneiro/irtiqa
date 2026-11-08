/**
 * «Родственники» as a real tree (Eldar, 2026-11-08: «объемнее… как реальное дерево — назад идти, вперёд идти»).
 * Every top couple is the root of its own tree; the father's lineage stands left, the mother's right, apart.
 * A couple hangs under the husband's parents; the wife who has parents in the tree stays in her own family's
 * tree too, and beside her husband she is a «ghost» card joined to her home card by a dashed line.
 * Children stand under their parents in order of age, each subtree as wide as it needs — nothing is squeezed.
 */
import { ME, type Family, type FNode } from "./family";

export const CARD_W = 156, CARD_H = 58, GAP_X = 26, STEP_Y = 170, TREE_GAP = 220;

export interface Card { id: string; node: FNode; x: number; y: number; ghost?: boolean }
export interface Line { d: string; kind: "kid" | "pair" | "ghost" }
export interface Layout { cards: Card[]; lines: Line[]; width: number; height: number; gens: { gen: number; y: number }[]; left: FNode[] }

export function layoutFamily(f: Family): Layout {
  const { nodes, edges, spouses, rank, husbands, sibs } = f;
  const kidsOf = new Map<string, string[]>();
  const parentsOf = new Map<string, string[]>();
  for (const [p, c] of edges) { kidsOf.set(p, [...(kidsOf.get(p) ?? []), c]); parentsOf.set(c, [...(parentsOf.get(c) ?? []), p]); }
  const hasParents = (n: string) => (parentsOf.get(n)?.length ?? 0) > 0;
  const partners = (n: string) => spouses.flatMap(([a, b]) => (a === n ? [b] : b === n ? [a] : []));
  const ownerOf = (a: string, b: string) =>
    husbands.has(a) ? a : husbands.has(b) ? b : hasParents(a) && !hasParents(b) ? a : hasParents(b) && !hasParents(a) ? b : a < b ? a : b;
  const ownedSpouses = (n: string) => partners(n).filter((s) => ownerOf(n, s) === n);
  const isGuest = (n: string) => partners(n).some((s) => ownerOf(n, s) === s); // shown beside a partner who owns the couple
  // In-laws with no parents in the tree stand beside the sibling who married in (Мадина's brothers by Мадина).
  const inlawsOf = (n: string) => sibs.flatMap(([a, b]) => (a === n ? [b] : b === n ? [a] : [])).filter((x) => !hasParents(x) && !partners(x).length && x !== ME);
  const attached = new Set<string>();

  const unitOf = (n: string): { id: string; ghost: boolean }[] => {
    const out = [{ id: n, ghost: false }];
    for (const s of ownedSpouses(n)) {
      out.push({ id: s, ghost: hasParents(s) });
      if (!hasParents(s)) for (const l of inlawsOf(s)) if (!attached.has(l)) { attached.add(l); out.push({ id: l, ghost: false }); }
    }
    return out;
  };
  const byAge = (a: string, b: string) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99) || nodes.get(a)!.name.localeCompare(nodes.get(b)!.name);
  const claimed = new Set<string>();
  const childrenOf = (unit: { id: string }[]) => {
    const ks = [...new Set(unit.flatMap((u) => kidsOf.get(u.id) ?? []))].filter((k) => !claimed.has(k)).sort(byAge);
    ks.forEach((k) => claimed.add(k));
    return ks;
  };

  interface T { id: string; unit: { id: string; ghost: boolean }[]; kids: T[]; w: number }
  const build = (n: string): T => {
    const unit = unitOf(n);
    const kids = childrenOf(unit).map(build);
    const unitW = unit.length * CARD_W + (unit.length - 1) * GAP_X;
    const kidsW = kids.reduce((s, k) => s + k.w, 0) + Math.max(0, kids.length - 1) * GAP_X;
    return { id: n, unit, kids, w: Math.max(unitW, kidsW) };
  };

  const sideKey = (n: FNode) => { const c = n.note ?? ""; return /мамы|матери|по маме/.test(c) ? 10 : /отца|по отцу/.test(c) ? 0 : 5; };
  const rootIds = [...nodes.keys()].filter((n) => !hasParents(n) && !isGuest(n) && n !== ME);
  const preTrees: string[] = rootIds.sort((a, b) => sideKey(nodes.get(a)!) - sideKey(nodes.get(b)!) || byAge(a, b));
  const trees: T[] = [];
  for (const r of preTrees) { if (attached.has(r) || claimed.has(r)) continue; trees.push(build(r)); }

  const minGen = Math.min(...[...nodes.values()].map((n) => n.gen));
  const yOf = (id: string) => (nodes.get(id)!.gen - minGen) * STEP_Y;
  const cards: Card[] = [];
  const lines: Line[] = [];
  const at = new Map<string, Card>();
  const ghosts: Card[] = [];

  const place = (t: T, left: number) => {
    const kidsW = t.kids.reduce((s, k) => s + k.w, 0) + Math.max(0, t.kids.length - 1) * GAP_X;
    let x = left + (t.w - kidsW) / 2;
    const kidCards: Card[] = [];
    for (const k of t.kids) { place(k, x); kidCards.push(at.get(k.id)!); x += k.w + GAP_X; }
    const unitW = t.unit.length * CARD_W + (t.unit.length - 1) * GAP_X;
    // The owner stands over the middle of the children when there are any, the rest of the unit to his right.
    const centre = kidCards.length ? (kidCards[0].x + kidCards[kidCards.length - 1].x + CARD_W) / 2 : left + t.w / 2;
    let ux = Math.max(left, Math.min(left + t.w - unitW, centre - (t.unit.length > 1 ? CARD_W + GAP_X / 2 : CARD_W / 2)));
    const y = yOf(t.id);
    for (const u of t.unit) {
      const c: Card = { id: u.id, node: nodes.get(u.id)!, x: ux, y, ghost: u.ghost };
      cards.push(c);
      if (u.ghost) ghosts.push(c); else at.set(u.id, c);
      ux += CARD_W + GAP_X;
    }
    const owner = cards.find((c) => c.id === t.id && !c.ghost)!;
    for (const c of cards.slice(cards.length - t.unit.length + 1)) {
      if (partners(t.id).includes(c.id)) lines.push({ d: `M${owner.x + CARD_W},${y + CARD_H / 2} H${c.x}`, kind: "pair" });
    }
    if (kidCards.length) {
      // From the middle of the couple (or the owner alone) down to a bar, then to each child.
      const mate = cards.slice(cards.length - t.unit.length).find((c) => c.id !== t.id && partners(t.id).includes(c.id));
      const x0 = mate ? (owner.x + CARD_W + mate.x) / 2 : owner.x + CARD_W / 2;
      const yBar = y + CARD_H + (STEP_Y - CARD_H) / 2;
      lines.push({ d: `M${x0},${y + CARD_H / 2} V${yBar}`, kind: "kid" });
      const xs = kidCards.map((k) => k.x + CARD_W / 2);
      lines.push({ d: `M${Math.min(x0, ...xs)},${yBar} H${Math.max(x0, ...xs)}`, kind: "kid" });
      for (const k of kidCards) lines.push({ d: `M${k.x + CARD_W / 2},${yBar} V${k.y}`, kind: "kid" });
    }
  };
  let left = 0;
  for (const t of trees) { place(t, left); left += t.w + TREE_GAP; }
  // A ghost and her home card: a dashed curve between them.
  for (const g of ghosts) {
    const h = at.get(g.id);
    if (!h) continue;
    const x1 = g.x + CARD_W / 2, y1 = g.y, x2 = h.x + CARD_W / 2, y2 = h.y;
    const top = Math.min(y1, y2) - STEP_Y * 0.45;
    lines.push({ d: `M${x1},${y1} C${x1},${top} ${x2},${top} ${x2},${y2}`, kind: "ghost" });
  }
  const gens = [...new Set([...nodes.values()].map((n) => n.gen))].sort((a, b) => a - b).map((gen) => ({ gen, y: (gen - minGen) * STEP_Y }));
  const placed = new Set(cards.map((c) => c.id));
  return {
    cards, lines, gens,
    width: Math.max(0, left - TREE_GAP),
    height: (gens.length ? gens[gens.length - 1].y : 0) + CARD_H,
    left: [...nodes.values()].filter((n) => !placed.has(n.id)),
  };
}
