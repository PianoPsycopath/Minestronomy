import { $ } from "./dom.js";

const KEY = "minestronomy.sound";
const VOICES = {
  tab: { from: 740, to: 988, ms: 130, vol: 0.05 },
  pop: { from: 520, to: 780, ms: 95, vol: 0.045 },
  tick: { from: 880, to: 900, ms: 45, vol: 0.03 }
};

let ctx = null;
let enabled = readSetting();

function readSetting() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

function writeSetting(on) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // The sound still works for this session.
  }
}

function blip({ from, to, ms, vol }) {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  const t0 = ctx.currentTime;
  const t1 = t0 + ms / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(to, t1);
  // A short attack stops the click that a hard start makes.
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

function voiceFor(target) {
  if (target.closest(".wii-tab")) return VOICES.tab;
  if (target.closest(".wii-seg, .wii-step-btn, .find-row, .fc-next-chip, input[type=checkbox]")) return VOICES.tick;
  if (target.closest("button")) return VOICES.pop;
  return null;
}

export function initSound() {
  const toggle = $("uiSounds");
  if (toggle) {
    toggle.checked = enabled;
    toggle.onchange = () => {
      enabled = toggle.checked;
      writeSetting(enabled);
    };
  }
  document.addEventListener("click", e => {
    if (!enabled || !(e.target instanceof Element)) return;
    const voice = voiceFor(e.target);
    if (voice) blip(voice);
  });
}