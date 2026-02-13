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
        icon="--"
        title="Archive is empty"
        description="Completed tasks will appear here."
      />
    );
  }

  return (
    <>
      <div className="space-y-1">
        {activities.map((a) => {
          const category = categories.find((c) => c.id === a.categoryId);
          return (
            <div
              key={a.id}
              className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50"
            >
              <span className="flex-1 text-sm line-through text-muted-foreground">
                {a.name}
              </span>
              {a.durationMinutes && (
                <span className="text-xs text-muted-foreground">
                  {a.durationMinutes} min
                </span>
              )}
              {category && <CategoryBadge category={category} />}
              {a.completedAt && (
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(a.completedAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => restoreActivity(a.id)}
              >
                Restore
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive"
                onClick={() => setConfirmDelete(a)}
              >
                Delete
              </Button>
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
            <DialogTitle>Delete permanently?</DialogTitle>
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
