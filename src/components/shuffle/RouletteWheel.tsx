import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Activity } from "@/types";

const ITEM_HEIGHT = 48;
const VISIBLE_COUNT = 5;
const TOTAL_CYCLES = 4;
const CENTER = Math.floor(VISIBLE_COUNT / 2);
const SPIN_SECONDS = 2.5;
/** How long the winner sits in the band before the result card takes over. */
const HOLD_MS = 650;

const shuffled = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

/**
 * Several shuffled passes over the candidates, then the winner, then enough
 * rows to fill the window under the band so it never lands on blank space.
 * Built once per spin: rebuilding on re-render would reshuffle the rows.
 */
function buildStrip(candidates: Activity[], winner: Activity): Activity[] {
  const strip: Activity[] = [];
  for (let i = 0; i < TOTAL_CYCLES; i++) strip.push(...shuffled(candidates));
  const others = candidates.filter((c) => c.id !== winner.id);
  // Keep the winner's own name out of the rows visible just above the band,
  // or it lands looking like a duplicate.
  for (let i = Math.max(0, strip.length - CENTER); i < strip.length && others.length; i++) {
    if (strip[i].id === winner.id) strip[i] = others[Math.floor(Math.random() * others.length)];
  }
  strip.push(winner);
  const tail = shuffled(others.length ? others : candidates);
  for (let i = 0; i < CENTER; i++) strip.push(tail[i % tail.length]);
  return strip;
}

export function RouletteWheel({
  candidates,
  winner,
  layoutId,
  onComplete,
}: {
  candidates: Activity[];
  winner: Activity;
  /** Shared with the result card's title so the name grows into it. */
  layoutId: string;
  onComplete: () => void;
}) {
  const [strip] = useState(() => buildStrip(candidates, winner));
  const [landed, setLanded] = useState(false);
  const landedRef = useRef(false);
  const timers = useRef<number[]>([]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const winnerIndex = strip.length - 1 - CENTER;
  const targetY = -(winnerIndex - CENTER) * ITEM_HEIGHT;

  const land = () => {
    if (landedRef.current) return;
    landedRef.current = true;
    setLanded(true);
    navigator.vibrate?.(12);
    timers.current.push(window.setTimeout(() => onCompleteRef.current(), HOLD_MS));
  };

  useEffect(() => {
    // Fallback in case the animation callback never fires (e.g. a hidden tab).
    const list = timers.current;
    list.push(window.setTimeout(land, SPIN_SECONDS * 1000 + 400));
    return () => list.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="section-label" style={{ marginBottom: 14 }} aria-live="polite">
        {landed ? "Landed" : "Shuffling…"}
      </div>
      <div
        className="relative overflow-hidden"
        style={{
          height: ITEM_HEIGHT * VISIBLE_COUNT,
          width: "100%",
          maxWidth: 360,
          borderRadius: 12,
          border: "1px solid var(--ink-faint)",
          background: "var(--surface)",
        }}
      >
        {/* Center band: where the pick lands */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: ITEM_HEIGHT * CENTER,
            height: ITEM_HEIGHT,
            background: "var(--accent-light)",
            borderTop: "1px solid var(--ds-accent)",
            borderBottom: "1px solid var(--ds-accent)",
          }}
        />

        {/* Fade the rows out toward the top and bottom edges */}
        <div
          className="absolute inset-x-0 top-0 z-10 pointer-events-none"
          style={{ height: ITEM_HEIGHT * 1.5, background: "linear-gradient(to bottom, var(--surface), transparent)" }}
        />
        <div
          className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
          style={{ height: ITEM_HEIGHT * 1.5, background: "linear-gradient(to top, var(--surface), transparent)" }}
        />

        <motion.div
          className="relative"
          initial={{ y: 0 }}
          animate={{ y: targetY }}
          transition={{ duration: SPIN_SECONDS, ease: [0.15, 0.85, 0.35, 1] }}
          onAnimationComplete={land}
        >
          {strip.map((activity, i) => {
            const isWinner = i === winnerIndex;
            return (
              <div
                key={`${activity.id}-${i}`}
                className="flex items-center justify-center px-4 text-center"
                style={{ height: ITEM_HEIGHT }}
                data-winner={isWinner || undefined}
              >
                {isWinner ? (
                  <motion.span
                    layoutId={layoutId}
                    className="font-body truncate"
                    animate={{ scale: landed ? 1.08 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    style={{
                      display: "inline-block",
                      fontSize: 14,
                      color: landed ? "var(--ink)" : "var(--ink-muted)",
                      fontWeight: landed ? 500 : 400,
                    }}
                  >
                    {activity.name}
                  </motion.span>
                ) : (
                  <span
                    className="font-body truncate"
                    style={{
                      fontSize: 14,
                      color: "var(--ink-muted)",
                      opacity: landed ? 0.45 : 1,
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    {activity.name}
                  </span>
                )}
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
