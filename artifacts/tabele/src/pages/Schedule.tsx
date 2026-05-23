import { useState, useMemo } from "react";
import {
  useGetSchedule,
  useUpsertScheduleDay,
  useListEmployees,
  useListObjects,
} from "@workspace/api-client-react";
import type { ScheduleAssignment } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { cn, getInitials } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { getGetScheduleQueryKey } from "@workspace/api-client-react";

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
  // 0=Mon..6=Sun
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
  employeeId: number | "";
  objectId: number | "";
  objectName: string;
  task: string;
};

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
    setDraftList(
      existing.map((a, i) => ({
        key: i,
        employeeId: a.employeeId,
        objectId: a.objectId ?? "",
        objectName: a.objectName,
        task: a.task,
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
    setDraftList(prev => [...prev, { key: draftKey, employeeId: "", objectId: "", objectName: "", task: "" }]);
    setDraftKey(k => k + 1);
  }

  function removeRow(key: number) {
    setDraftList(prev => prev.filter(r => r.key !== key));
  }

  function updateRow(key: number, patch: Partial<Omit<DraftAssignment, "key">>) {
    setDraftList(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r));
  }

  async function save() {
    if (!modalDate) return;
    const assignments: ScheduleAssignment[] = draftList
      .filter(r => r.employeeId !== "")
      .map(r => {
        const emp = employees.find(e => e.id === r.employeeId);
        let objectName = r.objectName.trim();
        if (!objectName && r.objectId !== "") {
          objectName = objects.find(o => o.id === r.objectId)?.name ?? "";
        }
        return {
          employeeId: r.employeeId as number,
          objectId: r.objectId !== "" ? r.objectId as number : null,
          objectName: objectName || (emp?.name ?? ""),
          task: r.task,
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

  const empMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  return (
    <Layout title="Расписание">
      <div className="flex flex-col h-full">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 className="font-semibold text-sm">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Calendar */}
        <div className="flex-1 overflow-auto p-2 md:p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-px">
            {DAY_NAMES.map((d, i) => (
              <div
                key={d}
                className={cn(
                  "text-center text-[10px] font-semibold uppercase tracking-wider py-1.5",
                  i >= 5 ? "text-muted-foreground/60" : "text-muted-foreground"
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div
            className="grid grid-cols-7 border border-border rounded-xl overflow-hidden"
            style={{ gap: "1px", background: "hsl(var(--border))" }}
          >
            {cells.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="bg-muted/30 min-h-[110px]" />;
              }
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
                  {/* Day number */}
                  <div className="flex justify-end">
                    <span
                      className={cn(
                        "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full leading-none",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : isWeekend
                          ? "text-muted-foreground"
                          : "text-foreground"
                      )}
                    >
                      {parseInt(date.slice(8))}
                    </span>
                  </div>

                  {/* Assignment chips */}
                  <div className="flex flex-col gap-0.5 flex-1">
                    {assignments.slice(0, 3).map((a, i) => {
                      const emp = empMap.get(a.employeeId);
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight overflow-hidden bg-background border border-border"
                          style={{ borderLeftWidth: "3px", borderLeftColor: emp?.color ?? "#888" }}
                        >
                          <span className="font-medium truncate text-foreground/90">
                            {emp?.name.split(" ")[0] ?? "?"}
                          </span>
                          {a.objectName && (
                            <span className="text-muted-foreground truncate hidden sm:block">
                              · {a.objectName}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {assignments.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-1">
                        ...и ещё {assignments.length - 3}
                      </div>
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
          <div className="bg-card w-full sm:max-w-lg sm:rounded-xl rounded-t-xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border flex-shrink-0">
              <h3 className="font-semibold text-sm">{formatModalDate(modalDate)}</h3>
              <button
                onClick={closeModal}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {draftList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Нет назначений на этот день
                </p>
              )}
              {draftList.map(row => {
                const emp = employees.find(e => e.id === row.employeeId);
                return (
                  <div key={row.key} className="flex gap-2 items-start p-3 bg-muted/30 rounded-lg border border-border">
                    {/* Employee color dot */}
                    {emp && (
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5"
                        style={{ background: emp.color }}
                      >
                        {getInitials(emp.name)}
                      </span>
                    )}
                    <div className="flex-1 space-y-2 min-w-0">
                      {/* Employee select */}
                      <select
                        value={row.employeeId}
                        onChange={e => {
                          const id = e.target.value === "" ? "" : parseInt(e.target.value);
                          updateRow(row.key, { employeeId: id });
                        }}
                        className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">— Сотрудник —</option>
                        {employees.map(e => (
                          <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </select>
                      {/* Object select + freeform */}
                      <div className="flex gap-2">
                        <select
                          value={row.objectId}
                          onChange={e => {
                            const id = e.target.value === "" ? "" : parseInt(e.target.value);
                            const obj = objects.find(o => o.id === id);
                            updateRow(row.key, { objectId: id, objectName: obj?.name ?? row.objectName });
                          }}
                          className="flex-1 text-sm border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">— Объект —</option>
                          {objects.map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={row.objectName}
                          onChange={e => updateRow(row.key, { objectName: e.target.value, objectId: "" })}
                          placeholder="или введите вручную"
                          className="flex-1 text-sm border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      {/* Task */}
                      <input
                        type="text"
                        value={row.task}
                        onChange={e => updateRow(row.key, { task: e.target.value })}
                        placeholder="Задача / комментарий"
                        className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <button
                      onClick={() => removeRow(row.key)}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 p-1 mt-0.5"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                );
              })}

              <button
                onClick={addRow}
                className="w-full py-2 text-sm text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5 transition-colors font-medium"
              >
                + Добавить назначение
              </button>
            </div>

            {/* Modal footer */}
            <div className="px-4 py-3 border-t border-border flex gap-2 flex-shrink-0">
              <button
                onClick={closeModal}
                className="flex-1 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
