import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";
import { CategoryBadge } from "@/components/categories/CategoryBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { RotateCcw, Trash2 } from "lucide-react";
import type { Activity } from "@/types";

export function ArchiveView() {
  const activities = useActivityStore((s) => s.activities).filter(
    (a) => a.status === "archived"
  );
  const restoreActivity = useActivityStore((s) => s.restoreActivity);
  const deleteActivity = useActivityStore((s) => s.deleteActivity);
  const categories = useCategoryStore((s) => s.categories);
  const [confirmDelete, setConfirmDelete] = useState<Activity | null>(null);

  if (activities.length === 0) {
    return (
      <EmptyState
        icon="archive"
        title="Nothing here yet"
        description="Tasks you finish land here, in case you want one back."
      />
    );
  }

  return (
    <>
      <div className="section-label" style={{ marginBottom: 12 }}>
        {activities.length} completed
      </div>
      <div>
        {activities.map((a) => {
          const category = categories.find((c) => c.id === a.categoryId);
          return (
            <div
              key={a.id}
              className="task-card animate-task-in flex items-center"
              style={{ marginBottom: 6, gap: 12 }}
            >
              <div className="flex-1 min-w-0">
                <span
                  className="font-body block truncate line-through"
                  style={{ fontSize: 14, color: "var(--ink-muted)" }}
                >
                  {a.name}
                </span>
                <div
                  className="flex items-center flex-wrap gap-x-3 gap-y-0.5 font-body"
                  style={{ marginTop: 2, fontSize: 11, color: "var(--ink-muted)" }}
                >
                  {a.durationMinutes && <span>{a.durationMinutes} min</span>}
                  {category && <CategoryBadge category={category} />}
                  {a.completedAt && (
                    <span>
                      {formatDistanceToNow(new Date(a.completedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="icon-btn"
                onClick={() => restoreActivity(a.id)}
                aria-label={`Restore ${a.name}`}
                title="Restore"
              >
                <RotateCcw size={15} />
              </button>
              <button
                className="icon-btn danger"
                onClick={() => setConfirmDelete(a)}
                aria-label={`Delete ${a.name}`}
                title="Delete permanently"
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </div>
      <Dialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display font-normal">Delete for good?</DialogTitle>
            <DialogDescription>
              &quot;{confirmDelete?.name}&quot; will be permanently removed. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDelete) deleteActivity(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
