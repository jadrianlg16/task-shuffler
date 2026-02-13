import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Activity } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface ActivityState {
  activities: Activity[];
  addActivity: (
    name: string,
    durationMinutes: number | null,
    categoryId: string
  ) => void;
  updateActivity: (id: string, updates: Partial<Omit<Activity, "id">>) => void;
  completeActivity: (id: string) => void;
  restoreActivity: (id: string) => void;
  deleteActivity: (id: string) => void;
  bulkReassignCategory: (fromCategoryId: string, toCategoryId: string) => void;
  importActivities: (activities: Activity[]) => void;
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      activities: [],

      addActivity: (name, durationMinutes, categoryId) =>
        set((state) => ({
          activities: [
            {
              id: uuidv4(),
              name,
              durationMinutes,
              categoryId,
              status: "active" as const,
              createdAt: new Date().toISOString(),
              completedAt: null,
            },
            ...state.activities,
          ],
        })),

      updateActivity: (id, updates) =>
        set((state) => ({
          activities: state.activities.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),

      completeActivity: (id) =>
        set((state) => ({
          activities: state.activities.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: "archived" as const,
                  completedAt: new Date().toISOString(),
                }
              : a
          ),
        })),

      restoreActivity: (id) =>
        set((state) => ({
          activities: state.activities.map((a) =>
            a.id === id
              ? { ...a, status: "active" as const, completedAt: null }
              : a
          ),
        })),

      deleteActivity: (id) =>
        set((state) => ({
          activities: state.activities.filter((a) => a.id !== id),
        })),

      bulkReassignCategory: (fromCategoryId, toCategoryId) =>
        set((state) => ({
          activities: state.activities.map((a) =>
            a.categoryId === fromCategoryId
              ? { ...a, categoryId: toCategoryId }
              : a
          ),
        })),

      importActivities: (activities) => set({ activities }),
    }),
    { name: "task-shuffler-activities" }
  )
);
