import { differenceInCalendarDays } from "date-fns";
import type { Activity } from "@/types";

export type ArchiveGroup = { label: string; items: Activity[] };

/** Completed tasks, newest first, bucketed into Today / This week / Earlier. */
export function groupArchive(activities: Activity[], now = new Date()): ArchiveGroup[] {
  const done = activities
    .filter((a) => a.status === "archived")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  const buckets: ArchiveGroup[] = [
    { label: "Today", items: [] },
    { label: "This week", items: [] },
    { label: "Earlier", items: [] },
  ];
  for (const a of done) {
    const days = a.completedAt
      ? differenceInCalendarDays(now, new Date(a.completedAt))
      : Infinity;
    buckets[days <= 0 ? 0 : days < 7 ? 1 : 2].items.push(a);
  }
  return buckets.filter((b) => b.items.length > 0);
}
