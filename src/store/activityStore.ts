import { create } from "zustand";
import type { Activity } from "@/types";
import { v4 as uuidv4 } from "uuid";
import * as api from "@/api/db";

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
  importActivities: (activities: Activity[]) => void;
}

export const useActivityStore = create<ActivityState>()((set, get) => ({
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
    api.saveActivity(activity);
  },

  updateActivity: (id, updates) => {
    set((state) => ({
      activities: state.activities.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
    api.updateActivity(id, updates);
  },

  completeActivity: (id) => {
    const updates = {
      status: "archived" as const,
      completedAt: new Date().toISOString(),
    };
    set((state) => ({
      activities: state.activities.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
    api.updateActivity(id, updates);
  },

  restoreActivity: (id) => {
    const updates = { status: "active" as const, completedAt: null, startedAt: null };
    set((state) => ({
      activities: state.activities.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
    api.updateActivity(id, updates);
  },

  startActivity: (id) => {
    const startedAt = new Date().toISOString();
    const previous = get().activities.filter(
      (a) => a.id !== id && a.status === "active" && a.startedAt
    );
    set((state) => ({
      activities: state.activities.map((a) =>
        a.id === id
          ? { ...a, startedAt }
          : previous.some((p) => p.id === a.id)
            ? { ...a, startedAt: null }
            : a
      ),
    }));
    previous.forEach((a) => api.updateActivity(a.id, { startedAt: null }));
    api.updateActivity(id, { startedAt });
  },

  dropActivity: (id) => {
    set((state) => ({
      activities: state.activities.map((a) =>
        a.id === id ? { ...a, startedAt: null } : a
      ),
    }));
    api.updateActivity(id, { startedAt: null });
  },

  deleteActivity: (id) => {
    set((state) => ({
      activities: state.activities.filter((a) => a.id !== id),
    }));
    api.deleteActivity(id);
  },

  bulkReassignCategory: (fromCategoryId, toCategoryId) => {
    const toUpdate = get().activities.filter(
      (a) => a.categoryId === fromCategoryId
    );
    set((state) => ({
      activities: state.activities.map((a) =>
        a.categoryId === fromCategoryId
          ? { ...a, categoryId: toCategoryId }
          : a
      ),
    }));
    toUpdate.forEach((a) =>
      api.updateActivity(a.id, { categoryId: toCategoryId })
    );
  },

  importActivities: (activities) => {
    set({ activities });
    // Sync all to server - clear and re-add
    api.fetchActivities().then((existing) => {
      existing.forEach((a) => api.deleteActivity(a.id));
      activities.forEach((a) => api.saveActivity(a));
    });
  },
}));
