import { useState } from "react";
import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";
import { CategoryBadge } from "@/components/categories/CategoryBadge";
import { toast } from "sonner";
import type { Activity } from "@/types";

export function ActivityItem({
  activity,
  onSelect,
}: {
  activity: Activity;
  onSelect?: (activity: Activity) => void;
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
    toast("Activity completed!", {
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
    if (e.key === "Escape") {
      setEditing(false);
      setEditName(activity.name);
      setEditDuration(activity.durationMinutes?.toString() ?? "");
      setEditCategoryId(activity.categoryId);
    }
  };

  if (editing) {
    return (
      <div className="task-card animate-task-in flex items-center gap-2" style={{ marginBottom: 6 }}>
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="font-body flex-1"
          autoFocus
          style={{
            height: 32,
            borderRadius: 8,
            padding: "0 10px",
            fontSize: 14,
            background: "var(--bg)",
            border: "1px solid var(--ink-faint)",
            color: "var(--ink)",
            outline: "none",
          }}
        />
        <input
          type="number"
          value={editDuration}
          onChange={(e) => setEditDuration(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="min"
          min={1}
          className="font-body"
          style={{
            width: 60,
            height: 32,
            borderRadius: 8,
            padding: "0 8px",
            fontSize: 14,
            background: "var(--bg)",
            border: "1px solid var(--ink-faint)",
            color: "var(--ink)",
            outline: "none",
          }}
        />
        <select
          value={editCategoryId}
          onChange={(e) => setEditCategoryId(e.target.value)}
          className="font-body"
          style={{
            height: 32,
            borderRadius: 8,
            padding: "0 6px",
            fontSize: 12,
            background: "var(--bg)",
            border: "1px solid var(--ink-faint)",
            color: "var(--ink)",
            outline: "none",
          }}
        >
          {visibleCategories
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
        </select>
        <button
          onClick={handleSaveEdit}
          className="font-body"
          style={{ fontSize: 12, color: "var(--ds-accent)", background: "none", border: "none", cursor: "pointer" }}
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="font-body"
          style={{ fontSize: 12, color: "var(--ink-muted)", background: "none", border: "none", cursor: "pointer" }}
        >
          Cancel
        </button>
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
        aria-label="Complete task"
      >
        {/* Empty — shows border only */}
      </button>

      {/* Task content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setEditing(true)}>
        <span
          className="font-body block truncate"
          style={{ fontSize: 14, fontWeight: 400, color: "var(--ink)" }}
        >
          {activity.name}
        </span>
        <div className="flex items-center gap-2" style={{ marginTop: 2 }}>
          {activity.durationMinutes && (
            <span
              className="font-body"
              style={{ fontSize: 11, fontWeight: 300, color: "var(--ink-muted)" }}
            >
              {activity.durationMinutes} min
            </span>
          )}
          {category && <CategoryBadge category={category} />}
        </div>
      </div>

      {/* Action buttons — hidden until hover */}
      <div className="task-actions flex items-center gap-1">
        {onSelect && (
          <button
            onClick={() => onSelect(activity)}
            aria-label="Pick this task"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "var(--bg)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s ease",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
