import { useMemo } from "react";
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

export default function Markdown({ source, compact = false }: { source: string; compact?: boolean }) {
  const vault = useVault();
  const text = useMemo(() => preprocess(source), [source]);

  return (
    <div className={`md ${compact ? "compact" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
