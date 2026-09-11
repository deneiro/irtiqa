import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useVault } from "../store";
import { FAMILY_COLORS, opFamily } from "../lib/log";
import { useT, type Key } from "../lib/i18n";
import Markdown from "../components/Markdown";

const FAMILIES = ["ingest", "build", "revise", "think", "audit", "other"];

export default function LogPage() {
  const v = useVault();
  const loc = useLocation();
  const { t, monthLabel } = useT();
  const [fams, setFams] = useState<Set<string>>(new Set(FAMILIES));
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    const id = loc.hash.slice(1);
    if (id) {
      setOpen((s) => new Set(s).add(id));
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "center" }), 50);
    }
  }, [loc.hash]);

  const entries = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return [...v.log]
      .reverse()
      .filter((e) => fams.has(opFamily(e.op)))
      .filter((e) => !ql || e.subject.toLowerCase().includes(ql) || e.op.includes(ql) || e.body.toLowerCase().includes(ql));
  }, [v.log, fams, q]);

  const byMonth = useMemo(() => {
    const m = new Map<string, typeof entries>();
    for (const e of entries) {
      const k = e.date.slice(0, 7);
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return [...m.entries()];
  }, [entries]);

  const famCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of v.log) c[opFamily(e.op)] = (c[opFamily(e.op)] ?? 0) + 1;
    return c;
  }, [v.log]);

  const toggle = (f: string) =>
    setFams((s) => {
      const n = new Set(s);
      if (n.has(f) && n.size === 1) return new Set(FAMILIES);
      if (n.has(f)) n.delete(f); else n.add(f);
      return n;
    });

  return (
    <div>
      <div className="eyebrow">{t("log_eyebrow")}</div>
      <h1 className="title">{t("log_title")}</h1>
      <p className="lede">{t("log_lede")}</p>

      <div className="row wrap" style={{ margin: "18px 0 10px", gap: 8 }}>
        {FAMILIES.map((f) => (
          <button
            key={f}
            className={`chip link ${fams.has(f) ? "c" : ""}`}
            style={{ ["--c" as string]: FAMILY_COLORS[f], opacity: fams.has(f) ? 1 : 0.5 }}
            onClick={() => toggle(f)}
          >
            {t(`fam_${f}` as Key)} <span style={{ opacity: 0.7 }}>{famCounts[f] ?? 0}</span>
          </button>
        ))}
        <span className="grow" />
        <input className="text" placeholder={t("log_filter")} value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 240 }} />
      </div>
      <div className="small faint" style={{ marginBottom: 6 }}>{t("log_legend")}</div>

      <div className="ledger">
        {byMonth.map(([month, es]) => (
          <div key={month}>
            <div className="month">{monthLabel(month)} <span className="mono faint" style={{ fontSize: 12, marginLeft: 8 }}>{es.length}</span></div>
            {es.map((e) => {
              const isOpen = open.has(e.id);
              const fam = opFamily(e.op);
              return (
                <div key={e.id} id={e.id} className="entry" style={{ ["--c" as string]: FAMILY_COLORS[fam] }}>
                  <div className="d">{e.date.slice(5)}</div>
                  <div className="tick"><i /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="head" onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n; })}>
                      <span className="op">{e.op}</span>
                      <span className="s">{e.subject || <span className="muted">{t("no_subject")}</span>}</span>
                    </div>
                    {!isOpen && e.body && <div className="preview">{e.body.replace(/[#*_`>\[\]-]/g, " ").replace(/\s+/g, " ").trim()}</div>}
                    {isOpen && <div className="body"><Markdown source={e.body || t("empty_entry")} compact /></div>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {!entries.length && <div className="empty">{t("log_none")}</div>}
      </div>
    </div>
  );
}
