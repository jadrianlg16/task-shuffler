import { create } from "zustand";
import type { Category } from "@/types";
import { DEFAULT_CATEGORIES } from "@/data/defaultCategories";
import { v4 as uuidv4 } from "uuid";
import * as api from "@/api/db";

interface CategoryState {
  categories: Category[];
  isLoaded: boolean;
  loadCategories: () => Promise<void>;
  addCategory: (name: string, color: string, icon: string) => void;
  updateCategory: (id: string, updates: Partial<Omit<Category, "id">>) => void;
  deleteCategory: (id: string) => void;
  toggleHidden: (id: string) => void;
  reorderCategories: (ids: string[]) => void;
  importCategories: (categories: Category[]) => void;
}

export const useCategoryStore = create<CategoryState>()((set, get) => ({
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
    api.saveCategory(category);
  },

  updateCategory: (id, updates) => {
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
    api.updateCategory(id, updates);
  },

  deleteCategory: (id) => {
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }));
    api.deleteCategory(id);
  },

  toggleHidden: (id) => {
    const cat = get().categories.find((c) => c.id === id);
    if (!cat) return;
    const newHidden = !cat.isHidden;
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, isHidden: newHidden } : c
      ),
    }));
    api.updateCategory(id, { isHidden: newHidden });
  },

  reorderCategories: (ids) => {
    const reordered = ids
      .map((id, index) => {
        const cat = get().categories.find((c) => c.id === id);
        return cat ? { ...cat, sortOrder: index } : null;
      })
      .filter((c): c is Category => c !== null);
    set({ categories: reordered });
    reordered.forEach((c) => api.updateCategory(c.id, { sortOrder: c.sortOrder }));
  },

  importCategories: (categories) => {
    set({ categories });
    api.fetchCategories().then((existing) => {
      existing.forEach((c) => api.deleteCategory(c.id));
      categories.forEach((c) => api.saveCategory(c));
    });
  },
}));
