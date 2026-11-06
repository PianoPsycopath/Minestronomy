import { DOW_NAMES, DOW_SHORT, MONTHS } from "../config/constants.js";
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
    dayOfMonth,
    dayOrd: ordinal(dayOfMonth),
    year,
    fullText: `${DOW_NAMES[dowIdx]}, ${MONTHS[mIdx].name} ${ordinal(dayOfMonth)}, Year ${year}`
  };
}

export function getTickInfo(tVal) {
  const day = Math.floor(tVal);
  const tod = tVal - day;
  const sh = tod >= 0.25 ? tod - 0.25 : tod + 0.75;
  const todTicks = Math.round(sh * 24000) % 24000;
  const totalTicks = day * 24000 + todTicks;
  return { day, todTicks, totalTicks };
}

export function totalTicksToTime(totalTicks) {
  const day = Math.floor(totalTicks / 24000);
  const todTicks = ((totalTicks % 24000) + 24000) % 24000;
  const sh = todTicks / 24000;
  const tod = (sh + 0.25) % 1;
  return day + tod;
}

export function hhmm24(td) {
  const m = Math.round(td * 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
}

export function hhmm12(td) {
  const m = Math.round(td * 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const min = String(m % 60).padStart(2, "0");
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}