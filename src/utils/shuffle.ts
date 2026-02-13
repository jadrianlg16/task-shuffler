import type { Activity, Category, ShuffleScope, TimeFilter } from "@/types";
import { filterByTime, filterByCategories } from "./filters";

export function getShuffleCandidates(
  activities: Activity[],
  scope: ShuffleScope,
  selectedCategoryIds: string[],
  timeFilter: TimeFilter,
  categories: Category[]
): Activity[] {
  // Only active, non-hidden category activities
  const hiddenCatIds = new Set(
    categories.filter((c) => c.isHidden).map((c) => c.id)
  );
  let candidates = activities.filter(
    (a) => a.status === "active" && !hiddenCatIds.has(a.categoryId)
  );

  // Apply scope
  switch (scope) {
    case "single":
    case "multi":
      candidates = filterByCategories(candidates, selectedCategoryIds);
      break;
    case "unassigned":
      candidates = candidates.filter((a) => a.categoryId === "unassigned");
      break;
    case "all":
    default:
      break;
  }

  // Apply time filter
  candidates = filterByTime(candidates, timeFilter);

  return candidates;
}

export function shuffleSelect(activities: Activity[]): Activity | null {
  if (activities.length === 0) return null;
  const index = Math.floor(Math.random() * activities.length);
  return activities[index];
}
