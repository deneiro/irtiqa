import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useVault } from "../store";
import { THEMES, themeColor } from "../lib/themes";
import { daysSince, pageUrl } from "../lib/vault";
import { FAMILY_COLORS, opFamily } from "../lib/log";
import { useT, type Key } from "../lib/i18n";
import { ChartTip, PageList, Stat } from "../components/Bits";

const axis = { stroke: "var(--faint)", fontSize: 11, fontFamily: "var(--font-mono)" };

function weekKey(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

export default function ChartsPage() {
  const v = useVault();
  const { t, themeShort } = useT();

  const perTheme = useMemo(
    () =>
      THEMES.map((th) => {
        const ps = v.pages.filter((p) => p.theme === th.name);
        return {
          name: themeShort(th.name, th.short),
          color: th.color,
          resource: ps.filter((p) => p.zone === "resource").length,
          wiki: ps.filter((p) => p.zone === "wiki").length,
          other: ps.filter((p) => !["resource", "wiki"].includes(p.zone)).length,
        };
      }),
    [v, themeShort],
  );

  const activity = useMemo(() => {
    const m = new Map<string, Record<string, number>>();
    for (const e of v.log) {
      const k = weekKey(e.date);
      const row = m.get(k) ?? {};
      const f = opFamily(e.op);
      row[f] = (row[f] ?? 0) + 1;
      m.set(k, row);
    }
    const keys = [...m.keys()].sort();
    if (!keys.length) return [];
    const out: Record<string, number | string>[] = [];
    const cur = new Date(keys[0] + "T00:00:00Z");
    const end = new Date();
    while (cur <= end) {
      const k = cur.toISOString().slice(0, 10);
      out.push({ week: k.slice(5), ...(m.get(k) ?? {}) });
      cur.setUTCDate(cur.getUTCDate() + 7);
    }
    return out;
  }, [v.log]);

  const pagesCreated = useMemo(() => {
    const m = new Map<string, Record<string, number>>();
    for (const p of v.pages) {
      if (!p.created || !p.theme) continue;
      const k = p.created.slice(0, 7);
      const row = m.get(k) ?? {};
      row[p.theme] = (row[p.theme] ?? 0) + 1;
      m.set(k, row);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, row]) => ({ month, ...row }));
  }, [v.pages]);

  const staleness = useMemo(() => {
    const buckets = (
      [
        ["d_le7", 7],
        ["d_30", 30],
        ["d_90", 90],
        ["d_180", 180],
        ["d_gt180", Infinity],
      ] as [Key, number][]
    ).map(([k, max]) => ({ label: t(k), max, n: 0 }));
    let unknown = 0;
    for (const p of v.pages) {
      const d = daysSince(p.updated);
      if (d === undefined) { unknown++; continue; }
      buckets.find((b) => d <= b.max)!.n++;
    }
    return { buckets, unknown };
  }, [v.pages, t]);

  const orphans = useMemo(
    () => v.pages.filter((p) => p.zone === "wiki" && !(v.backlinks.get(p.rel)?.length)).sort((a, b) => a.title.localeCompare(b.title)),
    [v],
  );
  const deadByTarget = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of v.deadLinks) m.set(d.target, (m.get(d.target) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  }, [v]);
  const untraced = useMemo(() => v.pages.filter((p) => p.zone === "resource" && !p.sourceUrl && !p.sources.length), [v]);
  const ratio = useMemo(() => {
    const r = v.pages.filter((p) => p.zone === "resource").length;
    const w = v.pages.filter((p) => p.zone === "wiki").length;
    return r ? (w / r).toFixed(2) : "—";
  }, [v]);

  return (
    <div>
      <div className="eyebrow">{t("ch_eyebrow")}</div>
      <h1 className="title">{t("ch_title")}</h1>
      <p className="lede">{t("ch_lede")}</p>

      <div className="grid cols-4" style={{ marginTop: 20 }}>
        <div className="card"><Stat n={ratio} l={t("ch_ratio")} /></div>
        <div className="card"><Stat n={orphans.length} l={t("ch_orphans")} /></div>
        <div className="card"><Stat n={v.deadLinks.length} l={t("ch_dead")} /></div>
        <div className="card"><Stat n={untraced.length} l={t("ch_untraced")} /></div>
      </div>

      <h2 className="section">{t("ch_per_theme")}</h2>
      <div className="card chart tall">
        <ResponsiveContainer>
          <BarChart data={perTheme} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--hair)" vertical={false} />
            <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTip />} cursor={{ fill: "var(--raised)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="resource" name={t("tab_resource")} stackId="a">
              {perTheme.map((x) => <Cell key={x.name} fill={x.color} />)}
            </Bar>
            <Bar dataKey="wiki" name={t("tab_wiki")} stackId="a">
              {perTheme.map((x) => <Cell key={x.name} fill={x.color} fillOpacity={0.55} />)}
            </Bar>
            <Bar dataKey="other" name={t("ch_other")} stackId="a" radius={[3, 3, 0, 0]}>
              {perTheme.map((x) => <Cell key={x.name} fill={x.color} fillOpacity={0.25} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h2 className="section">{t("ch_activity")}</h2>
      <div className="card chart">
        <ResponsiveContainer>
          <AreaChart data={activity} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--hair)" vertical={false} />
            <XAxis dataKey="week" tick={axis} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {Object.keys(FAMILY_COLORS).map((f) => (
              <Area key={f} type="monotone" dataKey={f} name={t(`fam_${f}` as Key)} stackId="1" stroke={FAMILY_COLORS[f]} fill={FAMILY_COLORS[f]} fillOpacity={0.5} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid cols-2">
        <div>
          <h2 className="section">{t("ch_created")}</h2>
          <div className="card chart">
            <ResponsiveContainer>
              <BarChart data={pagesCreated} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="var(--hair)" vertical={false} />
                <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
                <YAxis tick={axis} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "var(--raised)" }} />
                {THEMES.map((th) => (
                  <Bar key={th.name} dataKey={th.name} name={themeShort(th.name, th.short)} stackId="a" fill={th.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h2 className="section">{t("ch_stale")}</h2>
          <div className="card chart">
            <ResponsiveContainer>
              <BarChart data={staleness.buckets} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="var(--hair)" vertical={false} />
                <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
                <YAxis tick={axis} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "var(--raised)" }} />
                <Bar dataKey="n" name={t("pages")} radius={[3, 3, 0, 0]}>
                  {staleness.buckets.map((b, i) => <Cell key={b.label} fill={["#4FB286", "#A9BF4F", "#E0A93F", "#E8785F", "#8B9099"][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {staleness.unknown > 0 && <div className="small faint" style={{ marginTop: 6 }}>{t("ch_no_updated", { n: staleness.unknown })}</div>}
        </div>
      </div>

      <div className="grid cols-2">
        <div>
          <h2 className="section">{t("ch_orphans_h", { n: orphans.length })}</h2>
          <div className="small muted" style={{ marginBottom: 8 }}>{t("ch_orphans_x")}</div>
          <PageList pages={orphans.slice(0, 30)} empty={t("ch_orphans_none")} />
          {orphans.length > 30 && <div className="small faint" style={{ marginTop: 6 }}>{t("ch_showing", { n: orphans.length })}</div>}
        </div>
        <div>
          <h2 className="section">{t("ch_deadlinks_h")}</h2>
          <div className="small muted" style={{ marginBottom: 8 }}>{t("ch_deadlinks_x")}</div>
          {deadByTarget.length ? (
            <table className="tbl">
              <thead><tr><th>{t("ch_target")}</th><th style={{ textAlign: "right" }}>{t("ch_refs")}</th></tr></thead>
              <tbody>
                {deadByTarget.map(([target, n]) => {
                  const from = v.deadLinks.find((d) => d.target === target)!.from;
                  return (
                    <tr key={target}>
                      <td>
                        <div>{target}</div>
                        <div className="small faint">{t("ch_eg_from")} <Link to={pageUrl(from)} style={{ color: themeColor(from.theme) }}>{from.title}</Link></div>
                      </td>
                      <td className="mono" style={{ textAlign: "right" }}>{n}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty">{t("ch_no_dead")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
