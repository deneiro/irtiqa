import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "../store";
import { ChartTip } from "../components/Bits";
import SourceLink from "../components/SourceLink";
import { confirmAction } from "../lib/native";
import { addDays } from "../lib/dates";
import {
  ACCOUNTS_REL, DEBTS_REL, DEBT_I_OWE, DEBT_THEY_OWE, SUBS_REL, debtLeft, debtsByPerson, liveBalance, monthOf, payPersonDebts, serializeAccounts, serializeDebts, serializeSubscriptions, parseAccounts, parseAmount, parseDebts, parseSubscriptions,
  txsInMonth, type AccountRow, type Day, type Debt, type Subscription,
} from "../lib/life";
import { useDayToday } from "../lib/useDayToday";

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
  const { vault, life, saveLedger, reload, updateToday } = useStore();
  const today = useDayToday();
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

  /** Rewrite a ledger through the guard. False when refused; the reason is shown and nothing else should follow. */
  const persist = async (rel: string, content: string, parse: (c: string) => unknown[]): Promise<boolean> => {
    try { await saveLedger(rel, content, parse); setErr(null); await reload(); return true; } catch (e) { setErr(e instanceof Error ? e.message : String(e)); return false; }
  };

  // ----- accounts -----
  const [acc, setAcc] = useState({ name: "", kind: "", balance: "" });
  const [editBal, setEditBal] = useState<Record<string, string>>({});
  const saveAccounts = (rows: AccountRow[]) => persist(ACCOUNTS_REL, serializeAccounts(rows, today), parseAccounts);
  const addAccount = () => {
    const name = acc.name.trim();
    if (!name || accounts.some((a) => a.name === name)) return;
    void saveAccounts([...accounts, { name, kind: acc.kind.trim(), balance: (parseAmount(acc.balance) ?? 0) - movedToday(name), asOf: today }]);
    setAcc({ name: "", kind: "", balance: "" });
  };
  /** Today's movement on one account — what separates "now" from "start of day". */
  const movedToday = (name: string) =>
    (days.get(today)?.txs ?? []).filter((t) => t.account.trim() === name).reduce((s, t) => s + t.amount, 0);

  /** The user types what is on the card right now; the file stores the start of the day. */
  const setBalance = (a: AccountRow) => {
    // An empty box is not zero: Number("") is 0 and used to wipe the balance.
    const v = parseAmount(editBal[a.name] ?? "");
    if (v === undefined) return;
    void saveAccounts(accounts.map((x) => (x.name === a.name ? { ...x, balance: v - movedToday(a.name), asOf: today } : x)));
    setEditBal({ ...editBal, [a.name]: "" });
  };
  const live = (a: AccountRow) => liveBalance(a, days);
  const total = accounts.reduce((s, a) => s + live(a), 0);
  const removeAccount = async (a: AccountRow) => {
    if (await confirmAction(`Убрать счёт «${a.name}»? Операции в файлах дней останутся.`)) await saveAccounts(accounts.filter((x) => x !== a));
  };

  // ----- subscriptions -----
  const [sub, setSub] = useState({ name: "", amount: "", account: "", day: "1", category: "подписки" });
  const saveSubs = (rows: Subscription[]) => persist(SUBS_REL, serializeSubscriptions(rows, today), parseSubscriptions);
  const addSub = () => {
    const name = sub.name.trim();
    const amount = Math.abs(parseAmount(sub.amount) ?? 0);
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
  const saveDebts = (rows: Debt[]) => persist(DEBTS_REL, serializeDebts(rows, today), parseDebts);
  const addDebt = () => {
    const whoRaw = debt.who.trim();
    const amount = Math.abs(parseAmount(debt.amount) ?? 0);
    if (!whoRaw || !amount) return;
    const who = people.includes(whoRaw) ? `[[${whoRaw}]]` : whoRaw;
    void saveDebts([...debts, { who, direction: debt.direction, amount, paid: 0, currency: debt.currency, since: today, note: debt.note.trim(), closed: undefined }]);
    setDebt({ ...debt, who: "", amount: "", note: "" });
  };
  const openDebts = debts.filter((d) => !d.closed && debtLeft(d) > 0);
  const owedToMe = openDebts.filter((d) => d.direction === DEBT_THEY_OWE).reduce((s, d) => s + debtLeft(d), 0);
  const iOwe = openDebts.filter((d) => d.direction === DEBT_I_OWE).reduce((s, d) => s + debtLeft(d), 0);
  const people_ = debtsByPerson(debts);

  /** Paying a person: oldest debts first, and the money leaves an account today. */
  const [pay, setPay] = useState<{ who: string; direction: string; amount: string; account: string } | null>(null);
  const doPay = async () => {
    if (!pay) return;
    const amount = Math.abs(parseAmount(pay.amount) ?? 0);
    if (!amount) return;
    const r = payPersonDebts(debts, pay.who, pay.direction, amount, today);
    // A refused debts write must not leave a «долг» transaction behind it.
    if (!(await saveDebts(r.rows))) return;
    if (pay.account.trim()) {
      const sign = pay.direction === DEBT_I_OWE ? -1 : 1;
      await updateToday((d) => ({
        ...d,
        txs: [...d.txs, { amount: sign * r.applied, category: "долг", account: pay.account.trim(), note: `${pay.direction === DEBT_I_OWE ? "отдал" : "вернули"}: ${pay.who}` }],
      }));
    }
    setPay(null);
  };
  const closePerson = async (who: string, direction: string, left: number) => {
    if (!(await confirmAction(`Закрыть все долги: ${who}, остаток ${fmt(left)} ₸?`))) return;
    const r = payPersonDebts(debts, who, direction, left, today);
    await saveDebts(r.rows);
  };

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
          <span className="n"><span className="amt neg">−{fmt(month.spent)}</span> · <span className="amt pos">+{fmt(month.earned)}</span></span>
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
                    <td className="amt mono" style={{ textAlign: "right" }}>{fmt(live(a))}</td>
                    <td className="mono muted" title={`сверено ${a.asOf}: ${fmt(a.balance)}`}>{a.asOf}{live(a) !== a.balance ? ` · было ${fmt(a.balance)}` : ""}</td>
                    <td>
                      <form className="row" onSubmit={(e) => { e.preventDefault(); setBalance(a); }} style={{ gap: 4 }}>
                        <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} style={{ width: 90 }} placeholder="сверить" title="Сколько на счёте прямо сейчас" value={editBal[a.name] ?? ""} onChange={(e) => setEditBal({ ...editBal, [a.name]: e.target.value })} />
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
            <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="счёт (Kaspi, наличные…)" value={acc.name} onChange={(e) => setAcc({ ...acc, name: e.target.value })} />
            <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="тип" value={acc.kind} onChange={(e) => setAcc({ ...acc, kind: e.target.value })} />
            <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="баланс" value={acc.balance} onChange={(e) => setAcc({ ...acc, balance: e.target.value })} />
            <button className="btn" type="submit">+</button>
          </form>
          <div className="small faint" style={{ marginTop: 6 }}>Баланс считается сам: сверенное число плюс все операции с этого дня. «Сверить» ставит то, что на счёте прямо сейчас: сегодняшние операции приложение учтёт само.</div>
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
            <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="название" value={sub.name} onChange={(e) => setSub({ ...sub, name: e.target.value })} />
            <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="сумма" value={sub.amount} onChange={(e) => setSub({ ...sub, amount: e.target.value })} />
            <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="счёт" list="fin-accts" value={sub.account} onChange={(e) => setSub({ ...sub, account: e.target.value })} />
            <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="день" value={sub.day} onChange={(e) => setSub({ ...sub, day: e.target.value })} />
            <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="категория" value={sub.category} onChange={(e) => setSub({ ...sub, category: e.target.value })} />
            <button className="btn" type="submit">+</button>
          </form>
          <div className="small faint" style={{ marginTop: 6 }}>В день списания приложение само добавит операцию в файл дня с заметкой «подписка: …».</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Долги <span className="n">мне {fmt(owedToMe)} · я {fmt(iOwe)}</span></h3>
        {people_.length > 0 && (
          <table className="tbl">
            <thead><tr><th>кто</th><th>направление</th><th style={{ textAlign: "right" }}>остаток</th><th>долгов</th><th>с</th><th /></tr></thead>
            <tbody>
              {people_.map((p) => (
                <tr key={p.who + p.direction}>
                  <td><SourceLink source={`[[${p.who}]]`} /></td>
                  <td className={p.direction === DEBT_I_OWE ? "muted" : ""}>{p.direction}</td>
                  <td className="amt mono neg" style={{ textAlign: "right" }}>{fmt(p.left)} ₸</td>
                  <td className="mono muted">{p.count}</td>
                  <td className="mono muted">{p.oldest}</td>
                  <td className="row" style={{ gap: 4 }}>
                    <button className="btn small" onClick={() => setPay({ who: p.who, direction: p.direction, amount: "", account: accountNames[0] ?? "" })}>внести</button>
                    <button className="btn small ghost" onClick={() => void closePerson(p.who, p.direction, p.left)}>закрыть всё</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pay && (
          <form className="addrow paydebt" onSubmit={(e) => { e.preventDefault(); void doPay(); }}>
            <span className="small muted" style={{ alignSelf: "center" }}>{pay.direction === DEBT_I_OWE ? "отдаю" : "возвращают"}: <b>{pay.who}</b></span>
            <input className="text" autoFocus autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="сколько" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
            <select className="text" value={pay.account} onChange={(e) => setPay({ ...pay, account: e.target.value })}>
              <option value="">без операции</option>
              {accountNames.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button className="btn primary" type="submit">записать</button>
            <button className="btn ghost" type="button" onClick={() => setPay(null)}>отмена</button>
            <div className="small faint" style={{ gridColumn: "1 / -1" }}>Сумма пойдёт на самые старые долги этого человека; закрытые уйдут в «Закрытые». Со счётом операция ляжет в сегодняшний день категорией «долг».</div>
          </form>
        )}
        <form className="addrow debt" onSubmit={(e) => { e.preventDefault(); addDebt(); }}>
          <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="кто (из People или текст)" list="fin-people" value={debt.who} onChange={(e) => setDebt({ ...debt, who: e.target.value })} />
          <select className="text" value={debt.direction} onChange={(e) => setDebt({ ...debt, direction: e.target.value })}>
            <option value={DEBT_THEY_OWE}>{DEBT_THEY_OWE}</option>
            <option value={DEBT_I_OWE}>{DEBT_I_OWE}</option>
          </select>
          <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="сумма" value={debt.amount} onChange={(e) => setDebt({ ...debt, amount: e.target.value })} />
          <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="валюта" value={debt.currency} onChange={(e) => setDebt({ ...debt, currency: e.target.value })} style={{ width: 70 }} />
          <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="заметка" value={debt.note} onChange={(e) => setDebt({ ...debt, note: e.target.value })} />
          <button className="btn" type="submit">+</button>
        </form>
        {debts.some((d) => d.closed) && (
          <details style={{ marginTop: 10 }}>
            <summary className="small muted" style={{ cursor: "pointer" }}>Закрытые ({debts.filter((d) => d.closed).length})</summary>
            {debts.filter((d) => d.closed).map((d, i) => (
              <div className="bul small" key={i}><SourceLink source={d.who} /><span className="muted"> · {d.direction} · {fmt(d.amount)} {d.currency}{d.note ? ` · ${d.note}` : ""} · закрыт {d.closed}</span></div>
            ))}
          </details>
        )}
        <div className="small faint" style={{ marginTop: 6 }}>За что именно и когда — на странице человека. Claude может дописывать строки в этот файл, когда узнаёт о долге из разговора.</div>
      </div>

      <datalist id="fin-accts">{accountNames.map((a) => <option key={a} value={a} />)}</datalist>
      <datalist id="fin-people">{people.map((p) => <option key={p} value={p} />)}</datalist>
      <div className="small faint" style={{ marginTop: 16 }}>Сегодня {today}; неделя назад {addDays(today, -7)}.</div>
    </div>
  );
}
