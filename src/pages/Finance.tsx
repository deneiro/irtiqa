import { useMemo, useState } from "react";
import { THEME_ART } from "../assets/play";
import { Block, SceneFrame, SceneNumber, SceneTitle, SideCard } from "./main/Scene";
import { Link } from "react-router-dom";
import { dayUrl } from "../components/GameBits";
import { useStore } from "../store";
import SourceLink from "../components/SourceLink";
import { confirmAction } from "../lib/native";
import {
  ACCOUNTS_REL, DEBTS_REL, DEBT_I_OWE, DEBT_THEY_OWE, SUBS_REL, debtLeft, debtsByPerson, liveBalance, monthOf, payPersonDebts, serializeAccounts, serializeDebts, serializeSubscriptions, parseAccounts, parseAmount, parseDebts, parseSubscriptions, categoryName,
  txsInMonth, type AccountRow, type Day, type Debt, type Subscription,
} from "../lib/life";
import { useDayToday } from "../lib/useDayToday";

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
    // «Бензин», «бензин» and «БЕНЗИН» are one category: grouped by lower case, shown in the most used spelling.
    const byCat = new Map<string, { n: number; spell: Map<string, number> }>();
    for (const r of rows) {
      if (r.tx.amount >= 0) continue;
      const label = categoryName(r.tx.category) || "без категории";
      const k = label.toLowerCase().replace(/ё/g, "е");
      const c = byCat.get(k) ?? { n: 0, spell: new Map<string, number>() };
      c.n -= r.tx.amount;
      c.spell.set(label, (c.spell.get(label) ?? 0) + 1);
      byCat.set(k, c);
    }
    const cats = [...byCat.values()]
      .map((c) => [[...c.spell.entries()].sort((a, b) => b[1] - a[1])[0][0], c.n] as [string, number])
      .sort((a, b) => b[1] - a[1]);
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

  /** A spend or an income of today, written into today's day file as «Сегодня» writes it. */
  const [tx, setTx] = useState({ earn: false, amount: "", category: "", account: "", note: "" });
  const addTx = async () => {
    const n = Math.abs(parseAmount(tx.amount) ?? 0);
    if (!n) { setErr("Сумма — числом: 1500."); return; }
    try {
      await updateToday((d) => ({ ...d, txs: [...d.txs, { amount: tx.earn ? n : -n, category: tx.category.trim(), account: tx.account.trim(), note: tx.note.trim() }] }));
      setTx({ ...tx, amount: "", note: "" });
      setErr(null);
      await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };
  const maxDay = Math.max(1, ...month.perDay.map((d) => d["потрачено"]));
  const maxDebt = Math.max(1, ...people_.map((x) => x.left));

  if (!life) return null;
  return (
    <div className="g-page g-fin">
      <div className="g-play">
        <div className="g-top">
          <SceneFrame art={THEME_ART["Finance & money"]}>
            <SceneTitle kicker="финансы · счета, подписки, долги" title="Финансы" />
            <div className="g-xp8">
              <span>на счетах <b>{fmt(total)} ₸</b></span>
              <span>подписки <b>{fmt(subsMonthly)} ₸</b> в месяц</span>
              <span>мне должны <b>{fmt(owedToMe)} ₸</b></span>
            </div>
            <SceneNumber value={iOwe >= 1e6 ? (iOwe / 1e6).toFixed(2).replace(".", ",") : fmt(iOwe)} unit={iOwe >= 1e6 ? " млн ₸" : " ₸"} label="я должен" sub={`${people_.filter((x) => x.direction === DEBT_I_OWE).length} кому · людям и банкам`} />
          </SceneFrame>
          <SideCard kicker="долги по людям">
            {people_.length ? (
              <div className="g-debts">
                {[...people_].sort((a, b) => b.left - a.left).slice(0, 7).map((x) => (
                  <div key={x.who + x.direction} className={x.direction === DEBT_I_OWE ? "owe" : "due"}>
                    <span>{x.who}<small>{x.direction} · с {x.oldest}</small></span>
                    <i><u style={{ width: `${(x.left / Math.max(1, ...people_.map((y) => y.left))) * 100}%` }} /></i>
                    <b>{fmt(x.left)}</b>
                  </div>
                ))}
              </div>
            ) : <p className="g-rule">Долгов нет.</p>}
            <p className="g-cap">Внести платёж или закрыть долг — в блоке «Долги» ниже.</p>
          </SideCard>
        </div>
        {err && <p className="g-error" role="alert">Не удалось записать: {err}</p>}

        <Block title={<span className="g-monthnav"><button type="button" onClick={() => setYm(shiftMonth(ym, -1))} aria-label="Месяц назад">‹</button>{monthLabel(ym)}<button type="button" onClick={() => setYm(shiftMonth(ym, 1))} disabled={ym >= monthOf(today)} aria-label="Месяц вперёд">›</button></span>}
          right={<><b className="neg">−{fmt(month.spent)}</b> · <b className="pos">+{fmt(month.earned)}</b> ₸</>}>
          <div className="g-fmonth">
            <div>
              <div className="g-daybars" role="img" aria-label={`Траты по дням: ${monthLabel(ym)}`}>
                {month.perDay.map((d) => {
                  const date = `${ym}-${d.day.padStart(2, "0")}`;
                  const v = d["потрачено"];
                  return (
                    <Link key={d.day} to={dayUrl(date)} className={`${date === today ? "today" : ""}${date > today ? " future" : ""}`} title={`${d.day} — ${v ? `${fmt(v)} ₸` : "трат нет"}`} onClick={(e) => { if (date > today) e.preventDefault(); }}>
                      <u style={{ height: `${v ? Math.max(4, (v / maxDay) * 100) : 0}%` }} />
                      <span>{Number(d.day) === 1 || Number(d.day) % 5 === 0 ? d.day : ""}</span>
                    </Link>
                  );
                })}
              </div>
              {ym === monthOf(today) && (
                <form className="g-quick" onSubmit={(e) => { e.preventDefault(); void addTx(); }}>
                  <div className="g-chips"><button type="button" className={!tx.earn ? "on" : ""} aria-pressed={!tx.earn} onClick={() => setTx({ ...tx, earn: false })}>расход</button><button type="button" className={tx.earn ? "on" : ""} aria-pressed={tx.earn} onClick={() => setTx({ ...tx, earn: true })}>доход</button></div>
                  <input className="text" autoCorrect="off" spellCheck={false} placeholder="сумма" value={tx.amount} onChange={(e) => setTx({ ...tx, amount: e.target.value })} aria-label="Сумма" />
                  <input className="text" autoCorrect="off" spellCheck={false} placeholder="категория" list="fin-cats" value={tx.category} onChange={(e) => setTx({ ...tx, category: e.target.value })} aria-label="Категория" />
                  <input className="text" autoCorrect="off" spellCheck={false} placeholder="счёт" list="fin-accts" value={tx.account} onChange={(e) => setTx({ ...tx, account: e.target.value })} aria-label="Счёт" />
                  <input className="text" autoCorrect="off" spellCheck={false} placeholder="заметка" value={tx.note} onChange={(e) => setTx({ ...tx, note: e.target.value })} aria-label="Заметка" />
                  <div className="g-line"><button type="submit" disabled={!tx.amount.trim()}>Записать сегодня</button></div>
                </form>
              )}
            </div>
            <div className="g-cats">
              <span className="g-kick">на что ушло</span>
              {month.cats.length === 0 && <p className="g-faint">Трат в этом месяце нет.</p>}
              {month.cats.map(([c, n]) => <div className="g-mv" key={c}><span>{c}</span><i><u style={{ width: `${(100 * n) / month.cats[0][1]}%` }} /></i><b>{fmt(n)}</b></div>)}
            </div>
          </div>
          {month.rows.length > 0 && (
            <details className="g-ops">
              <summary>Все операции месяца · {month.rows.length}</summary>
              {[...month.rows].reverse().map((r, k) => (
                <div key={k} className={r.tx.amount < 0 ? "neg" : "pos"}>
                  <span>{Number(r.date.slice(8))}</span><b>{r.tx.amount > 0 ? "+" : "−"}{fmt(Math.abs(r.tx.amount))}</b><em>{r.tx.category || "—"}</em><span>{r.tx.account}</span><span>{r.tx.note}</span>
                </div>
              ))}
            </details>
          )}
        </Block>

        <div className="g-two">
          <Block title="Счета" right={`${fmt(total)} ₸`}>
            <div className="g-accts">
              {accounts.map((a) => (
                <div key={a.name} className={`g-acct${live(a) < 0 ? " neg" : ""}`}>
                  <div className="hd"><b>{a.name}</b><span>{a.kind}</span><button type="button" title="убрать счёт" aria-label={`Убрать счёт ${a.name}`} onClick={() => void removeAccount(a)}>×</button></div>
                  <strong>{fmt(live(a))}<small> ₸</small></strong>
                  <small title={`сверено ${a.asOf}: ${fmt(a.balance)}`}>сверено {a.asOf}{live(a) !== a.balance ? ` · было ${fmt(a.balance)}` : ""}</small>
                  <form onSubmit={(e) => { e.preventDefault(); setBalance(a); }}>
                    <input className="text" autoCorrect="off" spellCheck={false} placeholder="сколько сейчас" value={editBal[a.name] ?? ""} onChange={(e) => setEditBal({ ...editBal, [a.name]: e.target.value })} aria-label={`Сверить ${a.name}`} />
                    <button type="submit" disabled={!(editBal[a.name] ?? "").trim()}>сверить</button>
                  </form>
                </div>
              ))}
              {!accounts.length && <p className="g-faint">Счетов нет.</p>}
            </div>
            <form className="g-addrow" onSubmit={(e) => { e.preventDefault(); addAccount(); }}>
              <input className="text" autoCorrect="off" spellCheck={false} placeholder="счёт (Kaspi, наличные…)" value={acc.name} onChange={(e) => setAcc({ ...acc, name: e.target.value })} />
              <input className="text" autoCorrect="off" spellCheck={false} placeholder="тип" value={acc.kind} onChange={(e) => setAcc({ ...acc, kind: e.target.value })} />
              <input className="text" autoCorrect="off" spellCheck={false} placeholder="баланс" value={acc.balance} onChange={(e) => setAcc({ ...acc, balance: e.target.value })} />
              <button type="submit" disabled={!acc.name.trim()}>+ счёт</button>
            </form>
            <p className="g-cap">Баланс считается сам: сверенное число плюс все операции с того дня. «Сверить» ставит то, что на счёте прямо сейчас.</p>
          </Block>

          <Block title="Подписки" right={`${fmt(subsMonthly)} ₸ в месяц`}>
            <div className="g-substrip" role="img" aria-label="Дни списаний в месяце">
              {Array.from({ length: 31 }, (_, k) => k + 1).map((d) => {
                const of = subs.filter((x) => x.day === d);
                return <i key={d} className={`${of.length ? "on" : ""}${d === Number(today.slice(8)) ? " today" : ""}`} title={of.length ? `${d}-го: ${of.map((x) => `${x.name} ${fmt(x.amount)}`).join(", ")}` : `${d}-го`}>{of.length ? d : ""}</i>;
              })}
            </div>
            {subs.map((x) => (
              <div className="g-rowx" key={x.name}>
                <div><b>{x.name}</b><small>{x.day}-го · {x.account || "без счёта"} · {x.category}</small></div>
                <span className="amt">{fmt(x.amount)} ₸</span>
                <span className="acts"><button type="button" onClick={() => void removeSub(x)}>убрать</button></span>
              </div>
            ))}
            {!subs.length && <p className="g-faint">Подписок нет.</p>}
            <form className="g-addrow" onSubmit={(e) => { e.preventDefault(); addSub(); }}>
              <input className="text" autoCorrect="off" spellCheck={false} placeholder="название" value={sub.name} onChange={(e) => setSub({ ...sub, name: e.target.value })} />
              <input className="text" autoCorrect="off" spellCheck={false} placeholder="сумма" value={sub.amount} onChange={(e) => setSub({ ...sub, amount: e.target.value })} />
              <input className="text" autoCorrect="off" spellCheck={false} placeholder="счёт" list="fin-accts" value={sub.account} onChange={(e) => setSub({ ...sub, account: e.target.value })} />
              <input className="text short" autoCorrect="off" spellCheck={false} placeholder="день" value={sub.day} onChange={(e) => setSub({ ...sub, day: e.target.value })} />
              <input className="text" autoCorrect="off" spellCheck={false} placeholder="категория" value={sub.category} onChange={(e) => setSub({ ...sub, category: e.target.value })} />
              <button type="submit" disabled={!sub.name.trim() || !sub.amount.trim()}>+ подписка</button>
            </form>
            <p className="g-cap">В день списания приложение само добавит операцию в файл дня с заметкой «подписка: …».</p>
          </Block>
        </div>

        <Block title="Долги" right={<>мне <b className="pos">{fmt(owedToMe)}</b> · я <b className="neg">{fmt(iOwe)}</b> ₸</>}>
          {people_.map((x) => {
            const paying = pay && pay.who === x.who && pay.direction === x.direction;
            return (
              <div key={x.who + x.direction} className={`g-debt ${x.direction === DEBT_I_OWE ? "owe" : "due"}`}>
                <div className="who"><SourceLink source={`[[${x.who}]]`} /><small>{x.direction} · {x.count} {x.count === 1 ? "долг" : "долгов"} · с {x.oldest}</small></div>
                <i><u style={{ width: `${(x.left / maxDebt) * 100}%` }} /></i>
                <b>{fmt(x.left)} ₸</b>
                <span className="acts"><button type="button" onClick={() => setPay(paying ? null : { who: x.who, direction: x.direction, amount: "", account: accountNames[0] ?? "" })}>{paying ? "отмена" : "внести"}</button><button type="button" onClick={() => void closePerson(x.who, x.direction, x.left)}>закрыть всё</button></span>
                {paying && pay && (
                  <form className="g-addrow pay" onSubmit={(e) => { e.preventDefault(); void doPay(); }}>
                    <span>{pay.direction === DEBT_I_OWE ? "отдаю" : "возвращают"}</span>
                    <input className="text" autoFocus autoCorrect="off" spellCheck={false} placeholder="сколько" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
                    <select className="text" value={pay.account} onChange={(e) => setPay({ ...pay, account: e.target.value })}>
                      <option value="">без операции</option>
                      {accountNames.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <button type="submit" disabled={!pay.amount.trim()}>записать</button>
                    <small>Сумма пойдёт на самые старые долги; со счётом операция ляжет в сегодняшний день.</small>
                  </form>
                )}
              </div>
            );
          })}
          {!people_.length && <p className="g-faint">Открытых долгов нет.</p>}
          <form className="g-addrow" onSubmit={(e) => { e.preventDefault(); addDebt(); }}>
            <input className="text" autoCorrect="off" spellCheck={false} placeholder="кто (из людей или текст)" list="fin-people" value={debt.who} onChange={(e) => setDebt({ ...debt, who: e.target.value })} />
            <select className="text" value={debt.direction} onChange={(e) => setDebt({ ...debt, direction: e.target.value })}>
              <option value={DEBT_THEY_OWE}>{DEBT_THEY_OWE}</option>
              <option value={DEBT_I_OWE}>{DEBT_I_OWE}</option>
            </select>
            <input className="text" autoCorrect="off" spellCheck={false} placeholder="сумма" value={debt.amount} onChange={(e) => setDebt({ ...debt, amount: e.target.value })} />
            <input className="text short" autoCorrect="off" spellCheck={false} placeholder="валюта" value={debt.currency} onChange={(e) => setDebt({ ...debt, currency: e.target.value })} />
            <input className="text" autoCorrect="off" spellCheck={false} placeholder="заметка" value={debt.note} onChange={(e) => setDebt({ ...debt, note: e.target.value })} />
            <button type="submit" disabled={!debt.who.trim() || !debt.amount.trim()}>+ долг</button>
          </form>
          {debts.some((d) => d.closed) && (
            <details className="g-ops">
              <summary>Закрытые · {debts.filter((d) => d.closed).length}</summary>
              {debts.filter((d) => d.closed).map((d, k) => <div key={k} className="closed"><span><SourceLink source={d.who} /></span><em>{d.direction}</em><b>{fmt(d.amount)} {d.currency}</b><span>{d.note}</span><span>закрыт {d.closed}</span></div>)}
            </details>
          )}
          <p className="g-cap">За что именно и когда — на странице человека. Claude дописывает сюда строки, когда узнаёт о долге из разговора.</p>
        </Block>

        <datalist id="fin-accts">{accountNames.map((a) => <option key={a} value={a} />)}</datalist>
        <datalist id="fin-people">{[...new Set(people)].map((x) => <option key={x} value={x} />)}</datalist>
        <datalist id="fin-cats">{month.cats.map(([c]) => <option key={c} value={c} />)}</datalist>
      </div>
    </div>
  );
}
