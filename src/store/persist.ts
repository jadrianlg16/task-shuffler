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
