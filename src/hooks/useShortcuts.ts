import { useEffect } from "react";
import { useUIStore } from "@/store/uiStore";

export const SHORTCUTS = [
  { keys: "N", label: "New task" },
  { keys: "S", label: "Shuffle" },
  { keys: "/", label: "Search tasks" },
  { keys: "Enter", label: "Start the picked task" },
  { keys: "Esc", label: "Close, cancel, or leave a field" },
];

// Elements the shortcuts drive (ids set on the components themselves).
export const SHORTCUT_TARGETS = {
  newTask: "quick-add-input",
  search: "task-search",
  shuffle: "shuffle-button",
} as const;

const isTyping = (el: Element | null) =>
  !!el?.closest("input, textarea, select, [contenteditable='true']");

/** Single-key shortcuts. Ignored while typing, with modifiers, or under a dialog. */
export function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as Element | null;

      if (isTyping(target)) {
        // Esc leaves the quick-add or search field so the next shortcut works.
        const id = (target as HTMLElement).id;
        if (e.key === "Escape" && (id === SHORTCUT_TARGETS.newTask || id === SHORTCUT_TARGETS.search)) {
          (target as HTMLElement).blur();
        }
        return;
      }
      if (document.querySelector('[role="dialog"]')) return; // dialogs own the keyboard

      const action = { n: "newTask", "/": "search", s: "shuffle" }[e.key.toLowerCase()] as
        | keyof typeof SHORTCUT_TARGETS
        | undefined;
      if (!action) return;
      e.preventDefault(); // otherwise the key lands in the field we focus

      const run = () => {
        const el = document.getElementById(SHORTCUT_TARGETS[action]);
        if (!el) return;
        if (action === "shuffle") {
          if (!(el as HTMLButtonElement).disabled) el.click();
        } else {
          el.focus();
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      };

      // The targets live on the Tasks view; switch there first if needed.
      const ui = useUIStore.getState();
      if (ui.currentView !== "main") {
        ui.setCurrentView("main");
        window.setTimeout(run, 50);
      } else {
        run();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
