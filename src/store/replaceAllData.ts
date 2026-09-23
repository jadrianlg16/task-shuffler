import { toast } from "sonner";
import * as api from "@/api/db";
import type { Activity, Category } from "@/types";
import { useActivityStore } from "./activityStore";
import { useCategoryStore } from "./categoryStore";

/**
 * Import: save first, then show. If the save fails part-way, reload what the
 * backend actually holds so the screen never claims data it didn't keep.
 */
export async function replaceAllData(
  activities: Activity[],
  categories: Category[]
): Promise<boolean> {
  try {
    await api.replaceAll(activities, categories);
    useCategoryStore.getState().setCategories(categories);
    useActivityStore.getState().setActivities(activities);
    return true;
  } catch (err) {
    console.warn("[done.] import failed:", err);
    await Promise.allSettled([
      useActivityStore.getState().loadActivities(),
      useCategoryStore.getState().loadCategories(),
    ]);
    toast.error("Import didn't finish. Some old items may still be there; check the server and try again.");
    return false;
  }
}
