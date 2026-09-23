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
        className={[
          "bg-card font-body rounded-2xl p-7 sm:max-w-[420px]",
          // Never taller than the screen (landscape phones): scroll instead.
          "max-h-[calc(100dvh-2rem)] overflow-y-auto max-sm:max-h-[92dvh]",
          // Phones: a bottom sheet in thumb reach instead of a centred card.
          "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0",
          "max-sm:max-w-none max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0",
          "max-sm:pt-3 max-sm:pb-[max(1.75rem,env(safe-area-inset-bottom))]",
          "max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=open]:zoom-in-100",
          "max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=closed]:zoom-out-100",
        ].join(" ")}
        style={{ borderColor: "var(--ink-faint)" }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div
          aria-hidden
          className="sm:hidden mx-auto rounded-full"
          style={{ width: 36, height: 4, background: "var(--ink-faint)", marginBottom: 12 }}
        />
        {children}
      </DialogContent>
    </Dialog>
  );
}
