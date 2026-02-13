import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category } from "@/types";
import { DEFAULT_CATEGORIES } from "@/data/defaultCategories";
import { v4 as uuidv4 } from "uuid";

interface CategoryState {
  categories: Category[];
  addCategory: (name: string, color: string, icon: string) => void;
  updateCategory: (id: string, updates: Partial<Omit<Category, "id">>) => void;
  deleteCategory: (id: string) => void;
  toggleHidden: (id: string) => void;
  reorderCategories: (ids: string[]) => void;
  importCategories: (categories: Category[]) => void;
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set) => ({
      categories: DEFAULT_CATEGORIES,

      addCategory: (name, color, icon) =>
        set((state) => ({
          categories: [
            ...state.categories,
            {
              id: uuidv4(),
              name,
              color,
              icon,
              isDefault: false,
              isHidden: false,
              sortOrder: state.categories.length,
            },
          ],
        })),

      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        })),

      toggleHidden: (id) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, isHidden: !c.isHidden } : c
          ),
        })),

      reorderCategories: (ids) =>
        set((state) => ({
          categories: ids
            .map((id, index) => {
              const cat = state.categories.find((c) => c.id === id);
              return cat ? { ...cat, sortOrder: index } : null;
            })
            .filter((c): c is Category => c !== null),
        })),

      importCategories: (categories) => set({ categories }),
    }),
    { name: "task-shuffler-categories" }
  )
);
