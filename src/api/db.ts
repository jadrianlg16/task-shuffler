import * as httpDb from "./httpDb";
import * as localDb from "./localDb";

/**
 * Storage façade. Default: json-server over HTTP (httpDb).
 * Build with VITE_STORAGE=local for a serverless localStorage build
 * (used by the portfolio embed at adriangaona.dev).
 */
const impl = import.meta.env.VITE_STORAGE === "local" ? localDb : httpDb;

export const fetchActivities = impl.fetchActivities;
export const saveActivity = impl.saveActivity;
export const updateActivity = impl.updateActivity;
export const deleteActivity = impl.deleteActivity;
export const fetchCategories = impl.fetchCategories;
export const saveCategory = impl.saveCategory;
export const updateCategory = impl.updateCategory;
export const deleteCategory = impl.deleteCategory;
