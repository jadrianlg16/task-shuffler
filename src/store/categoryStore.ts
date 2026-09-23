import { create } from "zustand";
import type { Category } from "@/types";
import { DEFAULT_CATEGORIES } from "@/data/defaultCategories";
import { v4 as uuidv4 } from "uuid";
import * as api from "@/api/db";
import { persist } from "./persist";

interface CategoryState {
  categories: Category[];
  isLoaded: boolean;
  loadCategories: () => Promise<void>;
  addCategory: (name: string, color: string, icon: string) => void;
  updateCategory: (id: string, updates: Partial<Omit<Category, "id">>) => void;
  deleteCategory: (id: string) => void;
  toggleHidden: (id: string) => void;
  reorderCategories: (ids: string[]) => void;
  /** Swap in an imported list after it has been saved (see replaceAllData). */
  setCategories: (categories: Category[]) => void;
}

export const useCategoryStore = create<CategoryState>()((set, get) => {
  /** Apply field updates now; put the old values back if saving fails. */
  const patch = (changes: { id: string; updates: Partial<Category> }[]) => {
    const before = new Map(
      get()
        .categories.filter((c) => changes.some((ch) => ch.id === c.id))
        .map((c) => [c.id, c])
    );
    set((state) => ({
      categories: state.categories.map((c) => {
        const change = changes.find((ch) => ch.id === c.id);
        return change ? { ...c, ...change.updates } : c;
      }),
    }));
    for (const { id, updates } of changes) {
      persist(api.updateCategory(id, updates), () =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id && before.has(id) ? before.get(id)! : c
          ),
        }))
      );
    }
  };

  return {
    categories: DEFAULT_CATEGORIES,
    isLoaded: false,

    loadCategories: async () => {
      const categories = await api.fetchCategories();
      set({
        categories: categories.length > 0 ? categories : DEFAULT_CATEGORIES,
        isLoaded: true,
      });
    },

    addCategory: (name, color, icon) => {
      const category: Category = {
        id: uuidv4(),
        name,
        color,
        icon,
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
      const removed = list[index];
      set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
      persist(api.deleteCategory(id), () =>
        set((state) => {
          const next = [...state.categories];
          next.splice(Math.min(index, next.length), 0, removed);
          return { categories: next };
        })
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
