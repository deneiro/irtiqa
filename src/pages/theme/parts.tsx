import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { addDays } from "../../lib/dates";
import type { Cell } from "../../lib/dashboard";
import { openExternal } from "../../lib/native";
import type { ColumnPart, NumberGroup, RadarCard } from "../../lib/overview";
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

/** Thirty days on a thread, oldest left: sage held or done, ember a fall or a miss, pale no mark, a speck no day file. */
export function Beads({ cells, from }: { cells: Cell[]; from: string }) {
  return (
    <div className="t-beads" role="img" aria-label={`30 дней с ${shortDate(from)}`}>
      {cells.map((c, i) => <i key={i} className={`t-bd t-bd-${BEAD[c]}`} title={`${shortDate(addDays(from, i))} — ${BEAD_WORD[BEAD[c]]}`} />)}
    </div>
  );
}

export function TileView({ tile, from, vow }: { tile: Tile; from: string; vow: boolean }) {
  const cls = ["t-nt", tile.value === "—" ? "t-nt-none" : "", tile.warn ? "t-nt-warn" : "", tile.unknown ? "t-nt-unknown" : ""].filter(Boolean).join(" ");
  const chip = tile.chip === "hot" ? <Status tone="ember">горит</Status> : tile.chip === "behind" ? <Status tone="honey">отстаёт</Status> : null;
  const value = <><div className="t-nt-v">{tile.value}{tile.unit && <small>{tile.unit}</small>}</div>{tile.sub && <div className="t-nt-s">{tile.sub}</div>}</>;
  // A group of series tiles only (the mockup's vows) has the long label under the number; any other tile has it on top.
  if (vow) {
    return (
      <div className={cls}>
        {value}
        <div className="t-nt-vw">{tile.label}</div>
        {tile.beads && <Beads cells={tile.beads} from={from} />}
        <div className="t-nt-c">{tile.note}</div>
      </div>
    );
  }
  return (
    <div className={cls}>
      <div className="t-nt-k"><span className="t-label">{tile.label}</span>{chip}</div>
      {value}
      {tile.beads && <Beads cells={tile.beads} from={from} />}
      <div className="t-nt-c">{tile.note}</div>
    </div>
  );
}

/** The `## Цифры` groups; under a group with beads, the one line that says what a bead is. */
export function NumberGroups({ groups, tiles, today }: { groups: NumberGroup[]; tiles: Tile[][]; today: string }) {
  const { from, to } = tileWindow(today);
  return (
    <>
      {groups.map((g, i) => (
        <section key={i} className="t-group">
          {(g.title || g.caption) && (
            <div className="t-sec-h">{g.title && <span className="t-label">{g.title}</span>}{g.caption && <span className="t-q"><Inline md={g.caption} /></span>}</div>
          )}
          <div className="t-ntiles" style={{ ["--n" as string]: Math.min(4, tiles[i]?.length ?? 1) }}>
            {(tiles[i] ?? []).map((t, j) => <TileView key={j} tile={t} from={from} vow={(tiles[i] ?? []).every((x) => x.beads)} />)}
          </div>
          {(tiles[i] ?? []).some((t) => t.beads) && (
            <div className="t-legend">
              <span>бусина — день · {shortDate(from)} → {shortDate(to)}</span>
              <span><i className="t-bd t-bd-h" />держался · сделал</span>
              <span><i className="t-bd t-bd-f" />срыв · пропуск</span>
              <span><i className="t-bd t-bd-u" />без отметки</span>
              <span><i className="t-bd t-bd-n" />нет файла дня</span>
            </div>
          )}
        </section>
      ))}
    </>
  );
}

function Step({ kind, title, parts }: { kind: "past" | "now" | "next"; title: string; parts: ColumnPart[] }) {
  const shown = parts;
  return (
    <div className={`t-step t-${kind}`}>
      <h3>{title}</h3>
      {shown.map((p, i) => (
        <div key={i} className="t-part">
          {p.suffix && <div className="t-label t-suffix">{p.suffix}</div>}
          <ul>
            {p.items.length ? p.items.map((it, j) => (
              <li key={j}><Inline md={it.md} />{it.note && <span className="t-w">{it.note}</span>}</li>
            )) : <li className="t-none">—</li>}
          </ul>
          {p.caption && <div className="t-src"><Inline md={p.caption} /></div>}
        </div>
      ))}
    </div>
  );
}

/** «Где был · Где стою · Куда иду»: one phrase a line; in a narrow window one column in the same order. */
export function Columns({ past, stand, next }: { past: ColumnPart[]; stand: ColumnPart[]; next: ColumnPart[] }) {
  if (!past.length && !stand.length && !next.length) return null; // nothing picked from the bank: nothing shown, not a made-up line
  return (
    <div className="t-ascent">
      <Step kind="past" title="Где был" parts={past} />
      <Step kind="now" title="Где стою" parts={stand} />
      <Step kind="next" title="Куда иду" parts={next} />
    </div>
  );
}

/** An organ's card: a mono title, a pale right side, the body, and «все →» to its full screen. */
export function Organ({ title, right, more, wide, children }: { title: string; right?: ReactNode; more?: string; wide?: boolean; children: ReactNode }) {
  return (
    <section className={`t-card${wide ? " t-wide" : ""}`}>
      <h2><span>{title}</span><span className="t-r">{right}</span>{more && <Link className="t-more" to={more}>все →</Link>}</h2>
      {children}
    </section>
  );
}

/** An organ with nothing to show: one line and the way to its full screen. */
export function OrganEmpty({ title, more }: { title: string; more?: string }) {
  return (
    <section className="t-card t-card-empty">
      <span>{title} — данных нет</span>{more && <Link className="t-more" to={more}>все →</Link>}
    </section>
  );
}

/** «На радаре» as cards: the mark, the bold title, the line. */
export function Radar({ cards }: { cards: RadarCard[] }) {
  if (!cards.length) return null;
  return (
    <>
      <div className="t-rule"><span className="t-label">На радаре</span></div>
      <div className="t-radar">
        {cards.map((c, i) => (
          <div key={i} className="t-blip">
            {c.kind && <span className="t-blip-k"><i />{c.kind}</span>}
            {c.title && <b><Inline md={c.title} /></b>}
            {c.text && <p><Inline md={c.text} /></p>}
          </div>
        ))}
      </div>
    </>
  );
}

export interface PageButton { key: string; label: string; value?: string; of?: string; sub?: string; to: string }

/** «Страницы»: the keys without an organ, each a card with its name and one number. */
export function PagesRow({ buttons }: { buttons: PageButton[] }) {
  if (!buttons.length) return null;
  return (
    <>
      <div className="t-rule"><span className="t-label">Страницы</span></div>
      <div className="t-pages">
        {buttons.map((b) => (
          <Link key={b.key} className="t-pg" to={b.to}>
            <b>{b.label}</b>
            <span className="t-pg-v">
              {b.value !== undefined && <strong>{b.value}{b.of && <small> {b.of}</small>}</strong>}
              {b.sub && <span className="t-pg-sub">{b.sub}</span>}
            </span>
            <span className="t-pg-go">открыть →</span>
          </Link>
        ))}
      </div>
    </>
  );
}

/** The overview still names activities that are closed: one pale line. */
export function StaleLine({ stale }: { stale: StaleMention[] }) {
  if (!stale.length) return null;
  const names = stale.map((m) => m.quest.title).join(", ");
  return <p className="t-stale">Обзор отстал: пишет {stale.length === 1 ? "о закрытой деятельности" : "о закрытых деятельностях"} — {names}. Попроси Claude обновить обзор.</p>;
}
