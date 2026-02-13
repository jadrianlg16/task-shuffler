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
    toast("Marked as done! Check the archive.", {
      action: {
        label: "Undo",
        onClick: () => restoreActivity(winner.id),
      },
      duration: 3000,
    });
    onClose();
  };

  return (
    <div className="text-center space-y-4">
      <div className="animate-pulse text-2xl font-bold">Selected!</div>
      <h2 className="text-xl font-bold">{winner.name}</h2>
      <div className="flex items-center justify-center gap-3">
        {winner.durationMinutes && (
          <span className="text-sm text-muted-foreground">
            {winner.durationMinutes} min
          </span>
        )}
        {category && <CategoryBadge category={category} />}
      </div>
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        <Button onClick={handleLetsDoIt}>Let's do it!</Button>
        <Button variant="outline" onClick={onShuffleAgain}>
          Shuffle Again
        </Button>
        {onNotFeelingIt && (
          <Button variant="outline" onClick={onNotFeelingIt}>
            Not feeling it
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Back to List
        </Button>
      </div>
    </div>
  );
}
