import { $, el } from "../dom.js";
import { EVENT_KINDS, findNextEvents } from "../../forecast/index.js";
import { getCalendarInfo } from "../../core/calendar.js";
import { readObserver } from "../observer.js";

// The "Next" row: the next few events of the chosen kind. A click moves the calendar to the event.
export function renderNextBar(panel) {
  const list = $("nextList");
  if (!list) return;
  const { Z, disc, md } = readObserver();
  const from = Math.floor(panel.app.state.t);
  const visibleOnly = panel.cats.has("vis");
  const key = [panel.nextKind, panel.nextCount, Z, disc, md, visibleOnly].join("|");

  let c = panel.nextCache;
  const valid = c && c.key === key && c.from <= from && (!c.list.length || c.list[0].t >= from);
  if (!valid) {
    c = {
      key,
      from,
      list: findNextEvents({ kind: panel.nextKind, from, count: panel.nextCount, Z, disc, md, visibleOnly })
    };
    panel.nextCache = c;
  }

  list.innerHTML = "";
  if (!c.list.length) list.appendChild(el("span", "side-empty", "None found in the next ~20 years."));
  for (const ev of c.list) {
    const d = Math.floor(ev.t);
    const cal = getCalendarInfo(d);
    const chip = el(
      "button",
      `fc-next-chip${d === panel.pinned ? " active" : ""}`,
      `<b>${cal.monthShort} ${cal.dayOrd}, Y${cal.year}</b><span>${ev.title}</span><em>${d - from <= 0 ? "today" : `in ${d - from}d`}</em>`
    );
    chip.type = "button";
    chip.style.setProperty("--k", EVENT_KINDS[ev.kind].color);
    chip.title = ev.sub;
    chip.onclick = () => panel.goToDay(d);
    list.appendChild(chip);
  }

  const more = el("button", "fc-next-more", "+5 more");
  more.type = "button";
  more.onclick = () => {
    panel.nextCount += 5;
    renderNextBar(panel);
  };
  list.appendChild(more);
}
