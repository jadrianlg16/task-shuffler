import { useState } from "react";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadAll } from "@/store/loadAll";

/**
 * Shown instead of the lists when the backend can't be read, so a server that
 * is down never passes for an empty list.
 */
export function LoadError({ message }: { message: string }) {
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    await loadAll(); // never rejects; on success this panel unmounts
    setRetrying(false);
  };

  return (
    <section
      role="alert"
      className="panel"
      style={{ padding: 20, marginBottom: 28, borderLeft: "3px solid var(--danger)" }}
    >
      <div className="flex gap-3">
        <CloudOff size={18} style={{ color: "var(--danger)", marginTop: 2 }} aria-hidden />
        <div className="flex-1 min-w-0 font-body">
          <h2 style={{ fontSize: 15, fontWeight: 500 }}>Couldn't load your tasks</h2>
          <p style={{ fontSize: 13, lineHeight: 1.5, marginTop: 4, color: "var(--ink-muted)" }}>
            The server didn't answer, so nothing is shown rather than an empty list. Check that it
            is running, then try again.
          </p>
          <p style={{ fontSize: 11, marginTop: 8, color: "var(--ink-muted)" }}>{message}</p>
          <Button
            size="sm"
            onClick={() => void retry()}
            disabled={retrying}
            style={{ marginTop: 12 }}
          >
            {retrying ? "Trying…" : "Try again"}
          </Button>
        </div>
      </div>
    </section>
  );
}
