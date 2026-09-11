import { useEffect, useRef } from "react";
import { useStore } from "../store";
import { todayStr } from "./dates";
import { subscriptionNote, subscriptionsDue } from "./life";

/**
 * On the charge day, post each subscription as a transaction into today's
 * day file — once. Runs whenever the vault rescans; a closed day is left alone.
 */
export function useSubscriptionCharges(): void {
  const { life, updateToday } = useStore();
  const posted = useRef(new Set<string>());
  useEffect(() => {
    if (!life) return;
    const today = todayStr();
    const day = life.days.get(today);
    if (day?.closed) return;
    const txs = day?.txs ?? [];
    const fresh = subscriptionsDue(life.subscriptions, today)
      .filter((s) => !txs.some((t) => t.note === subscriptionNote(s)))
      .filter((s) => !posted.current.has(`${today}|${s.name}`));
    if (!fresh.length) return;
    for (const s of fresh) posted.current.add(`${today}|${s.name}`);
    void updateToday((d) => ({
      ...d,
      txs: [...d.txs, ...fresh.map((s) => ({ amount: -s.amount, category: s.category, account: s.account, note: subscriptionNote(s) }))],
    }));
  }, [life, updateToday]);
}
