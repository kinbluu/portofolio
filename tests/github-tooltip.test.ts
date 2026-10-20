// Run: bun tests/github-tooltip.test.ts
import assert from "node:assert/strict";
import { contributionTooltipPosition } from "../src/scripts/contribution-tooltip";

const anchor = { left: 150, top: 100, width: 12, height: 12 };
const tooltip = { width: 180, height: 30 };
const viewport = { width: 360, height: 640 };

assert.deepEqual(
  contributionTooltipPosition(anchor, tooltip, viewport),
  {
    left: 66,
    top: 62,
    arrowX: 90,
    side: "top",
  },
  "centered above a cell with room for the arrow",
);

assert.deepEqual(
  contributionTooltipPosition({ ...anchor, top: 4 }, tooltip, viewport),
  {
    left: 66,
    top: 24,
    arrowX: 90,
    side: "bottom",
  },
  "flips below the cell near the top of the viewport",
);

const first = contributionTooltipPosition(
  { ...anchor, left: 0 },
  tooltip,
  viewport,
);
assert.equal(first.left, 8, "first column stays inside the left viewport edge");
assert.equal(first.arrowX, 8, "left arrow stays inside the rounded surface");

const last = contributionTooltipPosition(
  { ...anchor, left: 348 },
  tooltip,
  viewport,
);
assert.equal(
  last.left + tooltip.width,
  viewport.width - 8,
  "last column stays inside the right viewport edge",
);
assert.equal(
  last.arrowX,
  tooltip.width - 8,
  "right arrow stays inside the rounded surface",
);

const narrow = contributionTooltipPosition(
  anchor,
  { width: 184, height: 48 },
  { width: 200, height: 160 },
);
assert.equal(narrow.left, 8, "wrapped mobile tooltip fits a narrow viewport");
assert.equal(narrow.top, 44, "positioning accounts for wrapped text height");

const short = contributionTooltipPosition({ ...anchor, top: 2 }, tooltip, {
  width: 360,
  height: 50,
});
assert.equal(short.top, 12, "vertical position is clamped in a short viewport");

console.log("PASS contribution tooltip placement (6 scenarios)");
