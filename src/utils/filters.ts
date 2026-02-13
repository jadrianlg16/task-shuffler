import type { Activity, Category, TimeFilter } from "@/types";

export function filterByTime(
  activities: Activity[],
  filter: TimeFilter
): Activity[] {
  if (filter.mode === "any") return activities;

  return activities.filter((a) => {
    if (a.durationMinutes === null) return filter.includeNoDuration;

    switch (filter.mode) {
      case "max":
        return a.durationMinutes <= (filter.value ?? Infinity);
      case "min":
        return a.durationMinutes >= (filter.value ?? 0);
      case "range":
        return (
          a.durationMinutes >= (filter.min ?? 0) &&
          a.durationMinutes <= (filter.max ?? Infinity)
        );
      case "exact":
        return a.durationMinutes === filter.value;
      default:
        return true;
    }
  });
}

export function filterByCategories(
  activities: Activity[],
  categoryIds: string[]
): Activity[] {
  if (categoryIds.length === 0) return activities;
  return activities.filter((a) => categoryIds.includes(a.categoryId));
}

export function filterBySearch(
  activities: Activity[],
  query: string
): Activity[] {
  if (!query.trim()) return activities;
  const lower = query.toLowerCase();
  return activities.filter((a) => a.name.toLowerCase().includes(lower));
}

export function sortActivities(
  activities: Activity[],
  sortBy: "name" | "duration" | "category" | "date",
  categories: Category[]
): Activity[] {
  const sorted = [...activities];
  switch (sortBy) {
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "duration":
      return sorted.sort(
        (a, b) => (a.durationMinutes ?? 999) - (b.durationMinutes ?? 999)
      );
    case "category": {
      const catOrder = new Map(categories.map((c) => [c.id, c.sortOrder]));
      return sorted.sort(
        (a, b) =>
          (catOrder.get(a.categoryId) ?? 999) -
          (catOrder.get(b.categoryId) ?? 999)
      );
    }
    case "date":
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    default:
      return sorted;
  }
}
