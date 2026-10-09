import { PickDialog } from "./PickDialog";
import { ShuffleResultScreen } from "./ShuffleResultScreen";
import type { Activity } from "@/types";

/** A task picked by hand from the list: the result card, without reshuffling. */
export function PickedTaskDialog({ task, onClose }: { task: Activity; onClose: () => void }) {
  return (
    <PickDialog title={`Your next task: ${task.name}`} onClose={onClose}>
      <ShuffleResultScreen winner={task} onClose={onClose} />
    </PickDialog>
  );
}
