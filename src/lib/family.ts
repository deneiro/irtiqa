/**
 * «Родственники» (Eldar, 2026-11-08): a family tree from what the person pages already hold —
 * `connection:` says what the person is to him («отец», «дядя (брат отца)»), `related:` says
 * who belongs to them («отец: [[Ерлан]]», «брат: [[Нурислам]]»). Nothing is guessed beyond the
 * words: a relative whose place the words do not give stays in the list under the tree.
 */
import type { Page } from "./types";
import { categoryOf, isAuthor, relationsOf } from "./people";

export const ME = "__me";

type Kind = "parent" | "child" | "sibling" | "cousin" | "spouse" | "uncle" | "nephew" | "grand" | "grandchild";

/** What a role word says: the named person is <kind> of the page holding it. */
export function kindOf(word: string): Kind | undefined {
  const w = word.toLowerCase().replace(/ё/g, "е");
  // «братишка», «сестрёнка», «братан» — his words for cousins: same generation, not the same parents.
  if (/^(двоюродн|троюродн|братишк|сестренк|братан)/.test(w)) return "cousin";
  if (/(дедушк|бабушк|^дед|^ата\b|^аже\b)/.test(w)) return "grand";
  if (/(внук|внучк)/.test(w)) return "grandchild";
  if (/(дяд|тет|^ага\b|^апа\b)/.test(w)) return "uncle";
  if (/племян/.test(w)) return "nephew";
  if (/^(отец|мать|папа|мама|отчим|мачех|родител)/.test(w)) return "parent";
  // «ребёнок» when the words do not say son or daughter — the tree needs no guess at that.
  if (/^(сын|дочь|дочка|ребенок|дети)/.test(w)) return "child";
  if (/^(брат|сестр)/.test(w)) return "sibling";
  if (/^(муж|жена|супруг)/.test(w)) return "spouse";
  return undefined;
}

const SHIFT: Record<Kind, number> = { parent: -1, child: 1, sibling: 0, cousin: 0, spouse: 0, uncle: -1, nephew: 1, grand: -2, grandchild: 2 };

export interface FNode { id: string; page?: Page; name: string; gen: number; note?: string; gone?: boolean }
export interface Family {
  rows: FNode[][];               // by generation, oldest first, each row in drawing order
  edges: [string, string][];     // parent → child
  spouses: [string, string][];
  loose: Page[];                 // family or relatives whose place the words do not give
  nodes: Map<string, FNode>;
  rank: Map<string, number>;      // a child's place among its siblings, by age
  husbands: Set<string>;
  sibs: [string, string][];
}

/** `deceased: true` — someone no longer with him; the tree keeps them, the rings do not. */
export const isGone = (p: Page) => p.fm.deceased === true || String(p.fm.deceased) === "true";

const isPerson = (p: Page) => p.zone === "person" && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p);

export function buildFamily(pages: Page[]): Family {
  const people = pages.filter(isPerson);
  const byName = new Map<string, Page>();
  for (const p of people) for (const n of [p.title, p.file, ...p.aliases]) byName.set(n.toLowerCase(), p);
  const id = (p: Page) => p.rel;

  // Facts: a → b with kind (b is <kind> of a).
  const facts: { a: string; b: string; kind: Kind; side?: string; word?: string }[] = [];
  for (const p of people) {
    const conn = typeof p.fm.connection === "string" ? p.fm.connection : "";
    const k = kindOf(conn);
    if (k) {
      // «дядя (брат отца)» names the side; the reverse of «он мой дядя» is «я его племянник».
      const side = /отца|по отцу/.test(conn) ? "отец" : /матери|по матери|мамы/.test(conn) ? "мать" : undefined;
      facts.push({ a: ME, b: id(p), kind: k, side });
    }
    for (const r of relationsOf(p)) {
      const other = byName.get(r.name.toLowerCase());
      const rk = kindOf(r.role);
      if (other && rk && other !== p) facts.push({ a: id(p), b: id(other), kind: rk, word: r.role.toLowerCase() });
    }
  }

  // Generations: ME is 0; every fact fixes b relative to a (or a relative to b).
  const gen = new Map<string, number>([[ME, 0]]);
  for (let pass = 0; pass < 8; pass++) {
    for (const f of facts) {
      const s = SHIFT[f.kind];
      if (gen.has(f.a) && !gen.has(f.b)) gen.set(f.b, gen.get(f.a)! + s);
      else if (gen.has(f.b) && !gen.has(f.a)) gen.set(f.a, gen.get(f.b)! - s);
    }
  }

  // Parent edges: explicit parent/child facts, then siblings share their parents.
  const parents = new Map<string, Set<string>>();
  const addParent = (child: string, parent: string) => { if (!parents.has(child)) parents.set(child, new Set()); parents.get(child)!.add(parent); };
  const sibs: [string, string][] = [];
  const spouses: [string, string][] = [];
  const near = new Map<string, string>(); // an uncle sits next to the parent of his side
  for (const f of facts) {
    if (f.kind === "parent") addParent(f.a, f.b);
    else if (f.kind === "child") addParent(f.b, f.a);
    else if (f.kind === "sibling") sibs.push([f.a, f.b]);
    else if (f.kind === "spouse") spouses.push([f.a, f.b]);
    else if (f.kind === "uncle" && f.a === ME && f.side) {
      const p = facts.find((x) => x.a === ME && x.kind === "parent" && (f.side === "отец" ? /^(отец|папа)/ : /^(мать|мама)/).test(String(people.find((q) => id(q) === x.b)?.fm.connection ?? "")));
      if (p) near.set(f.b, p.b);
    }
  }
  // Spouses are both parents of each other's children.
  for (const [a, b] of spouses) for (const [c, ps] of parents) { if (ps.has(a)) addParent(c, b); if (ps.has(b)) addParent(c, a); }
  for (let pass = 0; pass < 3; pass++) for (const [a, b] of sibs) {
    for (const p of parents.get(a) ?? []) addParent(b, p);
    for (const p of parents.get(b) ?? []) addParent(a, p);
  }

  // The order he named children in on the parent's page is their order by age.
  const rank = new Map<string, number>();
  for (const f of facts) if (f.kind === "child") { const r = facts.filter((x) => x.a === f.a && x.kind === "child").indexOf(f); if (!rank.has(f.b)) rank.set(f.b, r); }
  rank.set(ME, -1); // he is the eldest of his parents' children
  // An uncle stands by the parent of his side only while the tree does not know his own parents.
  for (const k of [...near.keys()]) if (parents.get(k)?.size) near.delete(k);

  const nodes = new Map<string, FNode>();
  nodes.set(ME, { id: ME, name: "Я", gen: 0 });
  for (const p of people) if (gen.has(id(p))) nodes.set(id(p), { id: id(p), page: p, name: p.title, gen: gen.get(id(p))!, note: typeof p.fm.connection === "string" ? p.fm.connection : undefined, gone: isGone(p) });

  const edges: [string, string][] = [];
  for (const [c, ps] of parents) for (const p of ps) if (nodes.has(c) && nodes.has(p) && nodes.get(p)!.gen < nodes.get(c)!.gen) edges.push([p, c]);

  // Rows, ordered: parents' barycentre, else the side's parent, else spouse or sibling, else last.
  const gens = [...new Set([...nodes.values()].map((n) => n.gen))].sort((a, b) => a - b);
  const pos = new Map<string, number>();
  const rows: FNode[][] = [];
  // Who stands beside whom when the tree does not know a person's parents: a spouse by the partner (a wife to
  // the right of her husband), a brother by his sibling, an uncle by the parent of his side.
  const husbands = new Set(facts.filter((f) => f.kind === "spouse" && /^муж/.test(f.word ?? "")).map((f) => f.b).concat(facts.filter((f) => f.kind === "spouse" && /^жена/.test(f.word ?? "")).map((f) => f.a)));
  const anchor = (n: string): { to: string; left: boolean } | undefined => {
    if (parents.get(n)?.size) return undefined;
    const sp = spouses.flatMap(([a, b]) => (a === n ? [b] : b === n ? [a] : [])).find((p) => parents.get(p)?.size);
    if (sp) return { to: sp, left: false };
    const nb = near.get(n);
    if (nb) return { to: nb, left: !/матер|мам/.test(nodes.get(n)?.note ?? "") };
    const sb = sibs.flatMap(([a, b]) => (a === n ? [b] : b === n ? [a] : []))[0];
    if (sb) return { to: sb, left: false };
    // A couple neither of whom has parents in the tree (grandparents): the wife stands right of the husband.
    const sp2 = spouses.flatMap(([a, b]) => (a === n ? [b] : b === n ? [a] : []))[0];
    if (!sp2 || n === ME) return undefined;
    return husbands.has(sp2) || (!husbands.has(n) && n > sp2) ? { to: sp2, left: false } : undefined;
  };
  const order = (row: FNode[], ref: (n: FNode) => number | undefined) => {
    const ids = new Set(row.map((n) => n.id));
    const tied = row.filter((n) => { const a = anchor(n.id); return a && ids.has(a.to); });
    const keyed = row.filter((n) => !tied.includes(n)).map((n, i) => ({ n, k: ref(n) ?? 1000 + i }));
    keyed.sort((a, b) => a.k - b.k || (rank.get(a.n.id) ?? 99) - (rank.get(b.n.id) ?? 99) || a.n.name.localeCompare(b.n.name));
    const out = keyed.map((x) => x.n);
    // Place the tied ones once their anchor is placed; a chain (a wife, then her brothers) settles in a few rounds.
    let left = [...tied];
    for (let round = 0; left.length && round < 6; round++) {
      left = left.filter((n) => {
        const a = anchor(n.id)!;
        let i = out.findIndex((x) => x.id === a.to);
        if (i < 0) return true;
        if (!a.left) while (i + 1 < out.length && anchor(out[i + 1].id)?.to === a.to) i++; // after those already beside it
        out.splice(a.left ? i : i + 1, 0, n);
        return false;
      });
    }
    out.push(...left);
    out.forEach((x, i) => pos.set(x.id, i));
    return out;
  };
  // Top-down, once: the oldest row by side — the father's people left, the mother's right; every next row under
  // its parents, children in the order of their age, spouses and in-laws beside the one they came through.
  const sideKey = (n: FNode) => { const c = n.note ?? ""; return /мамы|матери|по маме/.test(c) ? 10 : /отца|по отцу/.test(c) ? 0 : 5; };
  for (const g of gens) rows.push([...nodes.values()].filter((n) => n.gen === g));
  for (let i = 0; i < rows.length; i++) rows[i] = order(rows[i], (n) => {
    if (i === 0) return sideKey(n);
    const ps = [...(parents.get(n.id) ?? [])].map((p) => pos.get(p)).filter((x): x is number => x !== undefined);
    return ps.length ? Math.min(...ps) : undefined;
  });
  const loose = people.filter((p) => !nodes.has(id(p)) && (categoryOf(p) === "семья" || categoryOf(p) === "родня")).sort((a, b) => a.title.localeCompare(b.title));
  return { rows, edges, spouses: spouses.filter(([a, b]) => nodes.has(a) && nodes.has(b)), loose, nodes, rank, husbands, sibs: sibs.filter(([a, b]) => nodes.has(a) && nodes.has(b)) };
}
