import { useState } from "react";
import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";
import { CategoryBadge } from "@/components/categories/CategoryBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
      <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md">
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 h-8"
          autoFocus
        />
        <Input
          type="number"
          value={editDuration}
          onChange={(e) => setEditDuration(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-20 h-8"
          placeholder="min"
          min={1}
        />
        <select
          value={editCategoryId}
          onChange={(e) => setEditCategoryId(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs h-8"
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
          className="text-xs text-primary hover:underline"
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-muted-foreground hover:underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-md group">
      <Checkbox
        checked={false}
        onCheckedChange={handleComplete}
        className="shrink-0"
      />
      <span
        className="flex-1 text-sm cursor-pointer hover:text-primary"
        onClick={() => setEditing(true)}
      >
        {activity.name}
      </span>
      {activity.durationMinutes && (
        <span className="text-xs text-muted-foreground">
          {activity.durationMinutes} min
        </span>
      )}
      {category && <CategoryBadge category={category} />}
      {onSelect && (
        <button
          onClick={() => onSelect(activity)}
          className="text-xs text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
          title="Pick this task"
        >
          {"▶"}
        </button>
      )}
    </div>
  );
}
