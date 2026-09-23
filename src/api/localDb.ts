import type { Activity, Category } from "@/types";
import { LocalStorageAdapter } from "@/adapters/localStorage";
import { makeExampleTasks } from "@/data/exampleTasks";
import { isDemoRequested, isEmbedded } from "@/lib/platform";

/**
 * localStorage-backed implementation of the db API, used for serverless
 * builds (VITE_STORAGE=local), including the portfolio embed. Same signatures
 * as httpDb.ts, no json-server required.
 */

const ACTIVITIES_KEY = "task-shuffler-activities";

const adapter = new LocalStorageAdapter();

/**
 * First run: real users start with an empty list (examples are one tap away
 * from the empty state). The portfolio embed, or a `?demo` link, starts with
 * the examples so there is something to shuffle straight away.
 */
function ensureSeeded(): void {
  if (localStorage.getItem(ACTIVITIES_KEY) === null) {
    adapter.saveActivities(isEmbedded() || isDemoRequested() ? makeExampleTasks() : []);
  }
  // getCategories() self-seeds DEFAULT_CATEGORIES on first read.
  adapter.getCategories();
}

export async function fetchActivities(): Promise<Activity[]> {
  ensureSeeded();
  return adapter.getActivities();
}

export async function saveActivity(activity: Activity): Promise<Activity> {
  ensureSeeded();
  adapter.saveActivities([...adapter.getActivities(), activity]);
  return activity;
}

export async function updateActivity(
  id: string,
  updates: Partial<Activity>
): Promise<Activity> {
  ensureSeeded();
  const activities = adapter.getActivities();
  const index = activities.findIndex((a) => a.id === id);
  if (index === -1) {
    throw new Error(`Activity not found: ${id}`);
  }
  const updated = { ...activities[index], ...updates };
  activities[index] = updated;
  adapter.saveActivities(activities);
  return updated;
}

export async function deleteActivity(id: string): Promise<void> {
  ensureSeeded();
  adapter.saveActivities(adapter.getActivities().filter((a) => a.id !== id));
}

export async function fetchCategories(): Promise<Category[]> {
  ensureSeeded();
  return adapter.getCategories();
}

export async function saveCategory(category: Category): Promise<Category> {
  ensureSeeded();
  adapter.saveCategories([...adapter.getCategories(), category]);
  return category;
}

export async function updateCategory(
  id: string,
  updates: Partial<Category>
): Promise<Category> {
  ensureSeeded();
  const categories = adapter.getCategories();
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) {
    throw new Error(`Category not found: ${id}`);
  }
  const updated = { ...categories[index], ...updates };
  categories[index] = updated;
  adapter.saveCategories(categories);
  return updated;
}

export async function deleteCategory(id: string): Promise<void> {
  ensureSeeded();
  adapter.saveCategories(adapter.getCategories().filter((c) => c.id !== id));
}

/** Replace everything with an imported backup (both writes are synchronous). */
export async function replaceAll(
  activities: Activity[],
  categories: Category[]
): Promise<void> {
  adapter.saveCategories(categories);
  adapter.saveActivities(activities);
}
