import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "../store";
import { ChartTip } from "../components/Bits";
import SourceLink from "../components/SourceLink";
import { confirmAction } from "../lib/native";
import { addDays, todayStr } from "../lib/dates";
import {
  ACCOUNTS_REL, DEBTS_REL, DEBT_I_OWE, DEBT_THEY_OWE, SUBS_REL, monthOf, serializeAccounts, serializeDebts, serializeSubscriptions,
  txsInMonth, type AccountRow, type Day, type Debt, type Subscription,
} from "../lib/life";

const axis = { stroke: "var(--faint)", fontSize: 11, fontFamily: "var(--font-mono)" };

function fmt(n: number): string {
  return Math.round(n).toLocaleString("ru-RU");
}
function monthLabel(ym: string): string {
  const s = new Date(ym + "-01T12:00:00").toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function FinancePage() {
  const { vault, life, saveText, reload } = useStore();
  const today = todayStr();
  const [ym, setYm] = useState(monthOf(today));
  const [err, setErr] = useState<string | null>(null);

  const days: Map<string, Day> = life?.days ?? new Map<string, Day>();
  const accounts = life?.accounts ?? [];
  const subs = life?.subscriptions ?? [];
  const debts = life?.debts ?? [];

  // ----- month -----
  const month = useMemo(() => {
    const rows = txsInMonth(days, ym);
    const spent = rows.filter((r) => r.tx.amount < 0).reduce((s, r) => s - r.tx.amount, 0);
    const earned = rows.filter((r) => r.tx.amount > 0).reduce((s, r) => s + r.tx.amount, 0);
    const byCat = new Map<string, number>();
    for (const r of rows) if (r.tx.amount < 0) byCat.set(r.tx.category || "без категории", (byCat.get(r.tx.category || "без категории") ?? 0) - r.tx.amount);
    const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
    const [y, m] = ym.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    const perDay = Array.from({ length: last }, (_, i) => {
      const date = `${ym}-${String(i + 1).padStart(2, "0")}`;
      const d = days.get(date);
      const sp = d ? d.txs.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0) : 0;
      return { day: String(i + 1), "потрачено": sp };
    });
    return { rows, spent, earned, cats, perDay };
  }, [days, ym]);

  const persist = async (rel: string, content: string) => {
    try { await saveText(rel, content); setErr(null); await reload(); } catch (e) { setErr(String(e)); }
  };

  // ----- accounts -----
  const [acc, setAcc] = useState({ name: "", kind: "", balance: "" });
  const [editBal, setEditBal] = useState<Record<string, string>>({});
  const saveAccounts = (rows: AccountRow[]) => persist(ACCOUNTS_REL, serializeAccounts(rows, today));
  const addAccount = () => {
    const name = acc.name.trim();
    if (!name || accounts.some((a) => a.name === name)) return;
    void saveAccounts([...accounts, { name, kind: acc.kind.trim(), balance: Number(acc.balance.replace(/\s/g, "")) || 0, asOf: today }]);
    setAcc({ name: "", kind: "", balance: "" });
  };
  const setBalance = (a: AccountRow) => {
    const v = Number((editBal[a.name] ?? "").replace(/\s/g, ""));
    if (!Number.isFinite(v)) return;
    void saveAccounts(accounts.map((x) => (x.name === a.name ? { ...x, balance: v, asOf: today } : x)));
    setEditBal({ ...editBal, [a.name]: "" });
  };
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const removeAccount = async (a: AccountRow) => {
    if (await confirmAction(`Убрать счёт «${a.name}»? Операции в файлах дней останутся.`)) await saveAccounts(accounts.filter((x) => x !== a));
  };

  // ----- subscriptions -----
  const [sub, setSub] = useState({ name: "", amount: "", account: "", day: "1", category: "подписки" });
  const saveSubs = (rows: Subscription[]) => persist(SUBS_REL, serializeSubscriptions(rows, today));
  const addSub = () => {
    const name = sub.name.trim();
    const amount = Math.abs(Number(sub.amount.replace(/\s/g, "")));
    const day = Number(sub.day);
    if (!name || !amount || !day || subs.some((s) => s.name === name)) return;
    void saveSubs([...subs, { name, amount, account: sub.account.trim(), day, category: sub.category.trim() }]);
    setSub({ name: "", amount: "", account: sub.account, day: "1", category: sub.category });
  };
  const subsMonthly = subs.reduce((s, x) => s + x.amount, 0);
  const removeSub = async (x: Subscription) => {
    if (await confirmAction(`Убрать подписку «${x.name}»? Списания перестанут добавляться.`)) await saveSubs(subs.filter((s) => s !== x));
  };

  // ----- debts -----
  const people = useMemo(() => (vault?.pages ?? []).filter((p) => p.zone === "person").map((p) => p.title).sort(), [vault]);
  const [debt, setDebt] = useState({ who: "", direction: DEBT_THEY_OWE, amount: "", currency: "₸", note: "" });
  const saveDebts = (rows: Debt[]) => persist(DEBTS_REL, serializeDebts(rows, today));
  const addDebt = () => {
    const whoRaw = debt.who.trim();
    const amount = Math.abs(Number(debt.amount.replace(/\s/g, "")));
    if (!whoRaw || !amount) return;
    const who = people.includes(whoRaw) ? `[[${whoRaw}]]` : whoRaw;
    void saveDebts([...debts, { who, direction: debt.direction, amount, currency: debt.currency, since: today, note: debt.note.trim(), closed: undefined }]);
    setDebt({ ...debt, who: "", amount: "", note: "" });
  };
  const closeDebt = (d: Debt) => void saveDebts(debts.map((x) => (x === d ? { ...x, closed: today } : x)));
  const askCloseDebt = async (d: Debt) => {
    if (await confirmAction(`Закрыть долг: ${d.who}, ${fmt(d.amount)} ${d.currency}?`)) closeDebt(d);
  };
  const openDebts = debts.filter((d) => !d.closed);
  const owedToMe = openDebts.filter((d) => d.direction === DEBT_THEY_OWE).reduce((s, d) => s + d.amount, 0);
  const iOwe = openDebts.filter((d) => d.direction === DEBT_I_OWE).reduce((s, d) => s + d.amount, 0);

  const accountNames = useMemo(() => [...new Set([...accounts.map((a) => a.name), ...subs.map((s) => s.account)].filter(Boolean))], [accounts, subs]);

  if (!life) return null;
  return (
    <div>
      <div className="eyebrow">life/finance</div>
      <h1 className="title">Финансы</h1>
      <p className="lede">
        на счетах <b>{fmt(total)}</b> · подписки <b>{fmt(subsMonthly)}</b> в месяц · мне должны <b>{fmt(owedToMe)}</b> · я должен <b>{fmt(iOwe)}</b>
      </p>
      {err && <div className="notice err">Не удалось записать: {err}</div>}

      <div className="card" style={{ marginTop: 16 }}>
        <h3>
          <button className="btn small ghost" onClick={() => setYm(shiftMonth(ym, -1))}>‹</button>
          <span style={{ textTransform: "none", letterSpacing: 0, fontSize: 15, color: "var(--ink)" }}>{monthLabel(ym)}</span>
          <button className="btn small ghost" onClick={() => setYm(shiftMonth(ym, 1))} disabled={ym >= monthOf(today)}>›</button>
          <span className="n">потрачено {fmt(month.spent)} · получено {fmt(month.earned)}</span>
        </h3>
        <div className="fin-grid">
          <div className="chart" style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={month.perDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--hair)" />
                <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={axis} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "var(--raised)" }} />
                <Bar dataKey="потрачено" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="cats">
            {month.cats.length === 0 && <div className="small muted">Трат в этом месяце нет.</div>}
            {month.cats.map(([c, n]) => (
              <div className="cat" key={c}>
                <span className="cname">{c}</span>
                <span className="cbar"><i style={{ width: `${(100 * n) / month.cats[0][1]}%` }} /></span>
                <span className="cnum">{fmt(n)}</span>
              </div>
            ))}
          </div>
        </div>
        {month.rows.length > 0 && (
          <details style={{ marginTop: 12 }}>
            <summary className="small muted" style={{ cursor: "pointer" }}>Все операции месяца ({month.rows.length})</summary>
            <table className="tbl" style={{ marginTop: 8 }}>
              <thead><tr><th>дата</th><th style={{ textAlign: "right" }}>сумма</th><th>категория</th><th>счёт</th><th>заметка</th></tr></thead>
              <tbody>
                {month.rows.map((r, i) => (
                  <tr key={i} className="txrow">
                    <td className="mono">{r.date.slice(5)}</td>
                    <td className={`amt ${r.tx.amount < 0 ? "neg" : "pos"}`}>{fmt(r.tx.amount)}</td>
                    <td>{r.tx.category}</td><td>{r.tx.account}</td><td className="muted">{r.tx.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="small faint" style={{ marginTop: 6 }}>Операции живут в файлах дней. Сегодняшние правятся на экране «День».</div>
          </details>
        )}
      </div>

      <div className="fin-cols">
        <div className="card">
          <h3>Счета <span className="n">{fmt(total)}</span></h3>
          {accounts.length > 0 && (
            <table className="tbl">
              <thead><tr><th>счёт</th><th>тип</th><th style={{ textAlign: "right" }}>баланс</th><th>на дату</th><th /></tr></thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.name}>
                    <td>{a.name}</td><td className="muted">{a.kind}</td>
                    <td className="amt mono" style={{ textAlign: "right" }}>{fmt(a.balance)}</td>
                    <td className="mono muted">{a.asOf}</td>
                    <td>
                      <form className="row" onSubmit={(e) => { e.preventDefault(); setBalance(a); }} style={{ gap: 4 }}>
                        <input className="text" style={{ width: 90 }} placeholder="уточнить" value={editBal[a.name] ?? ""} onChange={(e) => setEditBal({ ...editBal, [a.name]: e.target.value })} />
                        <button className="btn small" type="submit">ок</button>
                        <button className="btn small ghost" type="button" title="убрать счёт" onClick={() => void removeAccount(a)}>×</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form className="addrow acc" onSubmit={(e) => { e.preventDefault(); addAccount(); }}>
            <input className="text" placeholder="счёт (Kaspi, наличные…)" value={acc.name} onChange={(e) => setAcc({ ...acc, name: e.target.value })} />
            <input className="text" placeholder="тип" value={acc.kind} onChange={(e) => setAcc({ ...acc, kind: e.target.value })} />
            <input className="text" placeholder="баланс" value={acc.balance} onChange={(e) => setAcc({ ...acc, balance: e.target.value })} />
            <button className="btn" type="submit">+</button>
          </form>
          <div className="small faint" style={{ marginTop: 6 }}>Баланс двигают операции дня при его закрытии. «Уточнить» ставит точное число на сегодня.</div>
        </div>

        <div className="card">
          <h3>Подписки <span className="n">{fmt(subsMonthly)} / мес</span></h3>
          {subs.length > 0 && (
            <table className="tbl">
              <thead><tr><th>название</th><th style={{ textAlign: "right" }}>сумма</th><th>счёт</th><th>день</th><th>категория</th><th /></tr></thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td><td className="amt mono" style={{ textAlign: "right" }}>{fmt(s.amount)}</td>
                    <td className="muted">{s.account}</td><td className="mono">{s.day}</td><td className="muted">{s.category}</td>
                    <td><button className="btn small ghost" title="убрать" onClick={() => void removeSub(s)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form className="addrow subs" onSubmit={(e) => { e.preventDefault(); addSub(); }}>
            <input className="text" placeholder="название" value={sub.name} onChange={(e) => setSub({ ...sub, name: e.target.value })} />
            <input className="text" placeholder="сумма" value={sub.amount} onChange={(e) => setSub({ ...sub, amount: e.target.value })} />
            <input className="text" placeholder="счёт" list="fin-accts" value={sub.account} onChange={(e) => setSub({ ...sub, account: e.target.value })} />
            <input className="text" placeholder="день" value={sub.day} onChange={(e) => setSub({ ...sub, day: e.target.value })} />
            <input className="text" placeholder="категория" value={sub.category} onChange={(e) => setSub({ ...sub, category: e.target.value })} />
            <button className="btn" type="submit">+</button>
          </form>
          <div className="small faint" style={{ marginTop: 6 }}>В день списания приложение само добавит операцию в файл дня с заметкой «подписка: …».</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Долги <span className="n">мне {fmt(owedToMe)} · я {fmt(iOwe)}</span></h3>
        {openDebts.length > 0 && (
          <table className="tbl">
            <thead><tr><th>кто</th><th>направление</th><th style={{ textAlign: "right" }}>сумма</th><th>с даты</th><th>заметка</th><th /></tr></thead>
            <tbody>
              {openDebts.map((d, i) => (
                <tr key={i}>
                  <td><SourceLink source={d.who} /></td>
                  <td className={d.direction === DEBT_I_OWE ? "muted" : ""}>{d.direction}</td>
                  <td className="amt mono" style={{ textAlign: "right" }}>{fmt(d.amount)} {d.currency}</td>
                  <td className="mono muted">{d.since}</td><td className="muted">{d.note}</td>
                  <td><button className="btn small ghost" onClick={() => void askCloseDebt(d)}>закрыт</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <form className="addrow debt" onSubmit={(e) => { e.preventDefault(); addDebt(); }}>
          <input className="text" placeholder="кто (из People или текст)" list="fin-people" value={debt.who} onChange={(e) => setDebt({ ...debt, who: e.target.value })} />
          <select className="text" value={debt.direction} onChange={(e) => setDebt({ ...debt, direction: e.target.value })}>
            <option value={DEBT_THEY_OWE}>{DEBT_THEY_OWE}</option>
            <option value={DEBT_I_OWE}>{DEBT_I_OWE}</option>
          </select>
          <input className="text" placeholder="сумма" value={debt.amount} onChange={(e) => setDebt({ ...debt, amount: e.target.value })} />
          <input className="text" placeholder="валюта" value={debt.currency} onChange={(e) => setDebt({ ...debt, currency: e.target.value })} style={{ width: 70 }} />
          <input className="text" placeholder="заметка" value={debt.note} onChange={(e) => setDebt({ ...debt, note: e.target.value })} />
          <button className="btn" type="submit">+</button>
        </form>
        {debts.some((d) => d.closed) && (
          <details style={{ marginTop: 10 }}>
            <summary className="small muted" style={{ cursor: "pointer" }}>Закрытые ({debts.filter((d) => d.closed).length})</summary>
            {debts.filter((d) => d.closed).map((d, i) => (
              <div className="bul small" key={i}><SourceLink source={d.who} /><span className="muted"> · {d.direction} · {fmt(d.amount)} {d.currency} · закрыт {d.closed}</span></div>
            ))}
          </details>
        )}
        <div className="small faint" style={{ marginTop: 6 }}>Claude может дописывать строки в этот файл, когда узнаёт о долге из разговора.</div>
      </div>

      <datalist id="fin-accts">{accountNames.map((a) => <option key={a} value={a} />)}</datalist>
      <datalist id="fin-people">{people.map((p) => <option key={p} value={p} />)}</datalist>
      <div className="small faint" style={{ marginTop: 16 }}>Сегодня {today}; неделя назад {addDays(today, -7)}.</div>
    </div>
  );
}
