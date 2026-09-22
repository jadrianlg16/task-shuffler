import type { ReactNode } from "react";

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="app-shell flex flex-col items-stretch animate-fade-up">
        {children}
      </div>
    </div>
  );
}
