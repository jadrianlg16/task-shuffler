import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";
import { useUIStore } from "@/store/uiStore";
import { filterBySearch, sortActivities } from "@/utils/filters";
import { ActivityListToolbar } from "./ActivityListToolbar";
import { CategoryGroup } from "./CategoryGroup";
import { ActivityItem } from "./ActivityItem";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Activity } from "@/types";

export function ActivityListContainer({
  onSelectActivity,
}: {
  onSelectActivity: (activity: Activity) => void;
}) {
  const categories = useCategoryStore((s) => s.categories);
  // Hidden categories are hidden in both views (and from the shuffle).
  const hiddenIds = new Set(categories.filter((c) => c.isHidden).map((c) => c.id));
  const activities = useActivityStore((s) => s.activities).filter(
    (a) => a.status === "active" && !hiddenIds.has(a.categoryId)
  );
  const visibleCategories = categories
    .filter((c) => !c.isHidden)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const noTasksAtAll = useActivityStore((s) => s.activities.length === 0);
  const addExamples = useActivityStore((s) => s.addExamples);
  const sortBy = useUIStore((s) => s.sortBy);
  const viewMode = useUIStore((s) => s.viewMode);

  let filtered = filterBySearch(activities, searchQuery);
  filtered = sortActivities(filtered, sortBy, categories);

  if (filtered.length === 0) {
    return (
      <>
        <ActivityListToolbar />
        <EmptyState
          icon="add"
          title={searchQuery.trim() ? "No matches" : "No tasks yet"}
          description={
            searchQuery.trim()
              ? `Nothing matches “${searchQuery.trim()}”.`
              : "Add your first task above to get started."
          }
          action={
            !searchQuery.trim() && noTasksAtAll
              ? { label: "Try it with example tasks", onClick: addExamples }
              : undefined
          }
        />
      </>
    );
  }

  if (viewMode === "grouped") {
    return (
      <>
        <ActivityListToolbar />
        {visibleCategories.map((cat) => {
          const catActivities = filtered.filter(
            (a) => a.categoryId === cat.id
          );
          if (catActivities.length === 0) return null;
          return (
            <CategoryGroup
              key={cat.id}
              category={cat}
              activities={catActivities}
              onSelectActivity={onSelectActivity}
            />
          );
        })}
      </>
    );
  }

  return (
    <>
      <ActivityListToolbar />
      <div>
        {filtered.map((a) => (
          <ActivityItem
            key={a.id}
            activity={a}
            onSelect={onSelectActivity}
          />
        ))}
      </div>
    </>
  );
}
