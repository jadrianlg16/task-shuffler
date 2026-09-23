import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { useActivityStore } from "@/store/activityStore";
import { useCategoryStore } from "@/store/categoryStore";
import { CategoryBadge } from "@/components/categories/CategoryBadge";
import { Button } from "@/components/ui/button";
import type { Activity } from "@/types";

export function ShuffleResultScreen({
  winner,
  layoutId,
  skippedCount = 0,
  onShuffleAgain,
  onNotFeelingIt,
  onClose,
}: {
  winner: Activity;
  /** Matches the reel's winner row, so the name grows into this title. */
  layoutId?: string;
  skippedCount?: number;
  /** Omitted for a hand-picked task, where there is nothing to reshuffle. */
  onShuffleAgain?: () => void;
  onNotFeelingIt?: () => void;
  onClose: () => void;
}) {
  const startActivity = useActivityStore((s) => s.startActivity);
  const categories = useCategoryStore((s) => s.categories);
  const category = categories.find((c) => c.id === winner.categoryId);

  const handleStart = () => {
    startActivity(winner.id);
    onClose();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="text-center">
      <div className="section-label">Your next task</div>
      {/* Shrink-wrapped to the text so it grows from the reel row without
          stretching (a full-width block would scale much more on one axis). */}
      <div style={{ margin: "12px 0 10px" }}>
        <motion.h2
          layoutId={layoutId}
          className="font-display"
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          style={{ display: "inline-block", fontSize: 24, fontWeight: 400, lineHeight: 1.3 }}
        >
          {winner.name}
        </motion.h2>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.25 }}
      >
        <div
          className="flex items-center justify-center gap-3 font-body"
          style={{ fontSize: 12, color: "var(--ink-muted)" }}
        >
          {winner.durationMinutes && <span>{winner.durationMinutes} min</span>}
          {category && <CategoryBadge category={category} />}
        </div>
        <div className="flex flex-col items-stretch gap-2" style={{ marginTop: 24 }}>
          <Button autoFocus onClick={handleStart} className="h-11 rounded-xl text-[15px]">
            <Play strokeWidth={2} />
            Start
          </Button>
          {(onShuffleAgain || onNotFeelingIt) && (
            <div className="flex gap-2">
              {onShuffleAgain && (
                <Button variant="outline" onClick={onShuffleAgain} className="flex-1 h-10 rounded-xl">
                  Shuffle again
                </Button>
              )}
              {onNotFeelingIt && (
                <Button variant="outline" onClick={onNotFeelingIt} className="flex-1 h-10 rounded-xl">
                  Not feeling it
                </Button>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-9 font-normal"
            style={{ color: "var(--ink-muted)" }}
          >
            Back to list
          </Button>
          {skippedCount > 0 && (
            <p className="font-body" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
              {skippedCount} skipped until you close this
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
