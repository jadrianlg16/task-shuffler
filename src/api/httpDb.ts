import type { Activity, Category } from "@/types";

// Same-origin path, proxied to json-server by Vite (see vite.config.ts), so the
// app works from any host that can reach the UI — not only the machine running it.
const API_URL = import.meta.env.VITE_API_URL ?? "/api";

export async function fetchActivities(): Promise<Activity[]> {
  const res = await fetch(`${API_URL}/activities`);
  return res.json();
}

export async function saveActivity(activity: Activity): Promise<Activity> {
  const res = await fetch(`${API_URL}/activities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(activity),
  });
  return res.json();
}

export async function updateActivity(
  id: string,
  updates: Partial<Activity>
): Promise<Activity> {
  const res = await fetch(`${API_URL}/activities/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function deleteActivity(id: string): Promise<void> {
  await fetch(`${API_URL}/activities/${id}`, { method: "DELETE" });
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/categories`);
  return res.json();
}

export async function saveCategory(category: Category): Promise<Category> {
  const res = await fetch(`${API_URL}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(category),
  });
  return res.json();
}

export async function updateCategory(
  id: string,
  updates: Partial<Category>
): Promise<Category> {
  const res = await fetch(`${API_URL}/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function deleteCategory(id: string): Promise<void> {
  await fetch(`${API_URL}/categories/${id}`, { method: "DELETE" });
}
