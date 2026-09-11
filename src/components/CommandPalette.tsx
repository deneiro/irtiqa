import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { themeColor } from "../lib/themes";
import { pageUrl } from "../lib/vault";
import { useT } from "../lib/i18n";
import type { Page } from "../lib/types";

export default function CommandPalette() {
  const { paletteOpen, setPaletteOpen, vault, index } = useStore();
  const { t, zone, themeLabel } = useT();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  useEffect(() => {
    if (paletteOpen) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [paletteOpen]);

  const results: Page[] = useMemo(() => {
    if (!vault || !index) return [];
    const query = q.trim();
    if (!query) {
      return [...vault.pages].sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? "")).slice(0, 12);
    }
    if (query.startsWith("#")) {
      const tag = query.slice(1).toLowerCase();
      return vault.pages.filter((p) => p.tags.some((x) => x.toLowerCase().includes(tag))).slice(0, 30);
    }
    return index.search(query).slice(0, 30).map((r) => vault.byRel.get(r.id)!).filter(Boolean);
  }, [q, vault, index]);

  useEffect(() => setSel(0), [results]);

  if (!paletteOpen || !vault) return null;

  const go = (p: Page) => {
    setPaletteOpen(false);
    nav(pageUrl(p));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setPaletteOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === "Enter") {
      if (e.metaKey || e.ctrlKey || !results.length) { setPaletteOpen(false); nav(`/search?q=${encodeURIComponent(q)}`); }
      else if (results[sel]) go(results[sel]);
    }
  };

  return (
    <div className="overlay" onMouseDown={() => setPaletteOpen(false)}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("pal_placeholder")} spellCheck={false} />
        <div className="results">
          {!q && <div className="eyebrow" style={{ padding: "6px 12px" }}>{t("recently_updated")}</div>}
          {results.map((p, i) => (
            <div
              key={p.rel}
              className={`res ${i === sel ? "sel" : ""}`}
              style={{ ["--c" as string]: themeColor(p.theme) }}
              onMouseEnter={() => setSel(i)}
              onClick={() => go(p)}
            >
              <span className="bar" />
              <span style={{ minWidth: 0 }}>
                <div className="t">{p.title}</div>
                <div className="sub">
                  {[p.project ?? (p.theme ? themeLabel(p.theme) : undefined), zone(p.zone)].filter(Boolean).join(" · ")}
                  {p.tags.length ? ` · #${p.tags.slice(0, 3).join(" #")}` : ""}
                </div>
              </span>
              <span className="mono faint">{p.updated ?? ""}</span>
            </div>
          ))}
          {q && !results.length && <div className="empty" style={{ margin: 8 }}>{t("pal_none", { q })}</div>}
        </div>
        <div className="hint">
          <span><kbd>↑↓</kbd> {t("pal_move")}</span>
          <span><kbd>↵</kbd> {t("pal_open")}</span>
          <span><kbd>⌘↵</kbd> {t("pal_full")}</span>
          <span><kbd>esc</kbd> {t("pal_close")}</span>
        </div>
      </div>
    </div>
  );
}
