import { toast } from "sonner";

/**
 * Stores update the screen first, then save. If the save fails, undo just the
 * change that failed and say so, instead of showing data that isn't stored.
 */
export function persist(save: Promise<unknown>, rollback: () => void): void {
  save.catch((err) => {
    rollback();
    console.warn("[done.] save failed:", err);
    toast.error("Couldn't save that change. Is the server running?", {
      id: "save-failed", // one toast, not one per failed request
    });
  });
}

/**
 * Apply `updates` to one item and return how to undo just that change.
 * The undo puts back only the fields this change wrote, and only where the
 * value is still the one it wrote: a later change to the same field (saved or
 * still in flight) is left alone, so overlapping failures unwind correctly.
 */
export function applyUpdates<T extends object>(item: T, updates: Partial<T>) {
  const keys = Object.keys(updates) as (keyof T)[];
  const previous = Object.fromEntries(keys.map((k) => [k, item[k]])) as Partial<T>;
  return {
    next: { ...item, ...updates },
    undo: (current: T): T => {
      const restored = { ...current };
      for (const k of keys) {
        if (Object.is(current[k], updates[k])) restored[k] = previous[k] as T[keyof T];
      }
      return restored;
    },
  };
}

/** A short, human-readable reason for a failed request. */
export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
