import type { Activity, Category, TimeFilter } from "@/types";
import { filterByTime, filterByCategories } from "./filters";

/** "I have N minutes" presets, shared by the picker and the fallback hint. */
export const TIME_PRESETS = [15, 30, 60, 90];

/**
 * Tasks the shuffle can draw from: active, in a visible category, not the one
 * you're already doing, in the picked categories (none picked = all), and
 * inside the time filter.
 */
export function getShuffleCandidates(
  activities: Activity[],
  categoryIds: string[],
  timeFilter: TimeFilter,
  categories: Category[]
): Activity[] {
  return filterByTime(getCategoryPool(activities, categoryIds, categories), timeFilter);
}

function getCategoryPool(
  activities: Activity[],
  categoryIds: string[],
  categories: Category[]
): Activity[] {
  const hiddenCatIds = new Set(
    categories.filter((c) => c.isHidden).map((c) => c.id)
  );
  const pool = activities.filter(
    (a) => a.status === "active" && !a.startedAt && !hiddenCatIds.has(a.categoryId)
  );
  return filterByCategories(pool, categoryIds);
}

const DAY_MS = 86_400_000;
/** Age at which a task reaches the maximum weight. */
const MAX_AGE_DAYS = 30;
/** A task that has waited MAX_AGE_DAYS is this many times likelier than a new one. */
const MAX_WEIGHT = 3;

/** Older tasks come up a little more often, so nothing sits forever. */
export function taskWeight(activity: Activity, now = Date.now()): number {
  const ageDays = Math.max(0, (now - new Date(activity.createdAt).getTime()) / DAY_MS);
  const t = Math.min(ageDays, MAX_AGE_DAYS) / MAX_AGE_DAYS;
  return 1 + t * (MAX_WEIGHT - 1);
}

export function shuffleSelect(
  activities: Activity[],
  random: () => number = Math.random,
  now = Date.now()
): Activity | null {
  if (activities.length === 0) return null;
  const weights = activities.map((a) => taskWeight(a, now));
  let r = random() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < activities.length; i++) {
    r -= weights[i];
    if (r < 0) return activities[i];
  }
  return activities[activities.length - 1];
}

export type Loosening =
  | { kind: "none-in-categories" }
  | { kind: "time"; filter: TimeFilter; label: string; count: number };

/**
 * When nothing fits, the smallest step that gives at least one task: the next
 * "I have N" preset up, or dropping the time limit.
 */
export function suggestLoosening(
  activities: Activity[],
  categoryIds: string[],
  timeFilter: TimeFilter,
  categories: Category[]
): Loosening | null {
  const pool = getCategoryPool(activities, categoryIds, categories);
  if (pool.length === 0) return { kind: "none-in-categories" };
  if (timeFilter.mode === "any") return null;

  if (timeFilter.mode === "max") {
    const current = timeFilter.value ?? 0;
    for (const preset of TIME_PRESETS.filter((p) => p > current)) {
      const filter: TimeFilter = { ...timeFilter, value: preset };
      const count = filterByTime(pool, filter).length;
      if (count > 0) return { kind: "time", filter, label: `${preset} min`, count };
    }
  }
  const any: TimeFilter = { ...timeFilter, mode: "any" };
  return { kind: "time", filter: any, label: "any length", count: pool.length };
}
