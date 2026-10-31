import Lenis from "lenis";

interface MotionPreference {
  readonly matches: boolean;
  addEventListener(type: "change", listener: () => void): void;
  removeEventListener(type: "change", listener: () => void): void;
}

interface ScrollInstance {
  destroy(): void;
}

export function watchScrollMotion(
  preference: MotionPreference,
  create: () => ScrollInstance,
): () => void {
  let instance: ScrollInstance | undefined;
  const update = () => {
    if (preference.matches) {
      instance?.destroy();
      instance = undefined;
    } else if (!instance) {
      instance = create();
    }
  };

  preference.addEventListener("change", update);
  update();

  return () => {
    preference.removeEventListener("change", update);
    instance?.destroy();
    instance = undefined;
  };
}

if (typeof window !== "undefined") {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let dispose: (() => void) | undefined;
  const mount = () => {
    dispose ??= watchScrollMotion(preference, createSmoothScroll);
  };
  const unmount = () => {
    dispose?.();
    dispose = undefined;
  };

  mount();
  window.addEventListener("pagehide", unmount);
  window.addEventListener("pageshow", mount);
}
function createSmoothScroll(): ScrollInstance {
  const lenis = new Lenis({ autoRaf: true, allowNestedScroll: true });

  const onAnchorClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;

    const link = event
      .composedPath()
      .find(
        (node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement,
      );
    if (
      !link?.getAttribute("href")?.includes("#") ||
      link.hasAttribute("download") ||
      (link.target && link.target.toLowerCase() !== "_self") ||
      link.origin !== window.location.origin ||
      link.pathname !== window.location.pathname ||
      link.search !== window.location.search
    )
      return;

    lenis.stop();
    lenis.start();
  };

  window.addEventListener("click", onAnchorClick);
  return {
    destroy() {
      window.removeEventListener("click", onAnchorClick);
      lenis.destroy();
    },
  };
}
