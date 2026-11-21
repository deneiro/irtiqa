import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { addDays } from "../../lib/dates";
import type { Cell } from "../../lib/dashboard";
import { openExternal } from "../../lib/native";
import type { NumberGroup, RadarCard } from "../../lib/overview";
import type { StaleMention } from "../../lib/stale";
import { shortDate, tileWindow, type Tile } from "../../lib/themeNumbers";
import { pageUrl } from "../../lib/vault";
import { useVault } from "../../store";

/** The theme colour at a low alpha, for the glow behind the title and the dot. */
export function glowOf(hex: string, alpha = 0.08): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export const partUrl = (theme: string, key: string) => `/theme/${encodeURIComponent(theme)}/${encodeURIComponent(key)}`;

const PHRASE = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\\?\|([^\]]+))?\]\]|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|\[([^\]]+)\]\((https?:[^)\s]+)\)|`([^`]+)`/g;

/** One phrase of the overview: a wikilink opens its page, **bold** and *italic* stay, a [text](url) opens outside; nothing else of markdown. */
export function Inline({ md }: { md: string }) {
  const v = useVault();
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of md.matchAll(PHRASE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(md.slice(last, i));
    if (m[1] !== undefined) {
      const label = m[2]?.trim() || m[1].trim().split("/").pop()!;
      const page = v.resolve(m[1]);
      out.push(page ? <Link key={i} to={pageUrl(page)}>{label}</Link> : <span key={i}>{label}</span>);
    } else if (m[3] !== undefined) out.push(<b key={i}>{m[3]}</b>);
    else if (m[4] !== undefined) out.push(<i key={i}>{m[4]}</i>);
    else if (m[5] !== undefined) {
      const url = m[6];
      out.push(<a key={i} href={url} onClick={(e) => { e.preventDefault(); void openExternal(url); }}>{m[5]}</a>);
    } else out.push(m[7]);
    last = i + m[0].length;
  }
  if (last < md.length) out.push(md.slice(last));
  return <>{out}</>;
}

/** A mark as a dot and a word. */
export const Status = ({ tone, children }: { tone: "sage" | "honey" | "ember" | "smoke"; children: ReactNode }) => <span className={`t-st t-${tone}`}>{children}</span>;

const BEAD: Record<Cell, string> = { done: "h", late: "h", held: "h", failed: "f", fall: "f", unmarked: "u", pending: "u", nofile: "n", skip: "s", future: "s" };
const BEAD_WORD: Record<string, string> = { h: "сделал или держался", f: "срыв или пропуск", u: "без отметки", n: "нет файла дня", s: "не положено" };

/** Thirty days as a row of small squares, oldest left: sage held or done, ember a fall or a miss, pale no mark, a speck no day file. */
export function Beads({ cells, from }: { cells: Cell[]; from: string }) {
  return (
    <div className="g-beads" role="img" aria-label={`30 дней с ${shortDate(from)}`}>
      {cells.map((c, i) => <i key={i} className={BEAD[c]} title={`${shortDate(addDays(from, i))} — ${BEAD_WORD[BEAD[c]]}`} />)}
    </div>
  );
}

/** One number of the overview's `## Цифры`: the number large, his label, the beads of a series, the line under it. */
export function TileView({ tile, from, vow }: { tile: Tile; from: string; vow: boolean }) {
  const cls = ["g-ntile", vow ? "vow" : "", tile.value === "—" ? "none" : "", tile.warn ? "warn" : "", tile.unknown ? "unknown" : ""].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <div className="k"><span>{tile.label}</span>{tile.chip === "hot" ? <Status tone="ember">горит</Status> : tile.chip === "behind" ? <Status tone="honey">отстаёт</Status> : null}</div>
      <div className="v"><b>{tile.value}</b>{tile.unit && <small>{tile.unit}</small>}{tile.sub && <span>{tile.sub}</span>}</div>
      {tile.beads && <Beads cells={tile.beads} from={from} />}
      <div className="n">{tile.note}</div>
    </div>
  );
}

/** The `## Цифры` groups, each a block; under a group with beads, the one line that says what a bead is. */
export function NumberGroups({ groups, tiles, today }: { groups: NumberGroup[]; tiles: Tile[][]; today: string }) {
  const { from, to } = tileWindow(today);
  return (
    <>
      {groups.map((g, i) => {
        const ts = tiles[i] ?? [];
        if (!ts.length) return null;
        const beads = ts.some((t) => t.beads);
        return (
          <section key={i} className="g-block g-numbers">
            <h2>{g.title || "Цифры"}{beads && <span>бусина — день · {shortDate(from)} → {shortDate(to)}</span>}</h2>
            {g.caption && <p className="g-quote"><Inline md={g.caption} /></p>}
            <div className="g-ntiles" style={{ ["--n" as string]: Math.min(4, ts.length) }}>
              {ts.map((t, j) => <TileView key={j} tile={t} from={from} vow={ts.every((x) => x.beads)} />)}
            </div>
            {beads && (
              <div className="g-beadkey">
                <span><i className="h" />держался · сделал</span><span><i className="f" />срыв · пропуск</span><span><i className="u" />без отметки</span><span><i className="n" />нет файла дня</span>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}

/** A section of the theme: a block with its name, a pale right side and «все →» to its full screen. */
export function Organ({ title, right, more, wide, children }: { title: string; right?: ReactNode; more?: string; wide?: boolean; children: ReactNode }) {
  return (
    <section className={`g-block g-organ${wide ? " wide" : ""}`}>
      <h2>{title}<span>{right}{more && <Link className="g-more" to={more}>все →</Link>}</span></h2>
      {children}
    </section>
  );
}

/** A section with nothing to show: one line and the way to its full screen. */
export function OrganEmpty({ title, more }: { title: string; more?: string }) {
  return (
    <section className="g-block g-organ empty">
      <h2>{title}<span>данных нет{more && <Link className="g-more" to={more}>открыть →</Link>}</span></h2>
    </section>
  );
}

/** «На радаре» as cards: the kind as a mark, the bold title, the line. */
export function Radar({ cards }: { cards: RadarCard[] }) {
  if (!cards.length) return null;
  return (
    <section className="g-block">
      <h2>На радаре<span>{cards.length} — что держать в поле зрения</span></h2>
      <div className="g-radar-cards">
        {cards.map((c, i) => (
          <div key={i}>
            {c.kind && <em>{c.kind}</em>}
            {c.title && <b><Inline md={c.title} /></b>}
            {c.text && <p><Inline md={c.text} /></p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export interface PageButton { key: string; label: string; value?: string; of?: string; sub?: string; to: string }

/** «Страницы»: the keys without a section of their own, each a card with its name and one number. */
export function PagesRow({ buttons }: { buttons: PageButton[] }) {
  if (!buttons.length) return null;
  return (
    <section className="g-block">
      <h2>Страницы<span>что ещё лежит в теме</span></h2>
      <div className="g-pgs">
        {buttons.map((b) => (
          <Link key={b.key} to={b.to}>
            <span>{b.label}</span>
            <b>{b.value ?? "→"}{b.of && <small> {b.of}</small>}</b>
            <small>{b.sub ?? "открыть"}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** The overview still names activities that are closed: one line. */
export function StaleLine({ stale }: { stale: StaleMention[] }) {
  if (!stale.length) return null;
  const names = stale.map((m) => m.quest.title).join(", ");
  return <p className="g-warn">Обзор отстал: пишет {stale.length === 1 ? "о закрытой деятельности" : "о закрытых деятельностях"} — {names}. Попроси Claude обновить обзор.</p>;
}
