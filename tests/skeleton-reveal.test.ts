// Run: bun tests/skeleton-reveal.test.ts
import assert from "node:assert/strict";
import { initializeSkeletonReveals } from "../src/scripts/reveal";

class Section extends EventTarget {
  dataset: Record<string, string> = {};
  children = new Set<unknown>();
  contains(target: unknown) {
    return target === this || this.children.has(target);
  }
}

class Page extends EventTarget {
  hidden = false;
  activeElement: unknown = null;
  target: unknown = null;
  sections = [new Section(), new Section()];
  querySelectorAll() {
    return this.sections;
  }
  querySelector() {
    return this.target;
  }
}

class Viewport extends EventTarget {
  timers = new Map<number, () => void>();
  nextTimer = 0;
  setTimeout(callback: () => void) {
    this.timers.set(++this.nextTimer, callback);
    return this.nextTimer;
  }
  clearTimeout(id: number) {
    this.timers.delete(id);
  }
  flush() {
    [...this.timers.values()].forEach((callback) => callback());
  }
}

interface Options {
  reducedMotion?: boolean;
  hidden?: boolean;
  unsupported?: boolean;
  focused?: boolean;
  anchored?: boolean;
  brokenObserver?: boolean;
  empty?: boolean;
}

function scenario(
  options: Options,
  verify: (environment: ReturnType<typeof setup>) => void,
) {
  const environment = setup(options);
  let cleanup: (() => void) | undefined;
  try {
    cleanup = initializeSkeletonReveals();
    verify(environment);
  } finally {
    cleanup?.();
    environment.restore();
  }
}

function setup(options: Options) {
  const page = new Page();
  page.hidden = options.hidden ?? false;
  if (options.empty) page.sections = [];
  if (options.focused) page.activeElement = page.sections[0];
  if (options.anchored) page.target = page.sections[0];
  const viewport = new Viewport();
  const preference = Object.assign(new EventTarget(), {
    matches: options.reducedMotion ?? false,
  });
  const observers: Observer[] = [];

  class Observer {
    targets = new Set<Section>();
    disconnected = false;
    constructor(private callback: IntersectionObserverCallback) {
      observers.push(this);
    }
    observe(section: Section) {
      if (options.brokenObserver) throw new Error("Observer unavailable");
      this.targets.add(section);
    }
    unobserve(section: Section) {
      this.targets.delete(section);
    }
    disconnect() {
      this.disconnected = true;
      this.targets.clear();
    }
    enter(section: Section, isIntersecting = true) {
      this.callback(
        [
          { target: section, isIntersecting },
        ] as unknown as IntersectionObserverEntry[],
        this as unknown as IntersectionObserver,
      );
    }
  }

  const replacements = {
    document: page,
    window: viewport,
    matchMedia: () => preference,
    IntersectionObserver: options.unsupported ? undefined : Observer,
  };
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(replacements)) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  }

  return {
    page,
    viewport,
    preference,
    get observer() {
      return observers.at(-1);
    },
    restore() {
      for (const [key, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

for (const option of [
  "reducedMotion",
  "hidden",
  "unsupported",
  "empty",
] as const) {
  scenario({ [option]: true }, ({ page, viewport, observer }) => {
    assert.ok(
      page.sections.every(
        (section) => section.dataset.skeletonState === undefined,
      ),
      `${option}: content stays visible by default`,
    );
    assert.equal(viewport.timers.size, 0, `${option}: no animation timer`);
    assert.equal(observer, undefined, `${option}: no observer`);
  });
}

scenario({}, ({ page, viewport, observer }) => {
  const [section, offscreen] = page.sections;
  assert.equal(section.dataset.skeletonState, "pending");
  assert.equal(
    viewport.timers.size,
    0,
    "offscreen sections do not animate or run timers",
  );
  observer?.enter(section, false);
  assert.equal(
    section.dataset.skeletonState,
    "pending",
    "non-intersecting notification does nothing",
  );
  observer?.enter(section);
  assert.equal(section.dataset.skeletonState, "revealing");
  assert.equal(offscreen.dataset.skeletonState, "pending");
  assert.equal(
    observer?.targets.has(section),
    false,
    "reveal is observed only once",
  );
  assert.equal(viewport.timers.size, 1);
  viewport.flush();
  assert.equal(
    section.dataset.skeletonState,
    "ready",
    "cleanup reveals real content without animation events",
  );
  observer?.enter(section);
  assert.equal(viewport.timers.size, 0, "ready content never replays");
});

for (const input of ["focusin", "pointerdown"]) {
  scenario({}, ({ page, viewport, observer }) => {
    const [section] = page.sections;
    observer?.enter(section);
    section.dispatchEvent(new Event(input));
    assert.equal(
      section.dataset.skeletonState,
      "ready",
      `${input}: controls become visible immediately`,
    );
    assert.equal(
      viewport.timers.size,
      0,
      `${input}: outstanding timer is cleared`,
    );
  });
}

scenario({}, ({ page, viewport, preference, observer }) => {
  observer?.enter(page.sections[0]);
  preference.matches = true;
  preference.dispatchEvent(new Event("change"));
  assert.ok(
    page.sections.every((section) => section.dataset.skeletonState === "ready"),
    "changing reduced-motion preference clears every placeholder",
  );
  assert.equal(viewport.timers.size, 0);
  assert.equal(observer?.disconnected, true);
});

scenario({}, ({ page, viewport, observer }) => {
  observer?.enter(page.sections[0]);
  page.hidden = true;
  page.dispatchEvent(new Event("visibilitychange"));
  assert.ok(
    page.sections.every((section) => section.dataset.skeletonState === "ready"),
    "hidden tabs have no active effects",
  );
  assert.equal(viewport.timers.size, 0);
  assert.equal(observer?.disconnected, true);
});

for (const event of ["beforeprint", "pagehide"]) {
  scenario({}, ({ page, viewport, observer }) => {
    observer?.enter(page.sections[0]);
    viewport.dispatchEvent(new Event(event));
    assert.ok(
      page.sections.every(
        (section) => section.dataset.skeletonState === "ready",
      ),
      `${event}: all content is restored`,
    );
    assert.equal(viewport.timers.size, 0);
    assert.equal(observer?.disconnected, true);
  });
}

scenario({}, ({ page, viewport }) => {
  page.target = page.sections[1];
  viewport.dispatchEvent(new Event("hashchange"));
  assert.equal(
    page.sections[1].dataset.skeletonState,
    "ready",
    "anchor navigation never waits for a skeleton",
  );
  assert.equal(page.sections[0].dataset.skeletonState, "pending");
});

scenario({}, ({ page, viewport }) => {
  const descendant = {};
  page.sections[1].children.add(descendant);
  page.target = descendant;
  viewport.dispatchEvent(new Event("hashchange"));
  assert.equal(
    page.sections[1].dataset.skeletonState,
    "ready",
    "anchors inside a section reveal their containing section",
  );
});

for (const option of ["focused", "anchored"] as const) {
  scenario({ [option]: true }, ({ page }) => {
    assert.equal(
      page.sections[0].dataset.skeletonState,
      "ready",
      `${option}: initial interaction target is not masked`,
    );
    assert.equal(page.sections[1].dataset.skeletonState, "pending");
  });
}

scenario({ brokenObserver: true }, ({ page, viewport, observer }) => {
  assert.ok(
    page.sections.every((section) => section.dataset.skeletonState === "ready"),
    "a failed enhancement cannot leave placeholders covering the page",
  );
  assert.equal(viewport.timers.size, 0);
  assert.equal(observer?.disconnected, true);
});

console.log("PASS skeleton reveal lifecycle (16 scenarios)");
