import { Link } from "react-router-dom";
import { useStore } from "../store";
import { pageUrl } from "../lib/vault";

/** A `source:` value ("[[Page]]" or plain text) as a link into the vault when it resolves. */
export default function SourceLink({ source }: { source: string | undefined }) {
  const { vault } = useStore();
  if (!source) return null;
  const m = source.match(/^\[\[([^\]|#]+)(?:\|([^\]]*))?\]\]$/);
  const target = m ? m[1] : source;
  const label = m?.[2] || target;
  const page = vault?.resolve(target);
  return page ? <Link className="srclink" to={pageUrl(page)}>{label}</Link> : <span className="srclink dead" title="страница не найдена">{label}</span>;
}
