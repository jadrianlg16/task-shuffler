import { create } from "zustand";
import type { Activity } from "@/types";
import { v4 as uuidv4 } from "uuid";
import * as api from "@/api/db";
import { applyUpdates, describeError, persist } from "./persist";
import { isExampleTask, makeExampleTasks } from "@/data/exampleTasks";

interface ActivityState {
  activities: Activity[];
  isLoaded: boolean;
  /** Why the last load failed, or null. While set, `activities` can't be trusted. */
  loadError: string | null;
  /** Fetch every task. Never rejects: a failure is recorded in `loadError`. */
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
  /** Add the example tasks (skipping any already there). */
  addExamples: () => void;
  /** Remove every example task, leaving the user's own tasks alone. */
  clearExamples: () => void;
  bulkReassignCategory: (fromCategoryId: string, toCategoryId: string) => void;
  /** Swap in an imported list after it has been saved (see replaceAllData). */
  setActivities: (activities: Activity[]) => void;
}

export const useActivityStore = create<ActivityState>()((set, get) => {
  /** Apply field updates to some tasks now; undo each one whose save fails. */
  const patch = (changes: { id: string; updates: Partial<Activity> }[]) => {
    const undos = new Map<string, (current: Activity) => Activity>();
    set((state) => ({
      activities: state.activities.map((a) => {
        const change = changes.find((c) => c.id === a.id);
        if (!change) return a;
        const { next, undo } = applyUpdates(a, change.updates);
        undos.set(a.id, undo);
        return next;
      }),
    }));
    for (const { id, updates } of changes) {
      const undo = undos.get(id);
      if (!undo) continue; // not in the list (already gone): nothing to save
      persist(api.updateActivity(id, updates), () =>
        set((state) => ({
          activities: state.activities.map((a) => (a.id === id ? undo(a) : a)),
        }))
      );
    }
  };

  return {
    activities: [],
    isLoaded: false,
    loadError: null,

    loadActivities: async () => {
      try {
        const activities = await api.fetchActivities();
        set({ activities, isLoaded: true, loadError: null });
      } catch (err) {
        console.warn("[done.] loading tasks failed:", err);
        set({ loadError: describeError(err) });
      }
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

    addExamples: () => {
      const existing = new Set(get().activities.map((a) => a.id));
      const fresh = makeExampleTasks().filter((t) => !existing.has(t.id));
      set((state) => ({ activities: [...state.activities, ...fresh] }));
      for (const task of fresh) {
        persist(api.saveActivity(task), () =>
          set((state) => ({ activities: state.activities.filter((a) => a.id !== task.id) }))
        );
      }
    },

    clearExamples: () => {
      const { activities, deleteActivity } = get();
      activities.filter(isExampleTask).forEach((a) => deleteActivity(a.id));
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
