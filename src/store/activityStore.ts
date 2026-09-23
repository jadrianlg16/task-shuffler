import { create } from "zustand";
import type { Activity } from "@/types";
import { v4 as uuidv4 } from "uuid";
import * as api from "@/api/db";
import { persist } from "./persist";

interface ActivityState {
  activities: Activity[];
  isLoaded: boolean;
  loadActivities: () => Promise<void>;
  addActivity: (
    name: string,
    durationMinutes: number | null,
    categoryId: string
  ) => void;
  updateActivity: (id: string, updates: Partial<Omit<Activity, "id">>) => void;
  completeActivity: (id: string) => void;
  restoreActivity: (id: string) => void;
  /** Make this the task you're doing now; any other in-progress task is dropped. */
  startActivity: (id: string) => void;
  /** Stop doing it without finishing; it goes back to the pool. */
  dropActivity: (id: string) => void;
  deleteActivity: (id: string) => void;
  bulkReassignCategory: (fromCategoryId: string, toCategoryId: string) => void;
  /** Swap in an imported list after it has been saved (see replaceAllData). */
  setActivities: (activities: Activity[]) => void;
}

export const useActivityStore = create<ActivityState>()((set, get) => {
  /** Apply field updates to some tasks now; put the old values back if saving fails. */
  const patch = (changes: { id: string; updates: Partial<Activity> }[]) => {
    const before = new Map(
      get()
        .activities.filter((a) => changes.some((c) => c.id === a.id))
        .map((a) => [a.id, a])
    );
    set((state) => ({
      activities: state.activities.map((a) => {
        const change = changes.find((c) => c.id === a.id);
        return change ? { ...a, ...change.updates } : a;
      }),
    }));
    for (const { id, updates } of changes) {
      persist(api.updateActivity(id, updates), () =>
        set((state) => ({
          activities: state.activities.map((a) =>
            a.id === id && before.has(id) ? before.get(id)! : a
          ),
        }))
      );
    }
  };

  return {
    activities: [],
    isLoaded: false,

    loadActivities: async () => {
      const activities = await api.fetchActivities();
      set({ activities, isLoaded: true });
    },

    addActivity: (name, durationMinutes, categoryId) => {
      const activity: Activity = {
        id: uuidv4(),
        name,
        durationMinutes,
        categoryId,
        status: "active",
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      set((state) => ({ activities: [activity, ...state.activities] }));
      persist(api.saveActivity(activity), () =>
        set((state) => ({
          activities: state.activities.filter((a) => a.id !== activity.id),
        }))
      );
    },

    updateActivity: (id, updates) => patch([{ id, updates }]),

    completeActivity: (id) =>
      patch([
        { id, updates: { status: "archived", completedAt: new Date().toISOString() } },
      ]),

    restoreActivity: (id) =>
      patch([{ id, updates: { status: "active", completedAt: null, startedAt: null } }]),

    startActivity: (id) => {
      const previous = get().activities.filter(
        (a) => a.id !== id && a.status === "active" && a.startedAt
      );
      patch([
        ...previous.map((a) => ({ id: a.id, updates: { startedAt: null } })),
        { id, updates: { startedAt: new Date().toISOString() } },
      ]);
    },

    dropActivity: (id) => patch([{ id, updates: { startedAt: null } }]),

    deleteActivity: (id) => {
      const list = get().activities;
      const index = list.findIndex((a) => a.id === id);
      if (index === -1) return;
      const removed = list[index];
      set((state) => ({ activities: state.activities.filter((a) => a.id !== id) }));
      persist(api.deleteActivity(id), () =>
        set((state) => {
          const next = [...state.activities];
          next.splice(Math.min(index, next.length), 0, removed);
          return { activities: next };
        })
      );
    },

    bulkReassignCategory: (fromCategoryId, toCategoryId) =>
      patch(
        get()
          .activities.filter((a) => a.categoryId === fromCategoryId)
          .map((a) => ({ id: a.id, updates: { categoryId: toCategoryId } }))
      ),

    setActivities: (activities) => set({ activities }),
  };
});
