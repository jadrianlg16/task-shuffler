import { create } from "zustand";
import { persist } from "zustand/middleware";

type ViewMode = "grouped" | "flat";
type SortBy = "name" | "duration" | "category" | "date";
type CurrentView = "main" | "archive";

interface UIState {
  theme: "light" | "dark" | "system";
  viewMode: ViewMode;
  sortBy: SortBy;
  searchQuery: string;
  selectedCategoryIds: string[];
  currentView: CurrentView;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sort: SortBy) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategories: (ids: string[]) => void;
  setCurrentView: (view: CurrentView) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "system",
      viewMode: "grouped",
      sortBy: "date",
      searchQuery: "",
      selectedCategoryIds: [],
      currentView: "main",
      setTheme: (theme) => set({ theme }),
      setViewMode: (viewMode) => set({ viewMode }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSelectedCategories: (selectedCategoryIds) =>
        set({ selectedCategoryIds }),
      setCurrentView: (currentView) => set({ currentView }),
    }),
    {
      name: "task-shuffler-ui",
      partialize: (state) => ({
        theme: state.theme,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
      }),
    }
  )
);
