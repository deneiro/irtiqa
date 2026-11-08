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
  if (/^(отец|мать|папа|мама|отчим|мачех)/.test(w)) return "parent";
  if (/^(сын|дочь|дочка)/.test(w)) return "child";
  if (/^(брат|сестр)/.test(w)) return "sibling";
  if (/^(муж|жена|супруг)/.test(w)) return "spouse";
  return undefined;
}

const SHIFT: Record<Kind, number> = { parent: -1, child: 1, sibling: 0, cousin: 0, spouse: 0, uncle: -1, nephew: 1, grand: -2, grandchild: 2 };

export interface FNode { id: string; page?: Page; name: string; gen: number; note?: string }
export interface Family {
  rows: FNode[][];               // by generation, oldest first, each row in drawing order
  edges: [string, string][];     // parent → child
  spouses: [string, string][];
  loose: Page[];                 // family or relatives whose place the words do not give
}

const isPerson = (p: Page) => p.zone === "person" && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p);

export function buildFamily(pages: Page[]): Family {
  const people = pages.filter(isPerson);
  const byName = new Map<string, Page>();
  for (const p of people) for (const n of [p.title, p.file, ...p.aliases]) byName.set(n.toLowerCase(), p);
  const id = (p: Page) => p.rel;

  // Facts: a → b with kind (b is <kind> of a).
  const facts: { a: string; b: string; kind: Kind; side?: string }[] = [];
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
      if (other && rk && other !== p) facts.push({ a: id(p), b: id(other), kind: rk });
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

  const nodes = new Map<string, FNode>();
  nodes.set(ME, { id: ME, name: "Я", gen: 0 });
  for (const p of people) if (gen.has(id(p))) nodes.set(id(p), { id: id(p), page: p, name: p.title, gen: gen.get(id(p))!, note: typeof p.fm.connection === "string" ? p.fm.connection : undefined });

  const edges: [string, string][] = [];
  for (const [c, ps] of parents) for (const p of ps) if (nodes.has(c) && nodes.has(p) && nodes.get(p)!.gen < nodes.get(c)!.gen) edges.push([p, c]);

  // Rows, ordered: parents' barycentre, else the side's parent, else spouse or sibling, else last.
  const gens = [...new Set([...nodes.values()].map((n) => n.gen))].sort((a, b) => a - b);
  const pos = new Map<string, number>();
  const rows: FNode[][] = [];
  const meIdx = gens.indexOf(0);
  const order = (row: FNode[], ref: (n: FNode) => number | undefined) => {
    const keyed = row.filter((n) => !near.has(n.id)).map((n, i) => ({ n, k: ref(n) ?? 1000 + i }));
    keyed.sort((a, b) => a.k - b.k || a.n.name.localeCompare(b.n.name));
    const out = keyed.map((x) => x.n);
    // An uncle or aunt stands by the parent of their side: the father's people on his left, the mother's on her right.
    for (const n of row.filter((x) => near.has(x.id))) {
      const i = out.findIndex((x) => x.id === near.get(n.id));
      const left = !/матер|мам/.test(n.note ?? "");
      if (i < 0) out.push(n); else out.splice(left ? i : i + 1, 0, n);
    }
    out.forEach((x, i) => pos.set(x.id, i));
    return out;
  };
  const avg = (xs: (number | undefined)[]) => { const v = xs.filter((x): x is number => x !== undefined); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined; };
  const childrenOf = (n: string) => edges.filter((e) => e[0] === n).map((e) => e[1]);
  const partner = (n: string) => spouses.flatMap(([a, b]) => (a === n ? [b] : b === n ? [a] : []));
  // First the oldest rows from their children (bottom-up seeds), then everyone top-down.
  for (const g of gens) rows.push([...nodes.values()].filter((n) => n.gen === g));
  for (let pass = 0; pass < 2; pass++) {
    for (let i = meIdx; i >= 0; i--) rows[i] = order(rows[i], (n) => {
      if (n.id === ME) return 0;
      const viaKids = avg(childrenOf(n.id).map((c) => pos.get(c)));
      return viaKids ?? avg(partner(n.id).map((p) => pos.get(p)).map((x) => (x === undefined ? undefined : x + 0.3)));
    });
    for (let i = 0; i < rows.length; i++) rows[i] = order(rows[i], (n) => {
      const ps = [...(parents.get(n.id) ?? [])].filter((p) => nodes.has(p));
      const v = avg(ps.map((p) => pos.get(p)));
      if (v !== undefined) return v + (n.id === ME ? -0.01 : 0);
      return avg([...partner(n.id), ...sibs.flatMap(([a, b]) => (a === n.id ? [b] : b === n.id ? [a] : []))].map((p) => pos.get(p)).map((x) => (x === undefined ? undefined : x + 0.3))) ?? pos.get(n.id);
    });
  }

  const loose = people.filter((p) => !nodes.has(id(p)) && (categoryOf(p) === "семья" || categoryOf(p) === "родня")).sort((a, b) => a.title.localeCompare(b.title));
  return { rows, edges, spouses: spouses.filter(([a, b]) => nodes.has(a) && nodes.has(b)), loose };
}
