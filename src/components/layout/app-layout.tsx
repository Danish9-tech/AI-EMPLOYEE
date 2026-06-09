import { Sidebar } from "./sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-[100dvh] lg:pl-72 transition-all duration-300">
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 pt-16 lg:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
