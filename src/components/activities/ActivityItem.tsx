import { useState } from "react";
import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";
import { CategoryBadge } from "@/components/categories/CategoryBadge";
import { toast } from "sonner";
import { Play } from "lucide-react";
import type { Activity } from "@/types";

export function ActivityItem({
  activity,
  onSelect,
  showCategory = true,
}: {
  activity: Activity;
  onSelect?: (activity: Activity) => void;
  /** Off inside a category group, where the group header already says it. */
  showCategory?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(activity.name);
  const [editDuration, setEditDuration] = useState(
    activity.durationMinutes?.toString() ?? ""
  );
  const [editCategoryId, setEditCategoryId] = useState(activity.categoryId);

  const updateActivity = useActivityStore((s) => s.updateActivity);
  const completeActivity = useActivityStore((s) => s.completeActivity);
  const restoreActivity = useActivityStore((s) => s.restoreActivity);
  const categories = useCategoryStore((s) => s.categories);
  const visibleCategories = categories.filter((c) => !c.isHidden);
  const category = categories.find((c) => c.id === activity.categoryId);

  const handleComplete = () => {
    completeActivity(activity.id);
    toast("Task done.", {
      action: {
        label: "Undo",
        onClick: () => restoreActivity(activity.id),
      },
      duration: 3000,
    });
  };

  const handleSaveEdit = () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    const dur = editDuration ? parseInt(editDuration, 10) : null;
    updateActivity(activity.id, {
      name: trimmed,
      durationMinutes: dur && !isNaN(dur) ? dur : null,
      categoryId: editCategoryId,
    });
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveEdit();
    if (e.key === "Escape") cancelEdit();
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditName(activity.name);
    setEditDuration(activity.durationMinutes?.toString() ?? "");
    setEditCategoryId(activity.categoryId);
  };

  if (editing) {
    return (
      <div className="task-card animate-task-in" style={{ marginBottom: 6 }}>
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Task name"
          className="field w-full"
          style={{ fontSize: 14 }}
          autoFocus
        />
        <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 8 }}>
          <input
            type="number"
            value={editDuration}
            onChange={(e) => setEditDuration(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="min"
            aria-label="Minutes"
            min={1}
            className="field"
            style={{ width: 72 }}
          />
          <select
            value={editCategoryId}
            onChange={(e) => setEditCategoryId(e.target.value)}
            aria-label="Category"
            className="field flex-1 min-w-0"
          >
            {visibleCategories
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <button
            onClick={handleSaveEdit}
            className="nav-tab"
            style={{ color: "var(--ds-accent)", fontWeight: 500 }}
          >
            Save
          </button>
          <button onClick={cancelEdit} className="nav-tab">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="task-card animate-task-in flex items-center select-none"
      style={{ marginBottom: 6, gap: 14 }}
    >
      {/* Circular checkbox */}
      <button
        className="done-checkbox"
        onClick={handleComplete}
        aria-label={`Complete ${activity.name}`}
      >
        {/* Empty — shows border only */}
      </button>

      {/* Task content */}
      <div
        className="task-hit flex-1 min-w-0 cursor-pointer rounded-md"
        role="button"
        tabIndex={0}
        title="Edit"
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setEditing(true);
          }
        }}
      >
        <span
          className="font-body block truncate"
          style={{ fontSize: 14, fontWeight: 400, color: "var(--ink)" }}
        >
          {activity.name}
        </span>
        {(activity.durationMinutes || (showCategory && category)) && (
          <div className="flex items-center gap-3" style={{ marginTop: 2 }}>
            {activity.durationMinutes && (
              <span
                className="font-body"
                style={{ fontSize: 11, color: "var(--ink-muted)" }}
              >
                {activity.durationMinutes} min
              </span>
            )}
            {showCategory && category && <CategoryBadge category={category} />}
          </div>
        )}
      </div>

      {/* Action buttons — hidden until hover */}
      <div className="task-actions flex items-center gap-1">
        {onSelect && (
          <button
            className="icon-btn"
            style={{ width: 36, height: 36 }}
            onClick={() => onSelect(activity)}
            aria-label={`Pick ${activity.name}`}
            title="Pick this task"
          >
            <Play size={14} strokeWidth={1.8} />
          </button>
        )}
      </div>
    </div>
  );
}
