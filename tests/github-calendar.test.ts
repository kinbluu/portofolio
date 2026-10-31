// Run: bun tests/github-calendar.test.ts
import assert from "node:assert/strict";
import snapshot from "../src/data/github-snapshot.json";
import {
  buildCalendarView,
  type ContributionDay,
} from "../src/lib/calendar-view";

const year = buildCalendarView(snapshot.days as ContributionDay[]);

assert.ok(
  year.weeks.every((week) => week.length === 7),
  "full weeks",
);
assert.equal(year.months[0].week >= 0, true);
assert.ok(
  year.months.every(
    (month, index) =>
      index === 0 || month.week - year.months[index - 1].week >= 3,
  ),
  "labels never crowd each other",
);
// A rolling year can show the same month at both ends (Oct … Oct), like GitHub does.
assert.ok(
  year.months.every(
    (month, index) =>
      index === 0 || month.label !== year.months[index - 1].label,
  ),
  "consecutive labels differ",
);
assert.ok(year.months.length >= 12, "a rolling year labels every month");

const recent = buildCalendarView(snapshot.days as ContributionDay[], 90);
assert.ok(recent.weeks.length <= 14, "90 days fit in 14 weeks");
assert.ok(recent.total <= year.total);

const englishMonths = buildCalendarView([
  { date: "2026-01-01", count: 0, level: 0 },
  { date: "2026-05-31", count: 1, level: 1 },
]).months.map(({ label }) => label);
assert.ok(englishMonths.includes("Feb"), "month labels use English");
assert.ok(englishMonths.includes("May"), "May is not localized to Indonesian");

console.log("PASS github calendar view");
