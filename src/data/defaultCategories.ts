import type { Category } from "@/types";

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "school",
    name: "School",
    color: "#3B82F6",
    isDefault: true,
    isHidden: false,
    sortOrder: 0,
  },
  {
    id: "personal",
    name: "Personal",
    color: "#8B5CF6",
    isDefault: true,
    isHidden: false,
    sortOrder: 1,
  },
  {
    id: "business",
    name: "Business",
    color: "#F59E0B",
    isDefault: true,
    isHidden: false,
    sortOrder: 2,
  },
  {
    id: "hobby",
    name: "Hobby",
    color: "#10B981",
    isDefault: true,
    isHidden: false,
    sortOrder: 3,
  },
  {
    id: "field",
    name: "Field",
    color: "#EF4444",
    isDefault: true,
    isHidden: false,
    sortOrder: 4,
  },
  {
    id: "unassigned",
    name: "Unassigned",
    color: "#6B7280",
    isDefault: true,
    isHidden: false,
    sortOrder: 5,
  },
];
