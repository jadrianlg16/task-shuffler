import { useState, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import { RouletteWheel } from "./RouletteWheel";
import { ShuffleResultScreen } from "./ShuffleResultScreen";
import { PickDialog } from "./PickDialog";
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
  const reduceMotion = useReducedMotion();
  // One candidate needs no suspense; reduced-motion users skip the reel.
  const phaseFor = (poolSize: number): Phase =>
    poolSize <= 1 || reduceMotion ? "result" : "animating";

  const [phase, setPhase] = useState<Phase>(() => phaseFor(candidates.length));
  const [winner, setWinner] = useState<Activity>(initialWinner);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  // Each spin gets its own shared-layout id so the name only ever grows from
  // the reel into the card, never back from an old card into a new reel.
  const [round, setRound] = useState(0);

  const available = candidates.filter((c) => !excludedIds.has(c.id));

  const handleAnimationComplete = useCallback(() => setPhase("result"), []);

  const spin = (pool: Activity[]) => {
    const next = shuffleSelect(pool);
    if (!next) return onClose();
    setWinner(next);
    setRound((r) => r + 1);
    setPhase(phaseFor(pool.length));
  };

  const handleNotFeelingIt = () => {
    const skipped = new Set(excludedIds).add(winner.id);
    setExcludedIds(skipped);
    spin(candidates.filter((c) => !skipped.has(c.id)));
  };

  const layoutId = `pick-${round}`;

  return (
    <PickDialog
      title={phase === "animating" ? "Shuffling" : `Your next task: ${winner.name}`}
      onClose={onClose}
    >
      {phase === "animating" && (
        <RouletteWheel
          key={round}
          candidates={available}
          winner={winner}
          layoutId={layoutId}
          onComplete={handleAnimationComplete}
        />
      )}
      {phase === "result" && (
        <ShuffleResultScreen
          winner={winner}
          layoutId={layoutId}
          skippedCount={excludedIds.size}
          onShuffleAgain={() => spin(available)}
          onNotFeelingIt={available.length > 1 ? handleNotFeelingIt : undefined}
          onClose={onClose}
        />
      )}
    </PickDialog>
  );
}
