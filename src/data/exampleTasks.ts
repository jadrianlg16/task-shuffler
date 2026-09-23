import type { Activity } from "@/types";

/**
 * Example tasks for trying the app (and for the portfolio demo). Their ids
 * share a prefix so they can be found and cleared without touching real tasks.
 * "demo-" matches what earlier versions stored, so old demo data is recognised.
 */
export const EXAMPLE_ID_PREFIX = "demo-";

export const isExampleTask = (a: Pick<Activity, "id">) => a.id.startsWith(EXAMPLE_ID_PREFIX);

const EXAMPLES: [name: string, minutes: number | null, categoryId: string][] = [
  ["Study for calculus exam", 90, "school"],
  ["Morning run", 45, "personal"],
  ["Prepare client proposal", 40, "business"],
  ["Practice guitar", 25, "hobby"],
  ["Read 20 pages", 30, "personal"],
  ["Refactor side project", 120, "hobby"],
  ["Plan next week", 30, "business"],
  ["Water the plants", 10, "personal"],
  ["Sketch app wireframes", null, "hobby"],
  ["Review lecture notes", 60, "school"],
];

/** Fresh copies, created an hour apart so the list has a natural order. */
export function makeExampleTasks(now = Date.now()): Activity[] {
  return EXAMPLES.map(([name, durationMinutes, categoryId], i) => ({
    id: `${EXAMPLE_ID_PREFIX}${String(i + 1).padStart(2, "0")}`,
    name,
    durationMinutes,
    categoryId,
    status: "active",
    createdAt: new Date(now - (i + 1) * 3_600_000).toISOString(),
    completedAt: null,
  }));
}
