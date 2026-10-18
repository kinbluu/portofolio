import { GITHUB_USERNAME } from "astro:env/server";
import snapshot from "../data/github-snapshot.json";

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
}

export const contributionLevelClasses = ["bg-gh-0", "bg-gh-1", "bg-gh-2", "bg-gh-3", "bg-gh-4"];

interface CalendarResponse {
  total: Record<string, number>;
  contributions: ContributionDay[];
}

const day = 86_400_000;

let calendar: Promise<ContributionCalendar> | undefined;

export function getContributionCalendar() {
  calendar ??= fetchContributionCalendar().catch((error: unknown) => {
    console.warn(`[github] ${error instanceof Error ? error.message : String(error)}, using the design snapshot.`);
    return snapshot as ContributionCalendar;
  });
  return calendar;
}

async function fetchContributionCalendar(): Promise<ContributionCalendar> {
  // Match the client calendar's rolling-year view instead of fetching all years.
  const response = await fetch(
    `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(GITHUB_USERNAME)}?y=last`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) throw new Error(`GitHub Contributions API responded with ${response.status}`);
  const { contributions } = (await response.json()) as CalendarResponse;
  if (!Array.isArray(contributions) || contributions.length === 0) {
    throw new Error(`No contribution data returned for GitHub user "${GITHUB_USERNAME}"`);
  }
  return {
    login: GITHUB_USERNAME,
    capturedAt: new Date().toISOString(),
    days: contributions,
  };
}

const toTime = (date: string) => Date.parse(`${date}T00:00:00Z`);
const toDate = (time: number) => new Date(time).toISOString().slice(0, 10);

export function buildCalendarView(days: ContributionDay[], lastDays?: number): CalendarView {
  const sorted = days.toSorted((a, b) => a.date.localeCompare(b.date));
  const to = sorted.at(-1)?.date ?? toDate(Date.now());
  const from = lastDays ? toDate(toTime(to) - (lastDays - 1) * day) : (sorted[0]?.date ?? to);
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
  const total = sorted
    .filter((entry) => entry.date >= from && entry.date <= to)
    .reduce((sum, entry) => sum + entry.count, 0);
  return { from, to, total, weeks };
}
