import { Archive, ListPlus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const ICONS: Record<string, LucideIcon> = {
  archive: Archive,
  add: ListPlus,
};

interface EmptyStateProps {
  icon: keyof typeof ICONS;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const Icon = ICONS[icon];
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ padding: "48px 0" }}>
      <Icon size={22} strokeWidth={1.5} style={{ color: "var(--ink-muted)", marginBottom: 14 }} />
      <h3 className="font-display" style={{ fontSize: 18, fontWeight: 400, marginBottom: 6 }}>
        {title}
      </h3>
      <p className="font-body max-w-sm" style={{ fontSize: 13, color: "var(--ink-muted)" }}>
        {description}
      </p>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
