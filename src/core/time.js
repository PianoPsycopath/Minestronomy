// The day number of the web page changes at midnight.
// The Minecraft day number (query.day) changes at sunrise, at tick 0.
// Ticks 18000 to 23999 (midnight to sunrise) therefore belong to the previous Minecraft day.
// The resource pack applies the same correction in Molang.
export function getTickInfo(tVal) {
  const day = Math.floor(tVal);
  const tod = tVal - day;
  const sh = tod >= 0.25 ? tod - 0.25 : tod + 0.75;
  const mcDay = tod < 0.25 ? day - 1 : day;
  const totalTicks = Math.round(mcDay * 24000 + sh * 24000);
  const todTicks = ((totalTicks % 24000) + 24000) % 24000;
  return { day, todTicks, totalTicks };
}

export function totalTicksToTime(totalTicks) {
  const day = Math.floor(totalTicks / 24000);
  const todTicks = ((totalTicks % 24000) + 24000) % 24000;
  const sh = todTicks / 24000;
  const tod = (sh + 0.25) % 1;
  return day + tod + (tod < 0.25 ? 1 : 0);
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
