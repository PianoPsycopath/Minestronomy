const GROUP_IDS = ["viewGroup", "solarScaleGroup", "nextKindGroup"];

function attach(group) {
  const thumb = document.createElement("i");
  thumb.className = "seg-thumb";
  group.classList.add("has-thumb");
  group.prepend(thumb);

  const place = glide => {
    const on = group.querySelector(".wii-seg.active");
    thumb.hidden = !on || !on.offsetWidth;
    if (thumb.hidden) return;
    // A first placement must not glide in from the corner.
    if (!glide) thumb.style.transition = "none";
    thumb.style.width = `${on.offsetWidth}px`;
    thumb.style.height = `${on.offsetHeight}px`;
    thumb.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
    if (!glide) {
      thumb.offsetWidth;
      thumb.style.transition = "";
    }
  };

  new MutationObserver(() => place(true)).observe(group, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"]
  });
  new ResizeObserver(() => place(false)).observe(group);
  place(false);
}

export function initSegThumbs() {
  for (const id of GROUP_IDS) {
    const group = document.getElementById(id);
    if (group) attach(group);
  }
}