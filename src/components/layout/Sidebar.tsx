"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  CalendarRange,
  CalendarClock,
  Briefcase,
  Bot,
  Plug,
  ScrollText,
  BookOpen,
  Settings,
  Menu,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/planner", label: "Planner", icon: CalendarRange },
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/workspace", label: "Workspace", icon: Briefcase },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/providers", label: "Providers", icon: Plug },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const isWorkspace = pathname === "/workspace" || pathname.startsWith("/workspace/");
  
  // Default to collapsed in workspace, expanded elsewhere, but allow manual toggle
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Auto-collapse when entering workspace, auto-expand when leaving (if user hasn't explicitly set it)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsCollapsed(isWorkspace);
  }, [isWorkspace]);

  return (
    <aside 
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out shrink-0",
        isCollapsed ? "w-14" : "w-60"
      )}
    >
      <div className={cn(
        "flex h-14 items-center border-b border-sidebar-border px-3",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-transparent">
            <Image src="/icon.png" alt="VibeForge Logo" width={32} height={32} className="object-contain" />
          </div>
          {!isCollapsed && (
            <span className="text-base font-semibold tracking-tight text-sidebar-foreground truncate">
              VibeForge
            </span>
          )}
        </div>
        {!isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3 scrollbar-none">
        {isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(false)}
            className="flex items-center justify-center w-full mb-4 p-2 text-sidebar-foreground/50 hover:text-sidebar-foreground"
          >
            <Menu className="size-5" />
          </button>
        )}
        
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          
          const content = (
            <Link
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md transition-colors h-10",
                isCollapsed ? "justify-center px-0" : "px-3",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </Link>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={href}>
                <TooltipTrigger render={content} />
                <TooltipContent side="right" sideOffset={10}>
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={href}>{content}</div>;
        })}
      </nav>
    </aside>
  );
}
