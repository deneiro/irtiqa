import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { attention, type AttentionKind } from "../lib/attention";
import "./NeedsYou.css";

const ICON: Record<AttentionKind, string> = { health: "✚", birthday: "🎂", people: "☎", money: "₸", quest: "◆" };
const SHOWN = 5;

/**
 * The top of the Day screen: what needs Eldar today, from every theme at once.
 * Everything here already lives somewhere in the vault; this is the one place
 * that gathers it, so nothing has to be remembered to be looked at.
 */
export default function NeedsYou({ today }: { today: string }) {
  const { life, vault } = useStore();
  const [all, setAll] = useState(false);
  const items = useMemo(() => {
    if (!life || !vault) return [];
    return attention(life, vault.pages.filter((p) => p.zone === "person"), today);
  }, [life, vault, today]);
  if (!items.length) return null;
  const shown = all ? items : items.slice(0, SHOWN);
  return (
    <div className="card needs">
      <h3>Требует тебя <span className="n">{items.length}</span></h3>
      {shown.map((a, i) => (
        <Link key={i} to={a.to} className={`need ${a.urgency >= 80 ? "hot" : ""}`}>
          <span className="ic">{ICON[a.kind]}</span>
          <span className="t">{a.text}</span>
        </Link>
      ))}
      {items.length > SHOWN && (
        <button className="linkbtn small muted" onClick={() => setAll(!all)}>
          {all ? "свернуть" : `ещё ${items.length - SHOWN}`}
        </button>
      )}
    </div>
  );
}
