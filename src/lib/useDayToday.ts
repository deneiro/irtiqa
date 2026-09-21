import { useEffect, useState } from "react";
import { dayToday, nextDayBoundary } from "./maghrib";

/** The open day file, re-rendering when maghrib turns it over. */
export function useDayToday(): string {
  const [day, setDay] = useState(dayToday);
  useEffect(() => {
    const ms = Math.max(1000, nextDayBoundary().getTime() - Date.now() + 1000);
    const id = window.setTimeout(() => setDay(dayToday()), Math.min(ms, 2 ** 31 - 1));
    return () => window.clearTimeout(id);
  }, [day]);
  return day;
}
