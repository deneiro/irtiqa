import { Link } from "react-router-dom";
import { useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { useT } from "../lib/i18n";
import Markdown from "../components/Markdown";

export default function ProfilePage() {
  const v = useVault();
  const { t } = useT();
  const profile = v.pages.find((p) => p.type === "profile") ?? v.pages.find((p) => p.file === "Eldar Baurzhan");
  if (!profile) return <div className="empty">{t("profile_none")}</div>;
  const body = profile.body.replace(/^\s*# [^\n]*\n/, "");
  return (
    <div>
      <div className="eyebrow">{t("profile_eyebrow", { d: profile.updated ?? "—" })}</div>
      <h1 className="title">{profile.title}</h1>
      <p className="small muted" style={{ marginBottom: 20 }}>
        {t("profile_lede")} <Link to={pageUrl(profile)} className="hl">{t("open_as_page_plain")}</Link> {t("profile_lede2")}
      </p>
      <Markdown source={body} />
    </div>
  );
}
