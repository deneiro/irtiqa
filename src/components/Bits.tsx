import { Link } from "react-router-dom";
import type { Page } from "../lib/types";
import { themeColor } from "../lib/themes";
import { pageUrl } from "../lib/vault";
import { useT } from "../lib/i18n";

export function PageItem({ page, sub, meta }: { page: Page; sub?: string; meta?: string }) {
  const { zone, themeLabel, relDate } = useT();
  const where = sub ?? [page.project ?? (page.theme ? themeLabel(page.theme) : undefined), page.zone !== "other" ? zone(page.zone) : page.type].filter(Boolean).join(" · ");
  return (
    <Link to={pageUrl(page)} className="pitem" style={{ ["--c" as string]: themeColor(page.theme) }}>
      <span className="bar" />
      <span style={{ minWidth: 0 }}>
        <div className="t">{page.title}</div>
        <div className="sub">{where}</div>
      </span>
      <span className="meta">{page.fm.read ? "✓ " : ""}{meta ?? relDate(page.updated)}</span>
    </Link>
  );
}

export function PageList({ pages, empty }: { pages: Page[]; empty?: string }) {
  const { t } = useT();
  if (!pages.length) return <div className="empty">{empty ?? t("nothing_here")}</div>;
  return (
    <div className="plist">
      {pages.map((p) => (
        <PageItem key={p.rel} page={p} />
      ))}
    </div>
  );
}

export function Stat({ n, l }: { n: string | number; l: string }) {
  return (
    <div className="stat">
      <span className="n">{n}</span>
      <span className="l">{l}</span>
    </div>
  );
}

export function TagChips({ tags, onClick }: { tags: string[]; onClick?: (t: string) => void }) {
  if (!tags.length) return null;
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {tags.map((t) =>
        onClick ? (
          <button key={t} className="chip tag link" onClick={() => onClick(t)}>{t}</button>
        ) : (
          <Link key={t} className="chip tag link" to={`/search?q=${encodeURIComponent("#" + t)}`}>{t}</Link>
        ),
      )}
    </div>
  );
}

export function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      {label && <div className="muted" style={{ marginBottom: 4 }}>{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="row" style={{ gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <span>{p.name}</span>
          <b style={{ marginLeft: "auto", fontFamily: "var(--font-mono)" }}>{p.value}</b>
        </div>
      ))}
    </div>
  );
}
