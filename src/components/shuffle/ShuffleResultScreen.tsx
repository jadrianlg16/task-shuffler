import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";
import { CategoryBadge } from "@/components/categories/CategoryBadge";
import { Button } from "@/components/ui/button";
import type { Activity } from "@/types";
import { toast } from "sonner";

export function ShuffleResultScreen({
  winner,
  onShuffleAgain,
  onNotFeelingIt,
  onClose,
}: {
  winner: Activity;
  onShuffleAgain: () => void;
  onNotFeelingIt?: () => void;
  onClose: () => void;
}) {
  const completeActivity = useActivityStore((s) => s.completeActivity);
  const restoreActivity = useActivityStore((s) => s.restoreActivity);
  const categories = useCategoryStore((s) => s.categories);
  const category = categories.find((c) => c.id === winner.categoryId);

  const handleLetsDoIt = () => {
    completeActivity(winner.id);
    toast("Task done. It's in the archive.", {
      action: {
        label: "Undo",
        onClick: () => restoreActivity(winner.id),
      },
      duration: 3000,
    });
    onClose();
  };

  return (
    <div className="text-center animate-fade-up">
      <div className="section-label">Your next task</div>
      <h2
        className="font-display"
        style={{ fontSize: 24, fontWeight: 400, lineHeight: 1.3, margin: "12px 0 10px" }}
      >
        {winner.name}
      </h2>
      <div
        className="flex items-center justify-center gap-3 font-body"
        style={{ fontSize: 12, color: "var(--ink-muted)" }}
      >
        {winner.durationMinutes && <span>{winner.durationMinutes} min</span>}
        {category && <CategoryBadge category={category} />}
      </div>
      <div className="flex flex-col items-stretch gap-2" style={{ marginTop: 24 }}>
        <Button autoFocus onClick={handleLetsDoIt} className="h-11 rounded-xl text-[15px]">
          Let's do it!
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onShuffleAgain} className="flex-1 h-10 rounded-xl">
            Shuffle again
          </Button>
          {onNotFeelingIt && (
            <Button variant="outline" onClick={onNotFeelingIt} className="flex-1 h-10 rounded-xl">
              Not feeling it
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          onClick={onClose}
          className="h-9 font-normal"
          style={{ color: "var(--ink-muted)" }}
        >
          Back to list
        </Button>
      </div>
    </div>
  );
}
