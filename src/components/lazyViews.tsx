import { Component, Suspense, lazy, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * The shuffle and pick dialogs, Settings and the archive load on first use.
 * That keeps framer-motion (the shuffle reel) and the dialog code out of the
 * first download. `preloadLazyViews` fetches them in the background once the
 * app is up, so they still open instantly and the service worker can cache
 * them for offline use.
 */
const loaders = {
  shuffle: () => import("@/components/shuffle/ShuffleOverlay"),
  pick: () => import("@/components/shuffle/PickedTaskDialog"),
  settings: () => import("@/components/categories/CategoryManager"),
  archive: () => import("@/components/activities/ArchiveView"),
};

export const ShuffleOverlay = lazy(() =>
  loaders.shuffle().then((m) => ({ default: m.ShuffleOverlay }))
);
export const PickedTaskDialog = lazy(() =>
  loaders.pick().then((m) => ({ default: m.PickedTaskDialog }))
);
export const CategoryManager = lazy(() =>
  loaders.settings().then((m) => ({ default: m.CategoryManager }))
);
export const ArchiveView = lazy(() => loaders.archive().then((m) => ({ default: m.ArchiveView })));

export function preloadLazyViews(): void {
  // A failed preload is harmless: the view loads again when it is first opened.
  for (const load of Object.values(loaders)) load().catch(() => {});
}

/**
 * Suspense plus an error boundary for one lazy view. If its code can't be
 * fetched (offline before it was cached, or a newer build replaced it), say so
 * instead of letting the whole app unmount.
 */
export class LazyView extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          role="alert"
          className="panel font-body"
          style={{ padding: 16, marginBottom: 16, fontSize: 13 }}
        >
          This part of the app didn't load. Check your connection, then reload.
          <div style={{ marginTop: 10 }}>
            <Button size="sm" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </div>
      );
    }
    return <Suspense fallback={null}>{this.props.children}</Suspense>;
  }
}
