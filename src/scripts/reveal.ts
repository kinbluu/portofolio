// Decorative skeletons reveal existing server-rendered content; they never gate data or navigation.
export function initializeSkeletonReveals() {
  const sections = [
    ...document.querySelectorAll<HTMLElement>("[data-skeleton-reveal]"),
  ];
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  if (
    !sections.length ||
    preference.matches ||
    document.hidden ||
    typeof IntersectionObserver === "undefined"
  ) {
    return () => {};
  }

  const controller = new AbortController();
  const options = { signal: controller.signal };
  const timers = new Map<HTMLElement, number>();
  let observer: IntersectionObserver | undefined;

  const finish = (section: HTMLElement) => {
    const timer = timers.get(section);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.delete(section);
    section.dataset.skeletonState = "ready";
    observer?.unobserve(section);
  };
  const dispose = () => {
    controller.abort();
    observer?.disconnect();
    sections.forEach(finish);
  };
  const revealTarget = () => {
    const target = document.querySelector(":target");
    if (target)
      sections.filter((section) => section.contains(target)).forEach(finish);
  };

  try {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const section = entry.target as HTMLElement;
          if (
            !entry.isIntersecting ||
            section.dataset.skeletonState !== "pending"
          )
            continue;
          section.dataset.skeletonState = "revealing";
          observer?.unobserve(section);
          // CSS finishes in 580ms. The timer also clears masks if animation events are missed.
          timers.set(
            section,
            window.setTimeout(() => finish(section), 650),
          );
        }
      },
      { threshold: 0 },
    );

    for (const section of sections) {
      if (
        section.dataset.skeletonState === "ready" ||
        section.contains(document.activeElement)
      ) {
        finish(section);
        continue;
      }
      section.dataset.skeletonState = "pending";
      section.addEventListener("focusin", () => finish(section), options);
      section.addEventListener("pointerdown", () => finish(section), options);
      observer.observe(section);
    }
    revealTarget();
    preference.addEventListener("change", dispose, options);
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) dispose();
      },
      options,
    );
    window.addEventListener("hashchange", revealTarget, options);
    window.addEventListener("beforeprint", dispose, options);
    window.addEventListener("pagehide", dispose, options);
  } catch {
    // A failed enhancement must never leave the portfolio covered by placeholders.
    dispose();
  }

  return dispose;
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  initializeSkeletonReveals();
}
