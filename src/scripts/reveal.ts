import { inView } from "motion";
import { animate } from "motion/mini";

const daysPerWeek = 7;
const maxStaggerSteps = 5;
const margin = "0px 0px -10% 0px";

function revealOnScroll() {
  const tokens = getComputedStyle(document.documentElement);
  const token = (name: string) => tokens.getPropertyValue(name).trim();
  const seconds = (name: string) =>
    parseFloat(token(name)) / (token(name).endsWith("ms") ? 1000 : 1);
  const duration = seconds("--rm3-duration-enter");
  const step = seconds("--rm3-stagger");
  const rise = `0 ${token("--rm3-rise")}`;
  const ease = token("--rm3-ease-out")
    .match(/-?[\d.]+/g)
    ?.map(Number) as [number, number, number, number];

  const belowFold = (selector: string) =>
    [...document.querySelectorAll<HTMLElement>(selector)].filter((element) => {
      const { top, height } = element.getBoundingClientRect();
      return height > 0 && top >= innerHeight;
    });

  const items = belowFold("[data-reveal]");
  const grids = belowFold("[data-reveal-cells]");
  for (const item of items)
    Object.assign(item.style, { opacity: "0", translate: rise });
  for (const grid of grids)
    for (const cell of grid.children) (cell as HTMLElement).style.opacity = "0";

  let batch: HTMLElement[] = [];
  const revealBatch = () => {
    const targets = batch.sort(
      (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
    );
    batch = [];
    animate(
      targets,
      { opacity: [0, 1], translate: [rise, "0 0"] },
      {
        duration,
        ease,
        delay: (index) => Math.min(index, maxStaggerSteps) * step,
      },
    );
  };

  inView(
    items,
    (item) => {
      if (!batch.length) queueMicrotask(revealBatch);
      batch.push(item as HTMLElement);
    },
    { margin },
  );

  inView(
    grids,
    (grid) => {
      const cells = [...grid.children];
      const weeks = Math.ceil(cells.length / daysPerWeek);
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

if (matchMedia("(prefers-reduced-motion: no-preference)").matches)
  revealOnScroll();
