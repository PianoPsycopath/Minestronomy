import { $ } from "./dom.js";
import { zToLatitude } from "../core/astronomy/index.js";

// Reads the observer and disc settings from the settings panel.
export function readObserver() {
  const Z = +$("z").value;
  return { Z, phi: zToLatitude(Z), disc: +$("disc").value, md: +$("mdisc").value };
}
