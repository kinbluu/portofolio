import { GITHUB_USERNAME } from "astro:env/server";
import snapshot from "../data/github-snapshot.json";
import type { ContributionCalendar, ContributionDay } from "./calendar-view";

export * from "./calendar-view";

interface CalendarResponse {
  total: Record<string, number>;
  contributions: ContributionDay[];
}

let calendar: Promise<ContributionCalendar> | undefined;

export function getContributionCalendar() {
  calendar ??= fetchContributionCalendar().catch((error: unknown) => {
    console.warn(
      `[github] ${error instanceof Error ? error.message : String(error)}, using the design snapshot.`,
    );
    return snapshot as ContributionCalendar;
  });
  return calendar;
}

async function fetchContributionCalendar(): Promise<ContributionCalendar> {
  // Rolling-year view only, instead of fetching all years.
  const response = await fetch(
    `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(GITHUB_USERNAME)}?y=last`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok)
    throw new Error(
      `GitHub Contributions API responded with ${response.status}`,
    );
  const { contributions } = (await response.json()) as CalendarResponse;
  if (!Array.isArray(contributions) || contributions.length === 0) {
    throw new Error(
      `No contribution data returned for GitHub user "${GITHUB_USERNAME}"`,
    );
  }
  return {
    login: GITHUB_USERNAME,
    capturedAt: new Date().toISOString(),
    days: contributions,
  };
}
