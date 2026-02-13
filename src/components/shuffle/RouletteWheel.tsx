import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Activity } from "@/types";

const ITEM_HEIGHT = 48;
const VISIBLE_COUNT = 5;
const TOTAL_CYCLES = 4;

export function RouletteWheel({
  candidates,
  winner,
  onComplete,
}: {
  candidates: Activity[];
  winner: Activity;
  onComplete: () => void;
}) {
  const [animating, setAnimating] = useState(true);

  // Build a strip: repeat candidates several times, then end with the winner
  const strip: Activity[] = [];
  for (let i = 0; i < TOTAL_CYCLES; i++) {
    // Shuffle order each cycle for visual variety
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    strip.push(...shuffled);
  }
  // Ensure winner is at the final landing position
  strip.push(winner);

  const winnerIndex = strip.length - 1;
  // Target Y to center the winner in the visible window
  const centerOffset = Math.floor(VISIBLE_COUNT / 2);
  const targetY = -(winnerIndex - centerOffset) * ITEM_HEIGHT;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimating(false);
      onComplete();
    }, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative overflow-hidden rounded-lg border-2 border-primary/50 bg-card"
        style={{
          height: ITEM_HEIGHT * VISIBLE_COUNT,
          width: "100%",
          maxWidth: 360,
        }}
      >
        {/* Center indicator */}
        <div
          className="absolute left-0 right-0 z-10 border-y-2 border-primary pointer-events-none"
          style={{
            top: ITEM_HEIGHT * centerOffset,
            height: ITEM_HEIGHT,
          }}
        />

        {/* Gradient masks top/bottom */}
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none" />

        <motion.div
          initial={{ y: 0 }}
          animate={{ y: targetY }}
          transition={{
            duration: 2.5,
            ease: [0.15, 0.85, 0.35, 1],
          }}
        >
          {strip.map((activity, i) => (
            <div
              key={`${activity.id}-${i}`}
              className="flex items-center justify-center px-4 text-center"
              style={{ height: ITEM_HEIGHT }}
            >
              <span
                className={`text-sm font-medium truncate ${
                  !animating && i === winnerIndex
                    ? "text-primary font-bold text-base"
                    : "text-foreground/70"
                }`}
              >
                {activity.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
