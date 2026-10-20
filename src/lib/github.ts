import { GITHUB_USERNAME } from "astro:env/server";
import snapshot from "../data/github-snapshot.json";
import type { ContributionCalendar, ContributionDay } from "./calendar-view";

export * from "./calendar-view";

interface CalendarResponse {
  total: Record<string, number>;
  contributions: ContributionDay[];
}

// Module scope outlives requests in a warm Worker, so cache with a TTL matching the island's
// Cache-Control. Only settled data is stored: Workers bind in-flight I/O to the request that
// started it, so sharing a pending Promise can hang later requests if that one is cancelled.
// ponytail: concurrent cold requests each fetch once; add a per-request dedupe if that matters.
const ttl = 3_600_000;
let cached: { at: number; calendar: ContributionCalendar } | undefined;

export async function getContributionCalendar(): Promise<ContributionCalendar> {
  if (cached && Date.now() - cached.at < ttl) return cached.calendar;
  try {
    const calendar = await fetchContributionCalendar();
    cached = { at: Date.now(), calendar };
    return calendar;
  } catch (error) {
    // Failures are never cached: the next request retries upstream.
    console.warn(
      `[github] ${error instanceof Error ? error.message : String(error)}, using the design snapshot.`,
    );
    return snapshot as ContributionCalendar;
  }
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
