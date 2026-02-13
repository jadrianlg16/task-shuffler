import type { Activity, Category } from "@/types";
import type { StorageAdapter } from "./types";
import { DEFAULT_CATEGORIES } from "@/data/defaultCategories";

const ACTIVITIES_KEY = "task-shuffler-activities";
const CATEGORIES_KEY = "task-shuffler-categories";

export class LocalStorageAdapter implements StorageAdapter {
  getActivities(): Activity[] {
    const raw = localStorage.getItem(ACTIVITIES_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as Activity[];
    } catch {
      return [];
    }
  }

  saveActivities(activities: Activity[]): void {
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
  }

  getCategories(): Category[] {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) {
      this.saveCategories(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    try {
      return JSON.parse(raw) as Category[];
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }

  saveCategories(categories: Category[]): void {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  }

  exportAll(): string {
    return JSON.stringify({
      activities: this.getActivities(),
      categories: this.getCategories(),
    });
  }

  importAll(json: string): { activities: Activity[]; categories: Category[] } {
    const data = JSON.parse(json);
    const activities = (data.activities ?? []) as Activity[];
    const categories = (data.categories ?? DEFAULT_CATEGORIES) as Category[];
    this.saveActivities(activities);
    this.saveCategories(categories);
    return { activities, categories };
  }
}
