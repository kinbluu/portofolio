import { animate, scroll } from "motion";

const motionAllowed = () =>
  matchMedia("(prefers-reduced-motion: no-preference)").matches;
const finePointer = () =>
  matchMedia("(hover: hover) and (pointer: fine)").matches;

// The page is one long scroll, so the header carries the reader's position.
// It tracks scroll 1:1 rather than animating over time, so it stays on under
// reduced motion: it is a position readout, not decoration.
function scrollProgress() {
  const bar = document.querySelector<HTMLElement>("[data-scroll-progress]");
  if (!bar) return;
  scroll(animate(bar, { scaleX: [0, 1] }, { ease: "linear" }), {
    target: document.documentElement,
    offset: ["start start", "end end"],
  });
}

// The intro recedes as it leaves, so the first section reads as a new plane.
function heroRecede() {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!hero) return;
  scroll(
    animate(hero, { opacity: [1, 0.55], y: [0, -32] }, { ease: "linear" }),
    { target: hero, offset: ["start start", "end start"] },
  );
}

// Spring on press feedback: the link answers the pointer, not just its colour.
function springLinks() {
  if (!finePointer()) return;
  const spring = { type: "spring", stiffness: 420, damping: 26 } as const;
  for (const link of document.querySelectorAll<HTMLElement>("[data-spring]")) {
    const grow = () => animate(link, { scale: 1.04 }, spring);
    const settle = () => animate(link, { scale: 1 }, spring);
    link.addEventListener("pointerenter", grow);
    link.addEventListener("pointerleave", settle);
    link.addEventListener("focus", grow);
    link.addEventListener("blur", settle);
  }
}

scrollProgress();

if (motionAllowed()) {
  heroRecede();
  springLinks();
}
