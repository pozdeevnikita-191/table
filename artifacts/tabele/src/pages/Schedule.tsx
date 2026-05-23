import { useState, useMemo } from "react";
import {
  useGetSchedule,
  useUpsertScheduleDay,
  useListEmployees,
  useListObjects,
  getGetScheduleQueryKey,
} from "@workspace/api-client-react";
import type { ScheduleAssignment } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { cn, getInitials } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const MONTH_NAMES = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];
const DAY_NAMES = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const DAY_NAMES_LONG = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];
const MONTH_NAMES_GEN = [
  "января","февраля","марта","апреля","мая","июня",
  "июля","августа","сентября","октября","ноября","декабря",
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function buildCalendarGrid(year: number, month: number) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const cells: Array<string | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function formatModalDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const dow = DAY_NAMES_LONG[d.getDay() === 0 ? 6 : d.getDay() - 1];
  return `${dow}, ${d.getDate()} ${MONTH_NAMES_GEN[d.getMonth()]}`;
}

type DraftAssignment = {
  key: number;
  employeeIds: number[];
  objectId: number | "";
  objectName: string;
  task: string;
  startTime: string;
  endTime: string;
};

function emptyDraft(key: number): DraftAssignment {
  return { key, employeeIds: [], objectId: "", objectName: "", task: "", startTime: "", endTime: "" };
}

export default function Schedule() {
  const today = todayStr();
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(nowYear);
  const [month, setMonth] = useState(nowMonth);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [draftList, setDraftList] = useState<DraftAssignment[]>([]);
  const [draftKey, setDraftKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const { data: scheduleDays = [] } = useGetSchedule({ year, month });
  const { data: employees = [] } = useListEmployees();
  const { data: objects = [] } = useListObjects();
  const upsert = useUpsertScheduleDay();
  const qc = useQueryClient();

  const scheduleMap = useMemo(() => {
    const m = new Map<string, ScheduleAssignment[]>();
    for (const day of scheduleDays) {
      m.set(day.date, day.assignments as ScheduleAssignment[]);
    }
    return m;
  }, [scheduleDays]);

  const empMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const cells = buildCalendarGrid(year, month);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  function openDay(date: string) {
    const existing = scheduleMap.get(date) ?? [];
    let key = 0;
    setDraftList(
      existing.map(a => ({
        key: key++,
        employeeIds: (a as DraftAssignment & { employeeIds?: number[]; employeeId?: number }).employeeIds
          ?? (((a as DraftAssignment & { employeeId?: number }).employeeId != null)
            ? [(a as DraftAssignment & { employeeId?: number }).employeeId!]
            : []),
        objectId: a.objectId ?? "",
        objectName: a.objectName,
        task: a.task,
        startTime: a.startTime ?? "",
        endTime: a.endTime ?? "",
      }))
    );
    setDraftKey(existing.length);
    setModalDate(date);
  }

  function closeModal() {
    setModalDate(null);
    setDraftList([]);
  }

  function addRow() {
    setDraftList(prev => [...prev, emptyDraft(draftKey)]);
    setDraftKey(k => k + 1);
  }

  function removeRow(key: number) {
    setDraftList(prev => prev.filter(r => r.key !== key));
  }

  function updateRow(key: number, patch: Partial<Omit<DraftAssignment, "key">>) {
    setDraftList(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r));
  }

  function toggleEmployee(rowKey: number, empId: number) {
    setDraftList(prev => prev.map(r => {
      if (r.key !== rowKey) return r;
      const has = r.employeeIds.includes(empId);
      return { ...r, employeeIds: has ? r.employeeIds.filter(id => id !== empId) : [...r.employeeIds, empId] };
    }));
  }

  async function save() {
    if (!modalDate) return;
    const assignments: ScheduleAssignment[] = draftList
      .filter(r => r.employeeIds.length > 0)
      .map(r => {
        let objectName = r.objectName.trim();
        if (!objectName && r.objectId !== "") {
          objectName = objects.find(o => o.id === r.objectId)?.name ?? "";
        }
        return {
          employeeIds: r.employeeIds,
          objectId: r.objectId !== "" ? r.objectId as number : null,
          objectName,
          task: r.task,
          startTime: r.startTime || undefined,
          endTime: r.endTime || undefined,
        };
      });
    setSaving(true);
    try {
      await upsert.mutateAsync({ data: { date: modalDate, assignments } });
      await qc.invalidateQueries({ queryKey: getGetScheduleQueryKey({ year, month }) });
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Расписание">
      <div className="flex flex-col h-full">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="font-semibold text-sm">{MONTH_NAMES[month - 1]} {year}</h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        {/* Calendar */}
        <div className="flex-1 overflow-auto p-2 md:p-4">
          <div className="grid grid-cols-7 gap-px mb-px">
            {DAY_NAMES.map((d, i) => (
              <div key={d} className={cn("text-center text-[10px] font-semibold uppercase tracking-wider py-1.5", i >= 5 ? "text-muted-foreground/60" : "text-muted-foreground")}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 border border-border rounded-xl overflow-hidden" style={{ gap: "1px", background: "hsl(var(--border))" }}>
            {cells.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="bg-muted/30 min-h-[110px]" />;
              const isToday = date === today;
              const isWeekend = idx % 7 >= 5;
              const assignments = scheduleMap.get(date) ?? [];

              return (
                <div
                  key={date}
                  onClick={() => openDay(date)}
                  className={cn(
                    "min-h-[110px] p-1.5 cursor-pointer transition-colors hover:bg-primary/5 flex flex-col gap-1",
                    isWeekend ? "bg-muted/20" : "bg-card",
                    isToday && "ring-2 ring-inset ring-primary"
                  )}
                >
                  <div className="flex justify-end">
                    <span className={cn(
                      "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full leading-none",
                      isToday ? "bg-primary text-primary-foreground" : isWeekend ? "text-muted-foreground" : "text-foreground"
                    )}>
                      {parseInt(date.slice(8))}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5 flex-1">
                    {assignments.slice(0, 3).map((a, i) => {
                      const empIds = (a as ScheduleAssignment & { employeeIds?: number[] }).employeeIds ?? [];
                      return (
                        <div key={i} className="rounded px-1 py-0.5 text-[10px] leading-tight overflow-hidden bg-background border border-border">
                          {/* Employee dots row */}
                          <div className="flex items-center gap-0.5 flex-wrap">
                            {empIds.slice(0, 3).map(id => {
                              const emp = empMap.get(id);
                              return emp ? (
                                <span key={id} className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white flex-shrink-0" style={{ background: emp.color }}>
                                  {getInitials(emp.name).slice(0, 1)}
                                </span>
                              ) : null;
                            })}
                            {empIds.length > 3 && <span className="text-muted-foreground text-[9px]">+{empIds.length - 3}</span>}
                            {a.startTime && (
                              <span className="text-muted-foreground ml-auto text-[9px]">{a.startTime}{a.endTime ? `–${a.endTime}` : ""}</span>
                            )}
                          </div>
                          {a.objectName && (
                            <span className="text-muted-foreground truncate block mt-0.5">{a.objectName}</span>
                          )}
                        </div>
                      );
                    })}
                    {assignments.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-1">...и ещё {assignments.length - 3}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day detail modal */}
      {modalDate && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-card w-full sm:max-w-xl sm:rounded-xl rounded-t-xl overflow-hidden shadow-xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border flex-shrink-0">
              <h3 className="font-semibold text-sm">{formatModalDate(modalDate)}</h3>
              <button onClick={closeModal} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {draftList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Нет запланированных работ на этот день</p>
              )}

              {draftList.map((row, rowIdx) => (
                <div key={row.key} className="border border-border rounded-xl overflow-hidden">
                  {/* Task header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Работа {rowIdx + 1}</span>
                    <button onClick={() => removeRow(row.key)} className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-3 space-y-3">
                    {/* Employee multi-select */}
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Сотрудники</div>
                      <div className="flex flex-wrap gap-1.5">
                        {employees.map(emp => {
                          const selected = row.employeeIds.includes(emp.id);
                          return (
                            <button
                              key={emp.id}
                              onClick={() => toggleEmployee(row.key, emp.id)}
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                                selected
                                  ? "text-white border-transparent"
                                  : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-background"
                              )}
                              style={selected ? { background: emp.color, borderColor: emp.color } : {}}
                            >
                              <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0", selected ? "bg-white/25 text-white" : "text-white")} style={selected ? {} : { background: emp.color }}>
                                {getInitials(emp.name).slice(0, 1)}
                              </span>
                              {emp.name.split(" ")[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Object */}
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Объект</div>
                      <select
                        value={row.objectId}
                        onChange={e => {
                          const id = e.target.value === "" ? "" : parseInt(e.target.value);
                          const obj = objects.find(o => o.id === id);
                          updateRow(row.key, { objectId: id, objectName: obj?.name ?? "" });
                        }}
                        className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">— Выбрать из списка —</option>
                        {objects.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={row.objectName}
                        onChange={e => updateRow(row.key, { objectName: e.target.value, objectId: "" })}
                        placeholder="или введите название вручную"
                        className="w-full mt-1.5 text-sm border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    {/* Time range */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Время</div>
                        {row.startTime && row.endTime && (() => {
                          const [sh, sm] = row.startTime.split(":").map(Number);
                          const [eh, em] = row.endTime.split(":").map(Number);
                          const hrs = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 10) / 10;
                          return hrs > 0 ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary">{hrs} ч</span>
                          ) : null;
                        })()}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Начало</label>
                          <input
                            type="time"
                            value={row.startTime}
                            onChange={e => updateRow(row.key, { startTime: e.target.value })}
                            className="w-full px-2.5 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Конец</label>
                          <input
                            type="time"
                            value={row.endTime}
                            onChange={e => updateRow(row.key, { endTime: e.target.value })}
                            className="w-full px-2.5 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Task */}
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Задача</div>
                      <input
                        type="text"
                        value={row.task}
                        onChange={e => updateRow(row.key, { task: e.target.value })}
                        placeholder="Описание работ / комментарий"
                        className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addRow}
                className="w-full py-2.5 text-sm text-primary border border-dashed border-primary/40 rounded-xl hover:bg-primary/5 transition-colors font-medium"
              >
                + Запланировать работы
              </button>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border flex gap-2 flex-shrink-0">
              <button onClick={closeModal} className="flex-1 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors">
                Отмена
              </button>
              <button onClick={save} disabled={saving} className="flex-1 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
