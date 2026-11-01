import { inView } from "motion";
import { animate } from "motion/mini";

const daysPerWeek = 7;
const maxStaggerSteps = 5;
const margin = "0px 0px -10% 0px";

const motionAllowed = () =>
  matchMedia("(prefers-reduced-motion: no-preference)").matches;

function tokens() {
  const root = getComputedStyle(document.documentElement);
  const token = (name: string) => root.getPropertyValue(name).trim();
  const seconds = (name: string) =>
    parseFloat(token(name)) / (token(name).endsWith("ms") ? 1000 : 1);
  return {
    duration: seconds("--rm3-duration-enter"),
    step: seconds("--rm3-stagger"),
    rise: parseFloat(token("--rm3-rise")),
    ease: token("--rm3-ease-out")
      .match(/-?[\d.]+/g)
      ?.map(Number) as [number, number, number, number],
  };
}

// Each variant names the edge a section arrives from, so neighbouring sections
// do not read as the same block sliding in twice.
const variants: Record<
  string,
  (rise: number) => { translate: string; scale?: number }
> = {
  up: (rise) => ({ translate: `0 ${rise}px` }),
  left: (rise) => ({ translate: `${-rise * 2}px 0` }),
  right: (rise) => ({ translate: `${rise * 2}px 0` }),
  fade: () => ({ translate: "0 0" }),
  scale: () => ({ translate: "0 0", scale: 0.96 }),
};

const variantFor = (element: HTMLElement) =>
  variants[element.dataset.reveal ?? ""] ?? variants.up;

const belowFold = (selector: string) =>
  [...document.querySelectorAll<HTMLElement>(selector)].filter((element) => {
    const { top, height } = element.getBoundingClientRect();
    return height > 0 && top >= innerHeight;
  });

// Called by <contribution-grid> on connect: its cells arrive late via a server island.
export function revealCells(grid: HTMLElement) {
  const { top, height } = grid.getBoundingClientRect();
  if (!motionAllowed() || height === 0 || top < innerHeight) return () => {};

  const { duration, ease } = tokens();
  const cells = [...grid.children] as HTMLElement[];
  const weeks = Math.ceil(cells.length / daysPerWeek);
  for (const cell of cells) cell.style.opacity = "0";
  return inView(
    grid,
    () => {
      animate(
        cells,
        { opacity: [0, 1] },
        {
          duration,
          ease,
          delay: (index) =>
            (Math.floor(index / daysPerWeek) / weeks) * duration,
        },
      );
    },
    { margin },
  );
}

function revealOnScroll() {
  const { duration, step, rise, ease } = tokens();
  const items = belowFold("[data-reveal]");
  for (const item of items) {
    const { translate, scale } = variantFor(item)(rise);
    Object.assign(item.style, {
      opacity: "0",
      translate,
      ...(scale !== undefined && { scale: String(scale) }),
    });
  }

  let batch: HTMLElement[] = [];
  const revealBatch = () => {
    const targets = batch.sort(
      (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
    );
    batch = [];
    const groups = new Map<string, HTMLElement[]>();
    for (const target of targets) {
      const key = target.dataset.reveal ?? "";
      groups.set(key, [...(groups.get(key) ?? []), target]);
    }
    for (const [key, group] of groups) {
      const { translate, scale } = (variants[key] ?? variants.up)(rise);
      animate(
        group,
        {
          opacity: [0, 1],
          translate: [translate, "0 0"],
          ...(scale !== undefined && { scale: [scale, 1] }),
        },
        {
          duration,
          ease,
          delay: (index) => Math.min(index, maxStaggerSteps) * step,
        },
      );
    }
  };

  inView(
    items,
    (item) => {
      if (!batch.length) queueMicrotask(revealBatch);
      batch.push(item as HTMLElement);
    },
    { margin },
  );
}

if (motionAllowed()) revealOnScroll();
