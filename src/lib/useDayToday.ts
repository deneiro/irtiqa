import { useEffect, useState } from "react";
import { dayToday } from "./maghrib";

/**
 * The open day file, re-rendering when the day turns over. Checked every
 * minute and whenever the window comes back: one long timer to the boundary
 * stops while the Mac sleeps and fired hours late, leaving yesterday on screen.
 */
export function useDayToday(): string {
  const [day, setDay] = useState(dayToday);
  useEffect(() => {
    const check = () => setDay(dayToday());
    const id = window.setInterval(check, 60_000);
    const onShow = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", check);
    };
  }, []);
  return day;
}
