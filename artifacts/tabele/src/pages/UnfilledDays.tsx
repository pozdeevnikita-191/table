import { useState } from "react";
import { useGetUnfilledDays } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const DAYS_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS_OPTIONS = [
  { value: 1, label: "1 месяц" },
  { value: 2, label: "2 месяца" },
  { value: 3, label: "3 месяца" },
  { value: 6, label: "6 месяцев" },
];

function formatDayOfWeek(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return DAYS_RU[d.getDay()];
}

function formatDayNum(dateStr: string) {
  return dateStr.slice(8); // "2026-05-19" → "19"
}

export default function UnfilledDays() {
  const [months, setMonths] = useState(3);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const { data, isLoading } = useGetUnfilledDays({ months });

  const totalMissingDays = data?.months.reduce((sum, m) => sum + m.days.length, 0) ?? 0;

  function toggleMonth(month: string) {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  }

  function toggleDay(key: string) {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <Layout title="Незаполненные дни">
      <div className="p-3 md:p-6 space-y-4">

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Период:</span>
            <div className="flex gap-1">
              {MONTHS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setMonths(opt.value)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                    months === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {!isLoading && data && (
            <div className="text-sm text-muted-foreground">
              {totalMissingDays === 0
                ? "Все дни заполнены ✓"
                : <span>Незаполнено: <span className="font-semibold text-foreground">{totalMissingDays}</span> {totalMissingDays === 1 ? "день" : totalMissingDays < 5 ? "дня" : "дней"}</span>
              }
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : !data || data.months.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="text-3xl mb-3">✓</div>
            <div className="font-semibold text-foreground mb-1">Все дни заполнены</div>
            <div className="text-sm text-muted-foreground">Нет пропущенных рабочих дней за выбранный период</div>
          </div>
        ) : (
          <div className="space-y-3">
            {data.months.map(monthGroup => {
              const isMonthOpen = expandedMonths.has(monthGroup.month);
              return (
                <div key={monthGroup.month} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                  {/* Month header */}
                  <button
                    onClick={() => toggleMonth(monthGroup.month)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{monthGroup.label}</span>
                      <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2 py-0.5 rounded-full">
                        {monthGroup.days.length} {monthGroup.days.length === 1 ? "день" : monthGroup.days.length < 5 ? "дня" : "дней"}
                      </span>
                    </div>
                    <svg
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                      className={cn("w-4 h-4 text-muted-foreground transition-transform", isMonthOpen && "rotate-180")}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Days list */}
                  {isMonthOpen && (
                    <div className="border-t border-border divide-y divide-border">
                      {monthGroup.days.map(day => {
                        const dayKey = `${monthGroup.month}_${day.date}`;
                        const isDayOpen = expandedDays.has(dayKey);
                        const allMissing = day.missingCount === day.totalEmployees;
                        const dow = formatDayOfWeek(day.date);
                        const dayNum = formatDayNum(day.date);

                        return (
                          <div key={day.date}>
                            {/* Day row */}
                            <div className="flex items-center gap-3 px-4 py-3">
                              {/* Date badge */}
                              <div className="flex-shrink-0 w-12 text-center">
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{dow}</div>
                                <div className="text-lg font-bold leading-tight">{dayNum}</div>
                              </div>

                              {/* Missing info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={cn(
                                    "text-xs font-medium px-2 py-0.5 rounded-full",
                                    allMissing
                                      ? "bg-destructive/15 text-destructive"
                                      : "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                                  )}>
                                    {allMissing ? "Никто не заполнил" : `${day.missingCount} из ${day.totalEmployees}`}
                                  </span>
                                  {/* First few names inline */}
                                  <button
                                    onClick={() => toggleDay(dayKey)}
                                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                                  >
                                    {isDayOpen
                                      ? "Скрыть"
                                      : day.missingEmployees.slice(0, 3).map(e => e.name.split(" ")[0]).join(", ")
                                        + (day.missingCount > 3 ? ` и ещё ${day.missingCount - 3}` : "")
                                    }
                                  </button>
                                </div>
                              </div>

                              {/* Fill button */}
                              <Link
                                href={`/fill?date=${day.date}`}
                                className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                              >
                                Заполнить
                              </Link>
                            </div>

                            {/* Expanded: list of missing employees with individual fill links */}
                            {isDayOpen && (
                              <div className="bg-muted/30 px-4 pb-3 space-y-1.5">
                                {day.missingEmployees.map(emp => (
                                  <div key={emp.id} className="flex items-center justify-between py-1">
                                    <span className="text-sm text-foreground">{emp.name}</span>
                                    <Link
                                      href={`/fill?date=${day.date}&employeeId=${emp.id}`}
                                      className="text-xs text-primary hover:underline underline-offset-2 font-medium"
                                    >
                                      Заполнить →
                                    </Link>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
