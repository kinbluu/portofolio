import assert from "node:assert/strict";
import { watchScrollMotion } from "../src/scripts/smooth-scroll";

const listeners = new Set<() => void>();
const media = {
  matches: false,
  addEventListener(_type: "change", listener: () => void) {
    listeners.add(listener);
  },
  removeEventListener(_type: "change", listener: () => void) {
    listeners.delete(listener);
  },
};
let started = 0;
let destroyed = 0;
const dispose = watchScrollMotion(media, () => {
  started++;
  return {
    destroy() {
      destroyed++;
    },
  };
});
assert.equal(started, 1, "motion allowed should start one scroll instance");
for (const listener of listeners) listener();
assert.equal(started, 1, "repeated events must not create another instance");
media.matches = true;
for (const listener of listeners) listener();
assert.equal(destroyed, 1, "reduced motion destroys the instance");
media.matches = false;
for (const listener of listeners) listener();
assert.equal(started, 2, "motion may resume when the preference changes");
dispose();
dispose();
assert.equal(destroyed, 2, "cleanup must be idempotent");
assert.equal(listeners.size, 0, "cleanup removes the preference listener");
console.log("PASS smooth scroll reduced-motion lifecycle");
