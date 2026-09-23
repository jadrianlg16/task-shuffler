import type { Activity, Category } from "@/types";
import { LocalStorageAdapter } from "@/adapters/localStorage";

/**
 * localStorage-backed implementation of the db API, used for serverless
 * builds (VITE_STORAGE=local) such as the portfolio embed. Same signatures
 * as httpDb.ts, no json-server required.
 */

const ACTIVITIES_KEY = "task-shuffler-activities";

const adapter = new LocalStorageAdapter();

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

const SEED_ACTIVITIES: Activity[] = [
  { id: "demo-01", name: "Study for calculus exam", durationMinutes: 90, categoryId: "school", status: "active", createdAt: minutesAgo(60), completedAt: null },
  { id: "demo-02", name: "Morning run", durationMinutes: 45, categoryId: "personal", status: "active", createdAt: minutesAgo(120), completedAt: null },
  { id: "demo-03", name: "Prepare client proposal", durationMinutes: 40, categoryId: "business", status: "active", createdAt: minutesAgo(180), completedAt: null },
  { id: "demo-04", name: "Practice guitar", durationMinutes: 25, categoryId: "hobby", status: "active", createdAt: minutesAgo(240), completedAt: null },
  { id: "demo-05", name: "Read 20 pages", durationMinutes: 30, categoryId: "personal", status: "active", createdAt: minutesAgo(300), completedAt: null },
  { id: "demo-06", name: "Refactor side project", durationMinutes: 120, categoryId: "hobby", status: "active", createdAt: minutesAgo(360), completedAt: null },
  { id: "demo-07", name: "Plan next week", durationMinutes: 30, categoryId: "business", status: "active", createdAt: minutesAgo(420), completedAt: null },
  { id: "demo-08", name: "Water the plants", durationMinutes: 10, categoryId: "personal", status: "active", createdAt: minutesAgo(480), completedAt: null },
  { id: "demo-09", name: "Sketch app wireframes", durationMinutes: null, categoryId: "hobby", status: "active", createdAt: minutesAgo(540), completedAt: null },
  { id: "demo-10", name: "Review lecture notes", durationMinutes: 60, categoryId: "school", status: "active", createdAt: minutesAgo(600), completedAt: null },
];

function ensureSeeded(): void {
  if (localStorage.getItem(ACTIVITIES_KEY) === null) {
    adapter.saveActivities(SEED_ACTIVITIES);
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
