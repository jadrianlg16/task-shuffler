import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * The card the reel and the result live in. Built on the Radix dialog so
 * Escape, clicking outside, and focus trapping work like every other modal.
 */
export function PickDialog({
  title,
  onClose,
  children,
}: {
  /** Screen-reader name for the dialog; the visible heading is in children. */
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="bg-card font-body rounded-2xl p-7 sm:max-w-[420px]"
        style={{ borderColor: "var(--ink-faint)" }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
