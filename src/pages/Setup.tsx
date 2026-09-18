import { useNavigate } from "react-router-dom";
import { DEFAULT_ROOT, useStore } from "../store";
import { pickFolder } from "../lib/native";
import { useT } from "../lib/i18n";

export default function SetupPage() {
  const { root, setRoot, error, reload, vault } = useStore();
  const { t } = useT();
  const nav = useNavigate();

  const pick = async () => {
    const dir = await pickFolder(root);
    if (dir) {
      setRoot(dir);
      setTimeout(() => nav("/"), 0);
    }
  };

  const lede = t("setup_lede", { wiki: "§W§", log: "§L§" }).split(/§W§|§L§/);

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="eyebrow">{t("setup_eyebrow")}</div>
      <h1 className="title">{t("setup_title")}</h1>
      <p className="lede">{lede[0]}<span className="mono">wiki/</span>{lede[1]}<span className="mono">log.md</span>{lede[2]}</p>
      <div className="card" style={{ marginTop: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>{t("current_folder")}</div>
        <div className="mono" style={{ wordBreak: "break-all" }}>{root}</div>
        {error && <div style={{ color: "var(--danger)", marginTop: 10 }}>{error}</div>}
        {vault && <div className="small muted" style={{ marginTop: 10 }}>{t("setup_stats", { p: vault.pages.length, l: vault.log.length, r: vault.raw.length })} · life/: {vault.life.length}</div>}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={() => void pick()}>{t("choose_folder")}</button>
          <button className="btn" onClick={() => void reload(true)}>{t("rescan_plain")}</button>
          {root !== DEFAULT_ROOT && <button className="btn ghost" onClick={() => setRoot(DEFAULT_ROOT)}>{t("reset_icloud")}</button>}
        </div>
      </div>
    </div>
  );
}
