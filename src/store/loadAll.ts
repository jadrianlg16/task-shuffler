import { useActivityStore } from "./activityStore";
import { useCategoryStore } from "./categoryStore";

/**
 * Load tasks and categories from the backend. Never rejects: a failure is kept
 * on the store that hit it (`loadError`), so the UI can say so and offer a retry.
 */
export async function loadAll(): Promise<void> {
  await Promise.all([
    useActivityStore.getState().loadActivities(),
    useCategoryStore.getState().loadCategories(),
  ]);
}

/**
 * Whether the lists can be shown. `error` wins over `ready`: after a failed
 * reload the old lists may no longer match what the backend holds.
 */
export function useLoadStatus(): { ready: boolean; error: string | null } {
  const activitiesLoaded = useActivityStore((s) => s.isLoaded);
  const categoriesLoaded = useCategoryStore((s) => s.isLoaded);
  const activityError = useActivityStore((s) => s.loadError);
  const categoryError = useCategoryStore((s) => s.loadError);
  const error = activityError ?? categoryError;
  return { ready: activitiesLoaded && categoriesLoaded && !error, error };
}
