const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_POP = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const MORPH_MS = 420;
const CONTENT_DELAY = 0.45;
const SLIDE_SHIFT_PCT = 7;
const MAX_STAGGER = 5;
const STAGGER_MS = 35;

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const SLIDES = {
  next: { ms: 300, from: { opacity: 0, transform: `translateX(${SLIDE_SHIFT_PCT}%)` } },
  prev: { ms: 300, from: { opacity: 0, transform: `translateX(-${SLIDE_SHIFT_PCT}%)` } },
  fade: { ms: 220, from: { opacity: 0, transform: "scale(0.985)" } }
};

export class BoardMotion {
  constructor(board) {
    this.board = board;
    this.anims = [];
    this.kind = null;
    this.rects = null;
  }

  // The old cell positions must be read before the rebuild. The rebuild removes the old cells.
  before(kind) {
    this.stop();
    if (reduced() || !kind) return;
    this.kind = kind;
    if (kind !== "morph") return;
    this.rects = new Map();
    for (const cell of this.board.querySelectorAll(".fc-day")) {
      this.rects.set(cell.dataset.day, cell.getBoundingClientRect());
    }
  }

  after() {
    const kind = this.kind;
    this.kind = null;
    if (!kind) return;
    if (kind === "morph") this.morph();
    else this.slide(kind);
  }

  slide(kind) {
    const { ms, from } = SLIDES[kind] ?? SLIDES.fade;
    this.anims = [this.board.animate([from, { opacity: 1, transform: "none" }], { duration: ms, easing: EASE_OUT })];
  }

  // The board is already at its final size here. Only the cells move, so the board cannot look squashed.
  morph() {
    const { board } = this;
    const before = this.rects;
    this.rects = null;
    if (!before) return;

    board.classList.add("morphing");
    const cells = [...board.querySelectorAll(".fc-day")];
    // All reads come before all writes, so the browser lays out only once.
    const after = cells.map(c => c.getBoundingClientRect());
    const anims = [];

    cells.forEach((cell, i) => {
      const from = before.get(cell.dataset.day);
      const to = after[i];
      if (!from) {
        anims.push(
          cell.animate(
            [{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "none" }],
            { duration: MORPH_MS, easing: EASE_OUT, fill: "backwards" }
          )
        );
        return;
      }
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      anims.push(
        cell.animate(
          [
            { transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})` },
            { transformOrigin: "0 0", transform: "none" }
          ],
          { duration: MORPH_MS, easing: EASE_OUT, fill: "backwards" }
        )
      );
      // Text that is stretched looks wrong. The content appears when the cell is close to its size.
      for (const child of cell.children) {
        anims.push(
          child.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: MORPH_MS * (1 - CONTENT_DELAY),
            delay: MORPH_MS * CONTENT_DELAY,
            easing: "ease-out",
            fill: "backwards"
          })
        );
      }
    });

    for (const week of board.querySelectorAll(".fc-week")) {
      anims.push(week.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MORPH_MS, easing: EASE_OUT, fill: "backwards" }));
    }

    this.anims = anims;
    const mine = anims;
    Promise.allSettled(anims.map(a => a.finished)).then(() => {
      if (this.anims === mine) this.stop();
    });
  }

  stop() {
    for (const a of this.anims) a.cancel();
    this.anims = [];
    this.kind = null;
    this.rects = null;
    this.board.classList.remove("morphing");
  }
}

// The stagger has a limit. A long list must not feel slow.
export function popIn(nodes) {
  if (reduced()) return;
  nodes.forEach((n, i) =>
    n.animate(
      [{ opacity: 0, transform: "translateY(6px) scale(0.96)" }, { opacity: 1, transform: "none" }],
      { duration: 220, delay: Math.min(i, MAX_STAGGER) * STAGGER_MS, easing: EASE_POP, fill: "backwards" }
    )
  );
}