import { create } from "zustand";
import type { Category } from "@/types";
import { DEFAULT_CATEGORIES } from "@/data/defaultCategories";
import { v4 as uuidv4 } from "uuid";
import * as api from "@/api/db";
import { describeError, persist } from "./persist";
import { PendingWrites, withValues } from "./pendingWrites";

interface CategoryState {
  categories: Category[];
  isLoaded: boolean;
  /** Why the last load failed, or null. */
  loadError: string | null;
  /** Fetch every category. Never rejects: a failure is recorded in `loadError`. */
  loadCategories: () => Promise<void>;
  addCategory: (name: string, color: string) => void;
  updateCategory: (id: string, updates: Partial<Omit<Category, "id">>) => void;
  deleteCategory: (id: string) => void;
  toggleHidden: (id: string) => void;
  reorderCategories: (ids: string[]) => void;
  /** Swap in an imported list after it has been saved (see replaceAllData). */
  setCategories: (categories: Category[]) => void;
}

export const useCategoryStore = create<CategoryState>()((set, get) => {
  // Saves still in flight per category and field (see pendingWrites.ts).
  const writes = new PendingWrites<Category>();
  // Deleted, but the delete isn't confirmed yet: kept up to date so a failed
  // delete puts back what the server holds, not a stale copy.
  const removedWhileSaving = new Map<string, Category>();

  /**
   * Apply field updates now and save them. When a save finishes, the fields it
   * touched show what the server holds, or the newest save still in flight.
   */
  const patch = (changes: { id: string; updates: Partial<Category> }[]) => {
    const current = get().categories;
    const started = changes.flatMap(({ id, updates }) => {
      const item = current.find((x) => x.id === id);
      return item ? [{ id, updates, token: writes.begin(item, updates) }] : []; // gone: nothing to save
    });
    set((state) => ({
      categories: state.categories.map((c) => {
        const change = started.find((s) => s.id === c.id);
        return change ? { ...c, ...change.updates } : c;
      }),
    }));
    const finish = (token: number, saved: boolean) => {
      const result = writes.settle(token, saved);
      if (!result) return;
      const removed = removedWhileSaving.get(result.id);
      if (removed) removedWhileSaving.set(result.id, withValues(removed, result.show));
      set((state) => ({
        categories: state.categories.map((c) =>
          c.id === result.id ? withValues(c, result.show) : c
        ),
      }));
    };
    for (const { id, updates, token } of started) {
      persist(
        api.updateCategory(id, updates).then(() => finish(token, true)),
        () => finish(token, false)
      );
    }
  };

  return {
    categories: DEFAULT_CATEGORIES,
    isLoaded: false,
    loadError: null,

    loadCategories: async () => {
      try {
        const categories = await api.fetchCategories();
        set({
          categories: categories.length > 0 ? categories : DEFAULT_CATEGORIES,
          isLoaded: true,
          loadError: null,
        });
      } catch (err) {
        console.warn("[done.] loading categories failed:", err);
        set({ loadError: describeError(err) });
      }
    },

    addCategory: (name, color) => {
      const category: Category = {
        id: uuidv4(),
        name,
        color,
        isDefault: false,
        isHidden: false,
        sortOrder: get().categories.length,
      };
      set((state) => ({ categories: [...state.categories, category] }));
      persist(api.saveCategory(category), () =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== category.id),
        }))
      );
    },

    updateCategory: (id, updates) => patch([{ id, updates }]),

    deleteCategory: (id) => {
      const list = get().categories;
      const index = list.findIndex((c) => c.id === id);
      if (index === -1) return;
      removedWhileSaving.set(id, list[index]);
      set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
      persist(
        api.deleteCategory(id).then(() => removedWhileSaving.delete(id)),
        () => {
          const removed = removedWhileSaving.get(id) ?? list[index];
          removedWhileSaving.delete(id);
          set((state) => {
            const next = [...state.categories];
            next.splice(Math.min(index, next.length), 0, removed);
            return { categories: next };
          });
        }
      );
    },

    toggleHidden: (id) => {
      const cat = get().categories.find((c) => c.id === id);
      if (cat) patch([{ id, updates: { isHidden: !cat.isHidden } }]);
    },

    reorderCategories: (ids) =>
      patch(ids.map((id, index) => ({ id, updates: { sortOrder: index } }))),

    setCategories: (categories) => set({ categories }),
  };
});
