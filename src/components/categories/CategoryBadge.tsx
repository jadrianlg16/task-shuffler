import type { Category } from "@/types";

/** The category's identity is its colour; this dot is how it shows up everywhere. */
export function CategoryDot({
  color,
  size = 8,
}: {
  color: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}

// Text stays in the muted ink colour so contrast holds for any category colour.
export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className="font-body inline-flex items-center gap-1.5"
      style={{ fontSize: 11, color: "var(--ink-muted)" }}
    >
      <CategoryDot color={category.color} size={7} />
      {category.name}
    </span>
  );
}
