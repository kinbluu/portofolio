import { useSyncExternalStore } from "react";
import { GitHubCalendar, type Activity } from "react-github-calendar";
import "react-github-calendar/tooltips.css";
import "../styles/github-calendar.css";

interface Props {
  username: string;
}

const compactQuery = "(width < 64rem)";
const colors = Array.from(
  { length: 5 },
  (_, level) => `var(--rm3-gh-${level})`,
);
const theme = { light: colors, dark: colors };
const count = new Intl.NumberFormat("en-US");
const date = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribeCompact(onChange: () => void) {
  const media = matchMedia(compactQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const getCompact = () => matchMedia(compactQuery).matches;

function recentContributions(activities: Activity[]) {
  const latest = activities.at(-1)?.date;
  if (!latest) return activities;

  const start = new Date(`${latest}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 89);
  const from = start.toISOString().slice(0, 10);
  return activities.filter((activity) => activity.date >= from);
}

function describeActivity(activity: { date: string; count: number }) {
  const label = activity.count === 1 ? "contribution" : "contributions";
  return `${count.format(activity.count)} ${label} on ${date.format(new Date(`${activity.date}T00:00:00Z`))}`;
}

export default function GitHubContributions({ username }: Props) {
  const colorScheme = useSyncExternalStore(
    subscribeTheme,
    getTheme,
    () => "light" as const,
  );
  const compact = useSyncExternalStore(
    subscribeCompact,
    getCompact,
    () => false,
  );

  return (
    <div
      className="github-contributions flex min-w-0 flex-col gap-4"
      role="group"
      aria-label={`GitHub contribution calendar for ${username}`}
      data-github-calendar
    >
      <p className="text-caption text-muted">
        {compact ? "Last 90 days" : "Last year"}
      </p>
      <GitHubCalendar
        username={username}
        year="last"
        colorScheme={colorScheme}
        theme={theme}
        blockSize={compact ? 12 : 14}
        blockMargin={compact ? 3 : 4}
        blockRadius={2}
        fontSize={compact ? 12 : 13}
        transformData={compact ? recentContributions : undefined}
        labels={{
          totalCount: compact
            ? "{{count}} contributions in the last 90 days"
            : "{{count}} contributions in the last year",
        }}
        tooltips={{
          activity: { text: describeActivity, withArrow: true },
        }}
        errorMessage="GitHub activity is unavailable right now. Open the profile below to view contributions."
      />
    </div>
  );
}
