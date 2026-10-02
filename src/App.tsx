import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useApplyTheme } from "@/hooks/useTheme";
import { useShortcuts } from "@/hooks/useShortcuts";
import { useUIStore } from "@/store/uiStore";
import { loadAll, useLoadStatus } from "@/store/loadAll";
import { MainLayout } from "@/components/layout/MainLayout";
import { Header } from "@/components/layout/Header";
import { LoadError } from "@/components/layout/LoadError";
import { QuickAddForm } from "@/components/activities/QuickAddForm";
import { ActivityListContainer } from "@/components/activities/ActivityListContainer";
import { ShuffleControls } from "@/components/shuffle/ShuffleControls";
import { NowCard } from "@/components/shuffle/NowCard";
import { ExamplesBanner } from "@/components/onboarding/ExamplesBanner";
import { SafetyNotices } from "@/components/onboarding/SafetyNotices";
import {
  ArchiveView,
  CategoryManager,
  LazyView,
  PickedTaskDialog,
  ShuffleOverlay,
  preloadLazyViews,
} from "@/components/lazyViews";
import type { Activity } from "@/types";

/** How long after startup to fetch the lazy views in the background. */
const PRELOAD_DELAY_MS = 1500;

export default function App() {
  useApplyTheme();
  useShortcuts();
  const currentView = useUIStore((s) => s.currentView);
  const { ready, error } = useLoadStatus();

  useEffect(() => {
    void loadAll(); // failures surface through useLoadStatus, not as rejections
    const id = window.setTimeout(preloadLazyViews, PRELOAD_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  const [settingsOpen, setSettingsOpen] = useState(false);
  // Settings stays mounted once opened, so its closing animation can play.
  const [settingsUsed, setSettingsUsed] = useState(false);
  const [shuffleResult, setShuffleResult] = useState<{
    candidates: Activity[];
    winner: Activity;
  } | null>(null);
  const [manualSelection, setManualSelection] = useState<Activity | null>(null);

  const openSettings = () => {
    setSettingsUsed(true);
    setSettingsOpen(true);
  };

  return (
    <MainLayout>
      <Header onOpenSettings={openSettings} />
      {error ? (
        <LoadError message={error} />
      ) : !ready ? (
        <p
          className="load-pending font-body"
          role="status"
          style={{ fontSize: 13, color: "var(--ink-muted)" }}
        >
          Loading your tasks…
        </p>
      ) : currentView === "main" ? (
        <>
          <SafetyNotices />
          <ExamplesBanner />
          <NowCard />
          <ShuffleControls onShuffle={setShuffleResult} />
          <QuickAddForm />
          <ActivityListContainer onSelectActivity={setManualSelection} />
        </>
      ) : (
        <LazyView>
          <ArchiveView />
        </LazyView>
      )}
      {shuffleResult && (
        <LazyView>
          <ShuffleOverlay
            candidates={shuffleResult.candidates}
            winner={shuffleResult.winner}
            onClose={() => setShuffleResult(null)}
          />
        </LazyView>
      )}
      {manualSelection && (
        <LazyView>
          <PickedTaskDialog task={manualSelection} onClose={() => setManualSelection(null)} />
        </LazyView>
      )}
      {settingsUsed && (
        <LazyView>
          <CategoryManager open={settingsOpen} onOpenChange={setSettingsOpen} />
        </LazyView>
      )}
      <Toaster />
    </MainLayout>
  );
}
