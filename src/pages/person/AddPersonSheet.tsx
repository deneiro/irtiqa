import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, useVault } from "../../store";
import { THEMES } from "../../lib/themes";
import { useT } from "../../lib/i18n";
import { todayStr } from "../../lib/dates";
import { safeFilename } from "../../lib/life";
import { PERSON_CATEGORIES, newPersonPage } from "../../lib/people";
import "./Person.css";

const SOCIAL = "Social & friends";

/**
 * «+ Добавить человека» (spec v5), on every person page and on «Люди»: the
 * name, «кем приходится», the closeness, how they met and the theme. It
 * writes `wiki/People/<Имя>.md` (`newPersonPage`) and opens the new page,
 * almost empty: the rest comes from the questionnaire or from Claude.
 */
export default function AddPersonSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const vault = useVault();
  const { saveText, reload } = useStore();
  const { themeLabel } = useT();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [close, setClose] = useState(0);
  const [how, setHow] = useState("");
  const [theme, setTheme] = useState(SOCIAL);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setName(""); setCategory(""); setClose(0); setHow(""); setTheme(SOCIAL); setErr(null);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const create = async () => {
    if (busy || !name.trim()) return;
    setBusy(true);
    try {
      const p = newPersonPage({ name, category: category || undefined, closeness: close || undefined, how, theme }, todayStr(), vault.pages.map((x) => x.rel));
      await saveText(p.rel, p.content);
      await reload();
      onClose();
      nav(`/page/${encodeURIComponent(p.rel)}`);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };

  return (
    <dialog ref={ref} className="p-sheet" aria-labelledby="p-add-h" onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <form className="p-sh" onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <div className="p-sh-top"><span className="p-label" id="p-add-h">Новый человек</span><button className="p-xb" type="button" aria-label="Закрыть" onClick={onClose}>×</button></div>
        <label className="p-fld"><span>Имя</span><input className="p-inp" autoFocus autoComplete="off" spellCheck={false} placeholder="как ты зовёшь" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <div className="p-fld">
          <span>Кем приходится</span>
          <div className="p-chips">
            {PERSON_CATEGORIES.map((c) => <button key={c} type="button" className="p-tg" aria-pressed={category === c} onClick={() => setCategory(category === c ? "" : c)}>{c}</button>)}
          </div>
        </div>
        <div className="p-fld">
          <span>Близость</span>
          <div className="p-chips">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <button key={n} type="button" className="p-tg p-tg-n" aria-pressed={close === n} onClick={() => setClose(close === n ? 0 : n)}>{n}</button>)}
          </div>
        </div>
        <label className="p-fld"><span>Как познакомились</span><input className="p-inp" autoComplete="off" spellCheck={false} placeholder="где, когда, через кого — одной строкой" value={how} onChange={(e) => setHow(e.target.value)} /></label>
        <label className="p-fld">
          <span>Тема</span>
          <select className="p-inp" value={theme} onChange={(e) => setTheme(e.target.value)}>
            {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
          </select>
        </label>
        <div className="p-sh-acts">
          <button className="p-btn p-primary" type="submit" disabled={busy || !name.trim()}>{busy ? "Создаю…" : "Создать"}</button>
          <button className="p-btn p-ghost" type="button" onClick={onClose}>отмена</button>
        </div>
        {err && <p className="p-sh-err">{err}</p>}
        <div className="p-sh-foot">→ <b>wiki/People/{safeFilename(name.replace(/\s+/g, " ").trim()) || "…"}.md</b> · откроется новая страница — почти пустая<br />характер, влияние и радикалы — потом: опросник о человеке или со слов Claude</div>
      </form>
    </dialog>
  );
}
