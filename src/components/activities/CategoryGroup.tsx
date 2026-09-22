import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Activity, Category } from "@/types";
import { ActivityItem } from "./ActivityItem";
import { CategoryDot } from "@/components/categories/CategoryBadge";

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
    <section style={{ marginBottom: 20 }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        className="flex items-center gap-2 w-full text-left"
        style={{
          padding: "6px 4px",
          marginBottom: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <ChevronRight
          size={14}
          strokeWidth={2}
          style={{
            color: "var(--ink-muted)",
            transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
            transition: "transform 0.15s ease",
          }}
        />
        <CategoryDot color={category.color} />
        <span className="section-label" style={{ color: "var(--ink)" }}>
          {category.name}
        </span>
        <span className="section-label" style={{ marginLeft: "auto" }}>
          {activities.length}
        </span>
      </button>
      {!collapsed &&
        activities.map((a) => (
          <ActivityItem
            key={a.id}
            activity={a}
            onSelect={onSelectActivity}
            showCategory={false}
          />
        ))}
    </section>
  );
}
