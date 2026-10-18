import { GITHUB_TOKEN, GITHUB_USERNAME } from "astro:env/server";
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

const levels = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
} as const satisfies Record<string, ContributionLevel>;

interface CalendarResponse {
  data?: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          weeks: {
            contributionDays: {
              date: string;
              contributionCount: number;
              contributionLevel: keyof typeof levels;
            }[];
          }[];
        };
      };
    } | null;
  };
  errors?: { message: string }[];
}

const query = `query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks {
          contributionDays {
            date
            contributionCount
            contributionLevel
          }
        }
      }
    }
  }
}`;

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
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is not set");
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": GITHUB_USERNAME,
    },
    body: JSON.stringify({ query, variables: { login: GITHUB_USERNAME } }),
  });
  if (!response.ok) throw new Error(`GitHub GraphQL responded with ${response.status}`);
  const { data, errors } = (await response.json()) as CalendarResponse;
  if (errors?.length) throw new Error(errors.map(({ message }) => message).join("; "));
  if (!data?.user) throw new Error(`GitHub user "${GITHUB_USERNAME}" not found`);
  return {
    login: GITHUB_USERNAME,
    capturedAt: new Date().toISOString(),
    days: data.user.contributionsCollection.contributionCalendar.weeks
      .flatMap((week) => week.contributionDays)
      .map((entry) => ({
        date: entry.date,
        count: entry.contributionCount,
        level: levels[entry.contributionLevel] ?? 0,
      })),
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
