export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export interface ContributionDay {
  date: string;
  count: number;
  level: ContributionLevel;
}

export interface ContributionCalendar {
  login: string;
  capturedAt: string;
  days: ContributionDay[];
}

export interface CalendarView {
  from: string;
  to: string;
  total: number;
  weeks: (ContributionDay | null)[][];
  months: { week: number; label: string }[];
}

export const contributionLevelClasses = [
  "bg-gh-0",
  "bg-gh-1",
  "bg-gh-2",
  "bg-gh-3",
  "bg-gh-4",
];

const day = 86_400_000;
const toTime = (date: string) => Date.parse(`${date}T00:00:00Z`);
const toDate = (time: number) => new Date(time).toISOString().slice(0, 10);
const monthName = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

export function buildCalendarView(
  days: ContributionDay[],
  lastDays?: number,
): CalendarView {
  const sorted = days.toSorted((a, b) => a.date.localeCompare(b.date));
  const to = sorted.at(-1)?.date ?? toDate(Date.now());
  const from = lastDays
    ? toDate(toTime(to) - (lastDays - 1) * day)
    : (sorted[0]?.date ?? to);
  const byDate = new Map(sorted.map((entry) => [entry.date, entry]));
  const start = toTime(from) - new Date(toTime(from)).getUTCDay() * day;
  const end = toTime(to) + (6 - new Date(toTime(to)).getUTCDay()) * day;
  const weeks: (ContributionDay | null)[][] = [];
  for (let week = start; week <= end; week += 7 * day) {
    weeks.push(
      Array.from({ length: 7 }, (_, index) => {
        const date = toDate(week + index * day);
        return date >= from && date <= to ? (byDate.get(date) ?? null) : null;
      }),
    );
  }
  // Label a column when its Sunday starts a new month; drop a first label too close to the next.
  const months: CalendarView["months"] = [];
  weeks.forEach((_, week) => {
    const label = monthName.format(start + week * 7 * day);
    if (label !== months.at(-1)?.label) months.push({ week, label });
  });
  if (months[1] && months[1].week - months[0].week < 3) months.shift();
  const total = sorted
    .filter((entry) => entry.date >= from && entry.date <= to)
    .reduce((sum, entry) => sum + entry.count, 0);
  return { from, to, total, weeks, months };
}
