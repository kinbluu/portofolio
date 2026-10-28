import type { StudioContent, StudioRoom } from "./studio-room";

export function mountStudio() {
  const root = document.querySelector<HTMLElement>("[data-studio-root]");
  const canvas = root?.querySelector<HTMLCanvasElement>("[data-studio-canvas]");
  const chapters = [
    ...document.querySelectorAll<HTMLElement>("[data-studio-chapter]"),
  ];
  const experienceItems = [
    ...document.querySelectorAll<HTMLElement>("[data-experience-item]"),
  ];
  const button = document.querySelector<HTMLButtonElement>(
    "[data-studio-motion]",
  );
  if (
    !root ||
    !canvas ||
    !button ||
    !chapters.length ||
    root.dataset.studioMounted
  )
    return;
  root.dataset.studioMounted = "true";
  const lifecycle = new AbortController();
  const { signal } = lifecycle;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = reduced.matches;
  let progress = 0;
  let frame = 0;
  let room: StudioRoom | undefined;
  let disposed = false;
  const links = [
    ...document.querySelectorAll<HTMLAnchorElement>(
      "[data-studio-chapter-link], .studio-desktop-nav a",
    ),
  ];
  const motion = () => {
    document.documentElement.dataset.motionPaused = String(paused);
    button.hidden = false;
    button.setAttribute("aria-pressed", String(paused));
    button.setAttribute(
      "aria-label",
      paused ? "Resume camera motion" : "Pause camera motion",
    );
    button.title = paused ? "Resume camera motion" : "Pause camera motion";
    const label = button.querySelector("[data-motion-label]");
    if (label) label.textContent = paused ? "Resume motion" : "Pause motion";
    button
      .querySelector("path")
      ?.setAttribute("d", paused ? "M7 4l8 6-8 6V4Z" : "M7 5v10M13 5v10");
    room?.setView(progress, paused);
    schedule();
  };
  const update = () => {
    frame = 0;
    const tops = chapters.map((chapter) => chapter.getBoundingClientRect().top);
    const distance = Math.max(0, -tops[0]);
    const positions = tops.map((top) => top - tops[0]);
    let index = 0;
    for (let i = 1; i < positions.length; i++)
      if (positions[i] <= distance + 120) index = i;
    const next = positions[index + 1];
    const between =
      next === undefined
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              (distance - positions[index]) / (next - positions[index]),
            ),
          );
    progress = index + between;
    root.dataset.activeChapter = chapters[index].id;
    if (!room || root.dataset.studioState === "fallback")
      document.documentElement.style.setProperty(
        "--studio-shift",
        !paused && chapters[index].dataset.studioSide === "right" ? "-1" : "0",
      );
    const label = root.querySelector("[data-studio-scene-label]");
    if (label)
      label.textContent =
        String(index + 1).padStart(2, "0") +
        " / " +
        chapters[index].dataset.studioLabel;
    for (const link of links) {
      if (link.hash === "#" + chapters[index].id)
        link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    }
    document.documentElement.style.setProperty(
      "--studio-progress",
      String(Math.min(1, distance / Math.max(1, positions.at(-1)!))),
    );
    room?.setView(progress, paused);
    let activeExperience = -1;
    if (chapters[index].id === "experience") {
      let nearest = Number.POSITIVE_INFINITY;
      experienceItems.forEach((item, itemIndex) => {
        const bounds = item.getBoundingClientRect();
        const distance = Math.abs(
          bounds.top + bounds.height / 2 - innerHeight / 2,
        );
        if (distance < nearest) {
          nearest = distance;
          activeExperience = itemIndex;
        }
      });
    }
    room?.setExperience(activeExperience);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const observer = new ResizeObserver(schedule);
  chapters.forEach((chapter) => observer.observe(chapter));
  document.addEventListener("scroll", schedule, {
    capture: true,
    passive: true,
    signal,
  });
  window.addEventListener("resize", schedule, { passive: true, signal });
  button.addEventListener(
    "click",
    () => {
      paused = !paused;
      motion();
    },
    { signal },
  );
  reduced.addEventListener(
    "change",
    () => {
      paused = reduced.matches;
      motion();
    },
    { signal },
  );
  const theme = new MutationObserver(() => room?.setTheme());
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  const dispose = () => {
    disposed = true;
    lifecycle.abort();
    observer.disconnect();
    theme.disconnect();
    cancelAnimationFrame(frame);
    room?.dispose();
  };
  window.addEventListener(
    "pagehide",
    (event) => {
      if (!event.persisted) dispose();
    },
    { signal },
  );
  document.addEventListener("astro:before-swap", dispose, {
    once: true,
    signal,
  });
  motion();
  update();
  const start = async () => {
    try {
      const { createStudioRoom } = await import("./studio-room");
      if (disposed) return;
      room = await createStudioRoom(
        canvas,
        root,
        JSON.parse(root.dataset.studioConfig!) as StudioContent,
      );
      if (disposed) {
        room.dispose();
        return;
      }
      room.setView(progress, paused);
      room.startAssembly();
      root.dataset.studioState = "ready";
      schedule();
    } catch {
      root.dataset.studioState = "fallback";
      root.dataset.studioSettled = "true";
      button.hidden = true;
      const label = root.querySelector("[data-studio-renderer-label]");
      if (label) label.textContent = "Illustrated view";
    }
  };
  if ("requestIdleCallback" in window)
    window.requestIdleCallback(() => void start(), { timeout: 1500 });
  else void start();
}
