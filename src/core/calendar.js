import { DOW_NAMES, DOW_SHORT, MONTHS } from "../config/index.js";
import { ordinal } from "./math.js";

export function getCalendarInfo(dayInt) {
  const year = Math.floor(dayInt / 365);
  let doy = (((dayInt % 365) + 365) % 365) + 1;
  if (doy >= 365) doy -= 365;
  let mIdx = 0;
  while (mIdx < 11 && doy >= MONTHS[mIdx].days) {
    doy -= MONTHS[mIdx].days;
    mIdx++;
  }
  const dayOfMonth = doy + 1;
  const dowIdx = ((dayInt % 7) + 7) % 7;
  return {
    dow: DOW_NAMES[dowIdx],
    dowShort: DOW_SHORT[dowIdx],
    month: MONTHS[mIdx].name,
    monthShort: MONTHS[mIdx].short,
    monthIndex: mIdx,
    dayOfMonth,
    dayOrd: ordinal(dayOfMonth),
    year,
    fullText: `${DOW_NAMES[dowIdx]}, ${MONTHS[mIdx].name} ${ordinal(dayOfMonth)}, Year ${year}`
  };
}

// Search with getCalendarInfo. A second formula can disagree with it.
// Returns null when the date does not exist.
export function getDayFromDate(year, monthIdx, dayOfMonth) {
  const first = year * 365;
  for (let d = first; d < first + 365; d++) {
    const info = getCalendarInfo(d);
    if (info.monthIndex === monthIdx && info.dayOfMonth === dayOfMonth) return d;
  }
  return null;
}

// Returns the first day and the end day (exclusive) of the month that contains the day.
// The function steps by day of month, so it is correct at year boundaries.
export function getMonthSpan(day) {
  const dom = d => getCalendarInfo(d).dayOfMonth;
  let start = day;
  while (dom(start - 1) === dom(start) - 1) start--;
  let end = day;
  while (dom(end + 1) === dom(end) + 1) end++;
  return { start, end: end + 1 };
}