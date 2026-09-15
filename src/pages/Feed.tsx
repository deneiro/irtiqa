import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { formatDayTitle, todayStr, addDays } from "../lib/dates";
import { extractPractices } from "../lib/practices";
import { eventUrl, personName } from "../lib/events";
import Markdown from "../components/Markdown";
import type { Page } from "../lib/types";

type Kind = "app" | "vault";
interface Ev { id: string; date: string; kind: Kind; icon: string; text: string; sub?: string; page?: Page; body?: string; to?: string }

const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString("ru-RU");

function humanOp(op: string, subject: string): { icon: string; text: string } | null {
  if (op === "day") return null;
  if (op.startsWith("ingest")) return { icon: "📚", text: `Новая страница в vault: ${subject}` };
  if (/digest/.test(op)) return { icon: "🧭", text: `Дайджест недели${subject ? `: ${subject}` : ""}` };
  if (/lint/.test(op)) return { icon: "🔍", text: `Проверка vault${subject ? `: ${subject}` : ""}` };
  if (/schema/.test(op)) return { icon: "🏗", text: `Схема vault: ${subject}` };
  if (/build|implement|create|setup|init/.test(op)) return { icon: "🔨", text: `Сборка: ${subject || op}` };
  if (/query|research|analy|brainstorm|decide|strategy|diagnostic/.test(op)) return { icon: "💬", text: `Разговор с Claude: ${subject || op}` };
  if (/update|expand|extend|deepen|revision|edit|fix|move|migration|restructure|sync|reconcile/.test(op)) return { icon: "✏️", text: `Правка vault: ${subject || op}` };
  return { icon: "🗂", text: `${op}: ${subject}` };
}

export default function FeedPage() {
  const v = useVault();
  const { life } = useStore();
  const today = todayStr();
  const [kind, setKind] = useState<Kind | "all">("all");
  const [q, setQ] = useState("");
  const [span, setSpan] = useState(45);

  const events = useMemo<Ev[]>(() => {
    const out: Ev[] = [];
    const from = addDays(today, -span);
    for (const [date, d] of life?.days ?? []) {
      if (date < from) continue;
      if (d.habitsDone.length) out.push({ id: `${date}-hd`, date, kind: "app", icon: "✓", text: `Привычки: ${d.habitsDone.join(", ")}`, to: "/habits" });
      if (d.habitsFailed.length) out.push({ id: `${date}-hf`, date, kind: "app", icon: "✗", text: `Сорвано: ${d.habitsFailed.join(", ")}`, to: "/habits" });
      for (const qn of d.questsClosed) out.push({ id: `${date}-qc-${qn}`, date, kind: "app", icon: "🏁", text: `Квест закрыт: ${qn}`, to: "/quests" });
      for (const [i, s] of d.sessions.entries()) out.push({ id: `${date}-s${i}`, date, kind: "app", icon: "⏱", text: `${s.minutes} мин · ${s.quest}`, to: "/quests" });
      for (const [i, tx] of d.txs.entries()) out.push({ id: `${date}-t${i}`, date, kind: "app", icon: tx.amount < 0 ? "💸" : "💰", text: `${tx.amount < 0 ? "−" : "+"}${fmt(tx.amount)} ${tx.category}`, sub: [tx.account, tx.note].filter(Boolean).join(" · "), to: "/finance" });
      for (const [i, line] of d.done.entries()) out.push({ id: `${date}-d${i}`, date, kind: "app", icon: "•", text: line, to: "/" });
      if (d.journal.trim()) out.push({ id: `${date}-j`, date, kind: "app", icon: "📝", text: "Запись в журнале", body: d.journal, to: "/" });
      if (d.closed) out.push({ id: `${date}-c`, date, kind: "app", icon: "🔒", text: `День закрыт${d.mood !== undefined ? ` · настроение ${d.mood}` : ""}${d.stress !== undefined ? ` · стресс ${d.stress}` : ""}`, to: "/" });
    }
    for (const p of v.pages) {
      if (p.zone === "resource" && p.fm.read) {
        const date = String(p.fm.read instanceof Date ? p.fm.read.toISOString() : p.fm.read).slice(0, 10);
        if (date >= from) out.push({ id: `read-${p.rel}`, date, kind: "app", icon: "📖", text: `Прочитано: ${p.title}`, sub: `${extractPractices(p.body).length} практик`, page: p });
      }
    }
    for (const h of life?.habits ?? []) if (h.created && h.created >= from) out.push({ id: `h-${h.rel}`, date: h.created, kind: "app", icon: h.status === "proposed" ? "📥" : "🌱", text: `${h.status === "proposed" ? "Предложена привычка" : "Новая привычка"}: ${h.title}`, to: "/habits" });
    for (const e of life?.events ?? []) {
      if (e.date < from) continue;
      out.push({ id: `ev-${e.rel}`, date: e.date, kind: "app", icon: "📸", text: `Событие: ${e.title}`, sub: [e.place, e.people.map(personName).join(", "), e.photos.length ? `${e.photos.length} фото` : ""].filter(Boolean).join(" · "), to: eventUrl(e) });
    }
    for (const qu of life?.quests ?? []) if (qu.created && qu.created >= from) out.push({ id: `q-${qu.rel}`, date: qu.created, kind: "app", icon: qu.status === "proposed" ? "📥" : "🗡", text: `${qu.status === "proposed" ? "Предложен квест" : "Новый квест"}: ${qu.title}`, to: "/quests" });
    for (const e of v.log) {
      if (e.date < from) continue;
      const h = humanOp(e.op, e.subject);
      if (!h) continue;
      const page = e.op.startsWith("ingest") && e.subject ? v.resolve(e.subject) : undefined;
      out.push({ id: `log-${e.id}`, date: e.date, kind: "vault", icon: h.icon, text: h.text, body: e.body, page });
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [life, v, today, span]);

  const filtered = events.filter((e) => (kind === "all" || e.kind === kind) && (!q || (e.text + " " + (e.sub ?? "") + " " + (e.body ?? "")).toLowerCase().includes(q.toLowerCase())));
  const byDay = useMemo(() => {
    const m = new Map<string, Ev[]>();
    for (const e of filtered) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return [...m.entries()];
  }, [filtered]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const nApp = events.filter((e) => e.kind === "app").length;
  const nVault = events.length - nApp;

  return (
    <div>
      <div className="eyebrow">Что происходило</div>
      <h1 className="title">Лента</h1>
      <p className="lede">Действия в приложении и изменения vault одной хронологией, новые сверху.</p>
      <div className="row wrap" style={{ margin: "16px 0 10px", gap: 8 }}>
        {([["all", "Всё", events.length], ["app", "Приложение", nApp], ["vault", "Vault", nVault]] as const).map(([k, label, n]) => (
          <button key={k} className={`chip link ${kind === k ? "on" : ""}`} onClick={() => setKind(k)}>{label} <span className="faint">{n}</span></button>
        ))}
        <span className="grow" />
        <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Поиск по ленте…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
      </div>
      <div className="feed">
        {byDay.map(([date, es]) => (
          <div key={date} className="feed-day">
            <div className="feed-date">{formatDayTitle(date)}{date === today ? " · сегодня" : ""}</div>
            {es.map((e) => {
              const isOpen = open.has(e.id);
              const inner = (
                <>
                  <span className={`fi k-${e.kind}`}>{e.icon}</span>
                  <span className="ft">
                    <span>{e.text}</span>
                    {e.sub && <span className="small muted"> · {e.sub}</span>}
                  </span>
                </>
              );
              return (
                <div key={e.id} className={`fev k-${e.kind}`}>
                  {e.page ? <Link to={pageUrl(e.page)} className="frow">{inner}</Link>
                    : e.to && !e.body ? <Link to={e.to} className="frow">{inner}</Link>
                    : <div className="frow" onClick={() => e.body && setOpen((s) => { const n = new Set(s); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n; })} style={{ cursor: e.body ? "pointer" : "default" }}>{inner}{e.body && <span className="small faint">{isOpen ? "▴" : "▾"}</span>}</div>}
                  {isOpen && e.body && <div className="fbody"><Markdown source={e.body} compact /></div>}
                </div>
              );
            })}
          </div>
        ))}
        {!filtered.length && <div className="empty">За этот период ничего нет.</div>}
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn ghost" onClick={() => setSpan(span + 60)}>показать ещё 60 дней</button>
        <span className="small faint">сейчас показаны последние {span} дней</span>
      </div>
    </div>
  );
}
