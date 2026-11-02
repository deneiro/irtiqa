import { Fragment, type ReactNode, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { openExternal } from "../lib/native";
import { useVault } from "../store";
import { pageUrl } from "../lib/vault";

const WL = /(!?)\[\[([^\]|#]+?)\\?(#[^\]|]*)?(?:\\?\|([^\]]*))?\]\]/g;

/** Rewrite Obsidian syntax into markdown links with a wiki: scheme. */
function preprocess(src: string): string {
  let out = src.replace(WL, (_m, bang: string, target: string, _hash: string | undefined, alias: string | undefined) => {
    const label = alias?.trim() || target.trim().split("/").pop() || target;
    const href = `wiki:${encodeURIComponent(target.trim())}`;
    return bang ? `*[embed: ${label}](${href})*` : `[${label}](${href})`;
  });
  // Obsidian callouts: "> [!note] Title" → keep as blockquote with bold title.
  out = out.replace(/^> \[!(\w+)\]([+-]?)\s*(.*)$/gm, (_m, kind: string, _f, title: string) => `> **${title || kind}**`);
  // Highlights ==text== → <mark> is not in gfm; approximate with bold.
  out = out.replace(/==([^=\n]+)==/g, "**$1**");
  return out;
}

/**
 * Arabic runs get their own span so the Quran is legible: the vault stores
 * Arabic inline with Russian, and at body size the script is unreadable.
 */
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s\u064B-\u065F\u0670]*/g;
function arabify(node: ReactNode): ReactNode {
  if (typeof node === "string") {
    if (!ARABIC.test(node)) return node;
    ARABIC.lastIndex = 0;
    const out: ReactNode[] = [];
    let last = 0;
    for (const m of node.matchAll(ARABIC)) {
      const i = m.index ?? 0;
      if (i > last) out.push(node.slice(last, i));
      out.push(<span className="ar" dir="rtl" key={i}>{m[0].trimEnd()}</span>);
      last = i + m[0].length;
      if (m[0] !== m[0].trimEnd()) out.push(m[0].slice(m[0].trimEnd().length));
    }
    if (last < node.length) out.push(node.slice(last));
    return out.map((x, i) => <Fragment key={i}>{x}</Fragment>);
  }
  if (Array.isArray(node)) return node.map((x, i) => <Fragment key={i}>{arabify(x)}</Fragment>);
  return node;
}

export default function Markdown({ source, compact = false }: { source: string; compact?: boolean }) {
  const vault = useVault();
  const text = useMemo(() => preprocess(source), [source]);

  return (
    <div className={`md ${compact ? "compact" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{arabify(children)}</p>,
          li: ({ children }) => <li>{arabify(children)}</li>,
          td: ({ children }) => <td>{arabify(children)}</td>,
          strong: ({ children }) => <strong>{arabify(children)}</strong>,
          a: ({ href, children }) => {
            if (href?.startsWith("wiki:")) {
              const target = decodeURIComponent(href.slice(5));
              const page = vault.resolve(target);
              if (page) return <Link className="wl" to={pageUrl(page)}>{children}</Link>;
              return <span className="dead" title={`No page found for [[${target}]]`}>{children}</span>;
            }
            if (href && /^https?:/.test(href)) {
              return (
                <a href={href} onClick={(e) => { e.preventDefault(); void openExternal(href); }} title={href}>
                  {children}
                </a>
              );
            }
            return <span>{children}</span>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
