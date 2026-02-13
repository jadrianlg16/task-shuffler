import type { Category } from "@/types";

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: category.color + "20",
        color: category.color,
      }}
    >
      {category.icon} {category.name}
    </span>
  );
}
