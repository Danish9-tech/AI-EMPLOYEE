import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Bot, MessageSquare, Users, Calendar,
  Smartphone, CreditCard, Settings, LogOut, Menu,
  Store, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuthContext } from "@/App";
import { supabase } from "@/lib/supabase";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assistants", label: "Assistants", icon: Bot },
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/whatsapp", label: "WhatsApp", icon: Smartphone },
  { href: "/subscription", label: "Subscription", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuthContext();

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-background/50 backdrop-blur-xl border-r border-border">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary/20 p-2 rounded-xl">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
          AI Employee
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/30">
            <span className="text-primary font-bold">{user?.email?.[0]?.toUpperCase() || "U"}</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate">{user?.email || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={() => supabase.auth.signOut()}
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sign Out</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0 left-0 z-50">
        <SidebarContent />
      </aside>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden fixed top-4 left-4 z-50">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 border-r-border/50">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
