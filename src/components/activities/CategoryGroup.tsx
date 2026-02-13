import { useState } from "react";
import type { Activity, Category } from "@/types";
import { ActivityItem } from "./ActivityItem";

export function CategoryGroup({
  category,
  activities,
  onSelectActivity,
}: {
  category: Category;
  activities: Activity[];
  onSelectActivity: (activity: Activity) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md hover:bg-muted/50"
        style={{ borderLeft: `3px solid ${category.color}` }}
      >
        <span>{collapsed ? "▶" : "▼"}</span>
        <span className="font-medium">
          {category.icon} {category.name}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {activities.length}
        </span>
      </button>
      {!collapsed && (
        <div className="ml-2">
          {activities.map((a) => (
            <ActivityItem
              key={a.id}
              activity={a}
              onSelect={onSelectActivity}
            />
          ))}
        </div>
      )}
    </div>
  );
}
