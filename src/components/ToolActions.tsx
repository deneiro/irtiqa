import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { launchTool, type Tool } from "../lib/tools";
import { openExternal, revealInFinder } from "../lib/native";
import { pageUrl } from "../lib/vault";

/** Buttons for one tool: start it, open its web app, show its folder. */
export default function ToolActions({ tool, withPage }: { tool: Tool; withPage?: boolean }) {
  const { root } = useStore();
  const [err, setErr] = useState("");

  const run = async (f: () => Promise<void>) => {
    setErr("");
    try {
      await f();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <div className="row wrap" style={{ gap: 8 }}>
        {tool.launch && (
          <button className="btn" onClick={() => void run(() => launchTool(root, tool))} title={tool.launch}>▶ Запустить</button>
        )}
        {tool.url && (
          <button className={tool.launch ? "btn ghost" : "btn"} onClick={() => void run(() => openExternal(tool.url!))} title={tool.url}>↗ Открыть</button>
        )}
        {tool.folder && (
          <button className="btn ghost" onClick={() => void run(() => revealInFinder(tool.folder!))} title={tool.folder}>Папка</button>
        )}
        {withPage && <Link to={pageUrl(tool.page)} className="btn ghost">Страница</Link>}
      </div>
      {err && <div className="small" style={{ color: "var(--danger)", marginTop: 6 }}>{err}</div>}
    </div>
  );
}
