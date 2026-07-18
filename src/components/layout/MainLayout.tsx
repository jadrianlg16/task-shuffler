import type { ReactNode } from "react";

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div
        className="mx-auto flex flex-col items-stretch animate-fade-up"
        style={{ maxWidth: 480, paddingTop: 48, paddingBottom: 80, paddingLeft: 20, paddingRight: 20 }}
      >
        {children}
      </div>
    </div>
  );
}
