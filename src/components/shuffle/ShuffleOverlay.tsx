import { useState, useCallback } from "react";
import { RouletteWheel } from "./RouletteWheel";
import { ShuffleResultScreen } from "./ShuffleResultScreen";
import { shuffleSelect } from "@/utils/shuffle";
import type { Activity } from "@/types";

type Phase = "animating" | "result";

export function ShuffleOverlay({
  candidates,
  winner: initialWinner,
  onClose,
}: {
  candidates: Activity[];
  winner: Activity;
  onClose: () => void;
}) {
  const skipAnimation = candidates.length <= 1;
  const [phase, setPhase] = useState<Phase>(
    skipAnimation ? "result" : "animating"
  );
  const [winner, setWinner] = useState<Activity>(initialWinner);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const getAvailableCandidates = () =>
    candidates.filter((c) => !excludedIds.has(c.id));

  const handleAnimationComplete = useCallback(() => {
    setPhase("result");
  }, []);

  const handleShuffleAgain = () => {
    const available = getAvailableCandidates();
    const newWinner = shuffleSelect(available);
    if (newWinner) {
      setWinner(newWinner);
      if (available.length <= 1) {
        setPhase("result");
      } else {
        setPhase("animating");
      }
    }
  };

  const handleNotFeelingIt = () => {
    const newExcluded = new Set(excludedIds);
    newExcluded.add(winner.id);
    setExcludedIds(newExcluded);

    const remaining = candidates.filter((c) => !newExcluded.has(c.id));
    const newWinner = shuffleSelect(remaining);
    if (newWinner) {
      setWinner(newWinner);
      if (remaining.length <= 1) {
        setPhase("result");
      } else {
        setPhase("animating");
      }
    } else {
      // All excluded — close overlay
      onClose();
    }
  };

  const availableCount = getAvailableCandidates().length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card rounded-xl border shadow-lg p-6 w-full max-w-md mx-4">
        {phase === "animating" && (
          <RouletteWheel
            key={winner.id}
            candidates={getAvailableCandidates()}
            winner={winner}
            onComplete={handleAnimationComplete}
          />
        )}
        {phase === "result" && (
          <ShuffleResultScreen
            winner={winner}
            onShuffleAgain={handleShuffleAgain}
            onNotFeelingIt={availableCount > 1 ? handleNotFeelingIt : undefined}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
