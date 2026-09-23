import { format } from "date-fns";
import { readMeta } from "@/lib/safety";
import { usesLocalStorage } from "@/lib/platform";

/** Settings → Backup: where the tasks actually live, in plain words. */
export function StorageNote() {
  const style = { fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.5, marginBottom: 12 } as const;
  if (!usesLocalStorage) {
    return <p style={style}>Your tasks are saved on your done. server.</p>;
  }
  const meta = readMeta();
  return (
    <div style={style} data-testid="storage-note">
      <p>
        Your tasks are saved only in this browser, on this device. They don't sync to other
        devices; use Export and Import to move them.
      </p>
      <p style={{ marginTop: 6 }}>
        {meta.persist === "granted"
          ? "✓ This browser has agreed to keep them."
          : "This browser may clear them if storage runs low or you stop visiting. Installing the app (on iPhone: Add to Home Screen) protects them."}{" "}
        {meta.lastBackupAt
          ? `Last backup: ${format(new Date(meta.lastBackupAt), "MMM d, yyyy")}.`
          : "No backup yet."}
      </p>
    </div>
  );
}
