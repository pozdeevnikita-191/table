import { useState } from "react";
import { useGetUnfilledDays, useListEmployees } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { cn, getInitials } from "@/lib/utils";

const DAYS_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS_OPTIONS = [
  { value: 1, label: "1 мес." },
  { value: 2, label: "2 мес." },
  { value: 3, label: "3 мес." },
  { value: 6, label: "6 мес." },
];

function formatDayOfWeek(dateStr: string) {
  return DAYS_RU[new Date(dateStr + "T00:00:00").getDay()];
}
function formatDayNum(dateStr: string) {
  return dateStr.slice(8);
}
function pluralDays(n: number) {
  return n === 1 ? "день" : n < 5 ? "дня" : "дней";
}

export default function UnfilledDays() {
  const [months, setMonths] = useState(3);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const { data, isLoading } = useGetUnfilledDays({ months });
  const { data: employees = [] } = useListEmployees();

  // Filter days by selected employee
  const filteredData = data
    ? {
        months: data.months
          .map(m => ({
            ...m,
            days: selectedEmployeeId
              ? m.days.filter(d => d.missingEmployees.some(e => e.id === selectedEmployeeId))
              : m.days,
          }))
          .filter(m => m.days.length > 0),
      }
    : null;

  const totalMissingDays = filteredData?.months.reduce((sum, m) => sum + m.days.length, 0) ?? 0;

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId) ?? null;

  function toggleMonth(month: string) {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month); else next.add(month);
      return next;
    });
  }
  function toggleDay(key: string) {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  function selectEmployee(id: number | null) {
    setSelectedEmployeeId(id);
    setExpandedMonths(new Set());
    setExpandedDays(new Set());
  }

  return (
    <Layout title="Незаполненные дни">
      <div className="p-3 md:p-6 space-y-4">

        {/* Controls row */}
        <div className="flex flex-wrap items-start gap-3">

          {/* Employee selector */}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Сотрудник</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => selectEmployee(null)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                  selectedEmployeeId === null
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                Все
              </button>
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => selectEmployee(emp.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                    selectedEmployeeId === emp.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                    style={{ background: emp.color }}
                  >
                    {getInitials(emp.name)}
                  </span>
                  {emp.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Period selector */}
          <div className="flex-shrink-0">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Период</div>
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
        </div>

        {/* Summary bar */}
        {!isLoading && filteredData && (
          <div className="flex items-center gap-2 text-sm">
            {selectedEmployee && (
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ background: selectedEmployee.color }}
              >
                {getInitials(selectedEmployee.name)}
              </span>
            )}
            {totalMissingDays === 0 ? (
              <span className="text-muted-foreground">
                {selectedEmployee ? `У ${selectedEmployee.name} все дни заполнены ✓` : "Все дни заполнены ✓"}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {selectedEmployee
                  ? <><span className="font-semibold text-foreground">{selectedEmployee.name}</span> не заполнил{" "}
                    <span className="font-semibold text-foreground">{totalMissingDays}</span> {pluralDays(totalMissingDays)}</>
                  : <>Незаполнено: <span className="font-semibold text-foreground">{totalMissingDays}</span> {pluralDays(totalMissingDays)}</>
                }
              </span>
            )}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : !filteredData || filteredData.months.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="text-3xl mb-3">✓</div>
            <div className="font-semibold text-foreground mb-1">
              {selectedEmployee ? `У ${selectedEmployee.name} всё заполнено` : "Все дни заполнены"}
            </div>
            <div className="text-sm text-muted-foreground">
              Нет пропущенных рабочих дней за выбранный период
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredData.months.map(monthGroup => {
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
                        {monthGroup.days.length} {pluralDays(monthGroup.days.length)}
                      </span>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                      className={cn("w-4 h-4 text-muted-foreground transition-transform", isMonthOpen && "rotate-180")}>
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

                        // In employee mode: fill link goes directly to this employee
                        const fillHref = selectedEmployeeId
                          ? `/fill?date=${day.date}&employeeId=${selectedEmployeeId}`
                          : `/fill?date=${day.date}`;

                        return (
                          <div key={day.date}>
                            <div className="flex items-center gap-3 px-4 py-3">
                              {/* Date badge */}
                              <div className="flex-shrink-0 w-12 text-center">
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{dow}</div>
                                <div className="text-lg font-bold leading-tight">{dayNum}</div>
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                {selectedEmployeeId ? (
                                  // Employee mode: just show the date context, no extra info needed
                                  <span className="text-sm text-muted-foreground">
                                    {day.date.slice(0, 7) /* month already shown in header */}
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn(
                                      "text-xs font-medium px-2 py-0.5 rounded-full",
                                      allMissing
                                        ? "bg-destructive/15 text-destructive"
                                        : "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                                    )}>
                                      {allMissing ? "Никто не заполнил" : `${day.missingCount} из ${day.totalEmployees}`}
                                    </span>
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
                                )}
                              </div>

                              {/* Fill button */}
                              <Link
                                href={fillHref}
                                className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                              >
                                Заполнить
                              </Link>
                            </div>

                            {/* Expanded employee list (only in "all" mode) */}
                            {!selectedEmployeeId && isDayOpen && (
                              <div className="bg-muted/30 px-4 pb-3 space-y-1.5">
                                {day.missingEmployees.map(emp => {
                                  const empObj = employees.find(e => e.id === emp.id);
                                  return (
                                    <div key={emp.id} className="flex items-center justify-between py-1">
                                      <div className="flex items-center gap-2">
                                        {empObj && (
                                          <span
                                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                            style={{ background: empObj.color }}
                                          >
                                            {getInitials(emp.name)}
                                          </span>
                                        )}
                                        <span className="text-sm text-foreground">{emp.name}</span>
                                      </div>
                                      <Link
                                        href={`/fill?date=${day.date}&employeeId=${emp.id}`}
                                        className="text-xs text-primary hover:underline underline-offset-2 font-medium"
                                      >
                                        Заполнить →
                                      </Link>
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
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
