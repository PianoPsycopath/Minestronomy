import { getMonthSpan } from "../../core/calendar.js";

// Weeks run Sunday to Saturday. Day 0 is a Tuesday, so Sunday is the day where day % 7 === 5.
export const weekStart = d => d - ((((d - 5) % 7) + 7) % 7);

// g0..g1 are the days drawn (whole weeks). m0..m1 are the days that belong to the shown month or week.
export function getForecastRange(view, anchor, t) {
  const a = anchor ?? Math.floor(t);
  if (view === "week") {
    const g0 = weekStart(a);
    return { a, g0, g1: g0 + 7, m0: g0, m1: g0 + 7 };
  }
  const m = getMonthSpan(a);
  return { a, g0: weekStart(m.start), g1: weekStart(m.end - 1) + 7, m0: m.start, m1: m.end };
}
