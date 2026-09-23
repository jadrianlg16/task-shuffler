import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TimeFilter } from "@/types";

type ViewMode = "grouped" | "flat";
type SortBy = "name" | "duration" | "category" | "date";
type CurrentView = "main" | "archive";

export const DEFAULT_TIME_FILTER: TimeFilter = { mode: "any", includeNoDuration: true };

interface UIState {
  theme: "light" | "dark" | "system";
  viewMode: ViewMode;
  sortBy: SortBy;
  searchQuery: string;
  currentView: CurrentView;
  /** Shuffle picker: categories to draw from (none = all). Remembered. */
  shuffleCategoryIds: string[];
  /** Shuffle picker: "I have N minutes" and friends. Remembered. */
  shuffleTimeFilter: TimeFilter;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sort: SortBy) => void;
  setSearchQuery: (query: string) => void;
  setCurrentView: (view: CurrentView) => void;
  setShuffleCategoryIds: (ids: string[]) => void;
  setShuffleTimeFilter: (filter: TimeFilter) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "system",
      viewMode: "grouped",
      sortBy: "date",
      searchQuery: "",
      currentView: "main",
      shuffleCategoryIds: [],
      shuffleTimeFilter: DEFAULT_TIME_FILTER,
      setTheme: (theme) => set({ theme }),
      setViewMode: (viewMode) => set({ viewMode }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setCurrentView: (currentView) => set({ currentView }),
      setShuffleCategoryIds: (shuffleCategoryIds) => set({ shuffleCategoryIds }),
      setShuffleTimeFilter: (shuffleTimeFilter) => set({ shuffleTimeFilter }),
    }),
    {
      name: "task-shuffler-ui",
      partialize: (state) => ({
        theme: state.theme,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        shuffleCategoryIds: state.shuffleCategoryIds,
        shuffleTimeFilter: state.shuffleTimeFilter,
      }),
    }
  )
);
