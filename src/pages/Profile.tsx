import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { useT } from "../lib/i18n";
import Markdown from "../components/Markdown";
import { profileSections, subSection } from "../lib/profile";

export default function ProfilePage() {
  const v = useVault();
  const { t, relDate } = useT();
  const { section } = useParams();
  const profile = v.pages.find((p) => p.type === "profile") ?? v.pages.find((p) => p.file === "Eldar Baurzhan");
  const parsed = useMemo(() => (profile ? profileSections(profile.body) : { intro: "", sections: [] }), [profile]);
  if (!profile) return <div className="empty">{t("profile_none")}</div>;

  const goals = parsed.sections.find((s) => s.heading === "Goals");
  const frogs = goals ? subSection(goals.md, /лягушк/i) : undefined;
  const goals2026 = goals ? subSection(goals.md, /Цели 2026/i) : undefined;

  if (section) {
    const i = parsed.sections.findIndex((s) => s.slug === section);
    const cur = parsed.sections[i];
    if (!cur) return <div className="empty">Раздела нет. <Link to="/profile">К профилю</Link>.</div>;
    const prev = parsed.sections[i - 1];
    const next = parsed.sections[i + 1];
    return (
      <div>
        <div className="eyebrow"><Link to="/profile" className="muted">Профиль</Link> / {cur.label}</div>
        <h1 className="title">{cur.icon} {cur.heading}</h1>
        <div className="row wrap" style={{ gap: 8, margin: "10px 0 18px" }}>
          {cur.live && <Link to={cur.live.to} className="btn primary">{cur.live.label} →</Link>}
          <Link to={pageUrl(profile)} className="btn ghost">открыть весь профиль как страницу</Link>
        </div>
        <div className="pagecols">
          <Markdown source={cur.md} />
          <aside className="aside">
            <h4>Разделы</h4>
            <ul>
              {parsed.sections.map((s) => <li key={s.slug}><Link to={`/profile/${s.slug}`} className={s.slug === cur.slug ? "hl" : ""}>{s.icon} {s.label}</Link></li>)}
            </ul>
          </aside>
        </div>
        <div className="row spread" style={{ marginTop: 24 }}>
          {prev ? <Link to={`/profile/${prev.slug}`} className="btn ghost">← {prev.label}</Link> : <span />}
          {next ? <Link to={`/profile/${next.slug}`} className="btn ghost">{next.label} →</Link> : <span />}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="eyebrow">{t("profile_eyebrow", { d: profile.updated ?? "—" })}</div>
      <h1 className="title">{profile.title}</h1>
      {parsed.intro && <div className="lede"><Markdown source={parsed.intro} compact /></div>}
      <p className="small muted" style={{ marginTop: 6 }}>
        Хаб профиля: каждая карточка ведёт в раздел и в тот экран, где эта часть жизни живёт. Обновлён {relDate(profile.updated)} · <Link to={pageUrl(profile)} className="hl">как страница</Link>
      </p>

      {(frogs || goals2026) && (
        <div className="grid cols-2" style={{ marginTop: 18 }}>
          {frogs && <div className="card"><h3>🐸 Ближайшие лягушки</h3><Markdown source={frogs} compact /></div>}
          {goals2026 && <div className="card"><h3>🎯 Цели 2026</h3><Markdown source={goals2026} compact /></div>}
        </div>
      )}

      <div className="hub-grid">
        {parsed.sections.map((s) => (
          <div key={s.slug} className="card hub-card">
            <Link to={`/profile/${s.slug}`} className="hub-main">
              <div className="hub-title"><span className="hub-icon">{s.icon}</span><b>{s.label}</b><span className="small faint">{s.words} слов</span></div>
              <div className="hub-excerpt">{s.excerpt}</div>
            </Link>
            {s.live && <Link to={s.live.to} className="hub-live">{s.live.label} →</Link>}
          </div>
        ))}
      </div>
    </div>
  );
}
