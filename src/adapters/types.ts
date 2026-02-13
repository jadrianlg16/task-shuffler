import type { Activity, Category } from "@/types";

export interface StorageAdapter {
  getActivities(): Activity[];
  saveActivities(activities: Activity[]): void;
  getCategories(): Category[];
  saveCategories(categories: Category[]): void;
  exportAll(): string;
  importAll(json: string): { activities: Activity[]; categories: Category[] };
}
