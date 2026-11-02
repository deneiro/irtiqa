import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * One way back, everywhere. Inside a project or a page the sidebar only offers
 * top-level destinations, so without this the way out of a deep page is
 * guesswork. ⌘[ works too.
 */
export default function Back() {
  const nav = useNavigate();
  const loc = useLocation();
  const canGoBack = loc.key !== "default";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "[") { e.preventDefault(); nav(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);

  if (!canGoBack || loc.pathname === "/") return null;
  return (
    <div className="backbar">
      <button className="btn small ghost" onClick={() => nav(-1)} title="Назад (⌘[)">← назад</button>
    </div>
  );
}
