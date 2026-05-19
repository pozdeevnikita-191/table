import { Link, useRoute } from "wouter";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    section: "Основное",
    items: [
      { href: "/dashboard", label: "Дашборд", icon: <DashboardIcon /> },
      { href: "/fill", label: "Заполнить день", icon: <CalendarIcon /> },
      { href: "/employees", label: "Сотрудники", icon: <UsersIcon /> },
      { href: "/objects", label: "Объекты", icon: <BuildingIcon /> },
    ],
  },
  {
    section: "Аналитика",
    items: [
      { href: "/reports", label: "Отчёты", icon: <BarChartIcon /> },
    ],
  },
];

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <polygon points="3 9 12 2 21 9 21 20 3 20" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function BarChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function NavItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const [active] = useRoute(href === "/dashboard" ? "/" : href);
  const [dashActive] = useRoute("/dashboard");
  const isActive = href === "/dashboard" ? (active || dashActive) : active;

  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer border-l-2",
        isActive
          ? "bg-primary/10 text-primary border-l-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-transparent"
      )}>
        {icon}
        {label}
      </div>
    </Link>
  );
}

export function Layout({ children, title, actions }: {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <nav className="w-[220px] min-w-[220px] bg-card border-r border-border flex flex-col fixed top-0 left-0 bottom-0 z-10">
        <div className="px-4 py-5 border-b border-border">
          <h1 className="text-[15px] font-bold text-primary">Tabель</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">Учёт рабочего времени</p>
        </div>
        <div className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map(group => (
            <div key={group.section}>
              <div className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                {group.section}
              </div>
              {group.items.map(item => (
                <NavItem key={item.href} {...item} />
              ))}
            </div>
          ))}
        </div>
      </nav>
      <div className="ml-[220px] flex-1 flex flex-col min-h-screen">
        <header className="bg-card border-b border-border px-6 py-3.5 flex items-center justify-between sticky top-0 z-5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {actions && <div className="flex gap-2">{actions}</div>}
        </header>
        <main className="p-6 flex-1">{children}</main>
      </div>
    </div>
  );
}
