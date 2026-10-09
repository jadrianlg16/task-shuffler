import type { Activity, Category } from "@/types";

/** Synchronous whole-list storage that localDb.ts builds the async db API on. */
export interface StorageAdapter {
  getActivities(): Activity[];
  saveActivities(activities: Activity[]): void;
  getCategories(): Category[];
  saveCategories(categories: Category[]): void;
}
