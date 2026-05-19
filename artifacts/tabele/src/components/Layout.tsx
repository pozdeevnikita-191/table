import { Link, useRoute, useLocation } from "wouter";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Дашборд", icon: DashboardIcon, shortLabel: "Главная" },
  { href: "/fill",      label: "Заполнить день", icon: CalendarIcon, shortLabel: "День" },
  { href: "/employees", label: "Сотрудники", icon: UsersIcon, shortLabel: "Люди" },
  { href: "/objects",   label: "Объекты", icon: BuildingIcon, shortLabel: "Объекты" },
  { href: "/reports",   label: "Отчёты", icon: BarChartIcon, shortLabel: "Отчёты" },
];

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className ?? "w-5 h-5"}>
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className ?? "w-5 h-5"}>
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className ?? "w-5 h-5"}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className ?? "w-5 h-5"}>
      <polygon points="3 9 12 2 21 9 21 20 3 20" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className ?? "w-5 h-5"}>
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SidebarNavItem({ href, label, icon: Icon, onClick }: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  const [active] = useRoute(href === "/dashboard" ? "/" : href);
  const [dashActive] = useRoute("/dashboard");
  const isActive = href === "/dashboard" ? (active || dashActive) : active;

  return (
    <Link href={href} onClick={onClick}>
      <div className={cn(
        "flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer border-l-2",
        isActive
          ? "bg-primary/10 text-primary border-l-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-transparent"
      )}>
        <Icon className="w-4 h-4" />
        {label}
      </div>
    </Link>
  );
}

function BottomNavItem({ href, label, icon: Icon }: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const [active] = useRoute(href === "/dashboard" ? "/" : href);
  const [dashActive] = useRoute("/dashboard");
  const isActive = href === "/dashboard" ? (active || dashActive) : active;

  return (
    <Link href={href}>
      <div className={cn(
        "flex flex-col items-center gap-0.5 py-2 px-1 transition-all cursor-pointer flex-1",
        isActive ? "text-primary" : "text-muted-foreground"
      )}>
        <Icon className="w-5 h-5" />
        <span className="text-[10px] font-medium leading-tight">{label}</span>
        {isActive && <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-t-full" />}
      </div>
    </Link>
  );
}

export function Layout({ children, title, actions }: {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <nav className="hidden md:flex w-[220px] min-w-[220px] bg-card border-r border-border flex-col fixed top-0 left-0 bottom-0 z-10">
        <div className="px-4 py-5 border-b border-border">
          <h1 className="text-[15px] font-bold text-primary">Tabель</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">Учёт рабочего времени</p>
        </div>
        <div className="flex-1 py-2 overflow-y-auto">
          <div className="py-2">
            <div className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Основное</div>
            {NAV_ITEMS.slice(0, 4).map(item => (
              <SidebarNavItem key={item.href} href={item.href} label={item.label} icon={item.icon} />
            ))}
          </div>
          <div className="py-2">
            <div className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Аналитика</div>
            {NAV_ITEMS.slice(4).map(item => (
              <SidebarNavItem key={item.href} href={item.href} label={item.label} icon={item.icon} />
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      {/* Mobile slide-out drawer */}
      <nav className={cn(
        "md:hidden fixed top-0 left-0 bottom-0 w-[260px] bg-card border-r border-border z-50 flex flex-col transition-transform duration-200",
        drawerOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-4 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-bold text-primary">Tabель</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Учёт рабочего времени</p>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <SidebarNavItem key={item.href} href={item.href} label={item.label} icon={item.icon} onClick={() => setDrawerOpen(false)} />
          ))}
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-[220px]">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors flex-shrink-0"
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </button>
          <h2 className="text-[15px] font-semibold flex-1 truncate">{title}</h2>
          {actions && <div className="flex gap-2 flex-shrink-0">{actions}</div>}
        </header>

        {/* Page content */}
        <main className="p-3 md:p-6 flex-1 pb-20 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 flex items-stretch relative">
        {NAV_ITEMS.map(item => (
          <BottomNavItem key={item.href} href={item.href} label={item.shortLabel} icon={item.icon} />
        ))}
      </nav>
    </div>
  );
}
