import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEmployees,
  useListObjects,
  useListEntries,
  useCreateEntry,
  getListEntriesQueryKey,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { todayStr, DAY_TYPE_LABELS, calcHours, MONTH_NAMES, getInitials } from "@/lib/utils";

interface Segment {
  objectId: number;
  startTime: string;
  endTime: string;
  note: string;
  overtime: boolean;
  approvedBy: string;
}

const DAYS_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

const DEFAULT_SEG = (): Segment => ({
  objectId: 0, startTime: "09:00", endTime: "18:00", note: "", overtime: false, approvedBy: "",
});

const DEFAULT_OT_SEG = (): Segment => ({
  objectId: 0, startTime: "18:00", endTime: "20:00", note: "", overtime: true, approvedBy: "",
});

export default function FillDay() {
  const qc = useQueryClient();
  const { data: employees = [] } = useListEmployees();
  const { data: objects = [] } = useListObjects();

  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [date, setDate] = useState(todayStr());
  const [dayType, setDayType] = useState("work");
  const [segments, setSegments] = useState<Segment[]>([DEFAULT_SEG()]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  useEffect(() => {
    if (employees.length > 0 && employeeId === null) {
      setEmployeeId(employees[0].id);
    }
  }, [employees, employeeId]);

  const monthStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
  const { data: monthEntries = [] } = useListEntries(
    employeeId ? { employeeId, from: `${monthStr}-01`, to: `${monthStr}-31` } : undefined,
    { query: { enabled: !!employeeId } }
  );

  const createEntry = useCreateEntry();
  const entryDates = new Set(monthEntries.map(e => e.date));
  const vacDates = new Set(monthEntries.filter(e => e.type !== "work").map(e => e.date));

  useEffect(() => {
    if (!employeeId) return;
    const existing = monthEntries.find(e => e.date === date);
    if (existing) {
      setDayType(existing.type);
      if (existing.type === "work" && existing.segments.length > 0) {
        setSegments(existing.segments.map((s: Segment) => ({
          objectId: s.objectId,
          startTime: s.startTime,
          endTime: s.endTime,
          note: s.note ?? "",
          overtime: s.overtime ?? false,
          approvedBy: s.approvedBy ?? "",
        })));
      } else if (existing.type === "work") {
        setSegments([{ ...DEFAULT_SEG(), objectId: objects[0]?.id ?? 0 }]);
      }
    } else {
      setDayType("work");
      setSegments([{ ...DEFAULT_SEG(), objectId: objects[0]?.id ?? 0 }]);
    }
  }, [date, employeeId]);

  function addSegment() {
    setSegments(s => [...s, { ...DEFAULT_SEG(), objectId: objects[0]?.id ?? 0 }]);
  }
  function addOvertimeSegment() {
    setSegments(s => [...s, { ...DEFAULT_OT_SEG(), objectId: objects[0]?.id ?? 0 }]);
  }
  function removeSegment(i: number) {
    setSegments(s => s.filter((_, idx) => idx !== i));
  }
  function updateSegment(i: number, field: keyof Segment, value: string | number | boolean) {
    setSegments(s => s.map((seg, idx) => idx === i ? { ...seg, [field]: value } : seg));
  }

  async function saveDay() {
    if (!employeeId) return;
    setSaving(true);
    try {
      await createEntry.mutateAsync({
        data: {
          employeeId,
          date,
          type: dayType as "work" | "vacation" | "sick" | "off",
          segments: dayType === "work" ? segments.filter(s => s.objectId > 0) : [],
        },
      });
      await qc.invalidateQueries({ queryKey: getListEntriesQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calDays: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);
  while (calDays.length % 7 !== 0) calDays.push(null);

  const selectedDateLabel = (() => {
    const [y, m, d] = date.split("-");
    return `${d}.${m}.${y}`;
  })();

  const regularSegs = segments.filter(s => !s.overtime);
  const overtimeSegs = segments.filter(s => s.overtime);
  const totalRegular = regularSegs.reduce((sum, s) => sum + calcHours(s.startTime, s.endTime), 0);
  const totalOvertime = overtimeSegs.reduce((sum, s) => sum + calcHours(s.startTime, s.endTime), 0);

  return (
    <Layout
      title="Заполнить день"
      actions={
        <button
          onClick={saveDay}
          disabled={saving || !employeeId}
          className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? "..." : saved ? "✓ Сохранено" : "Сохранить"}
        </button>
      }
    >
      <div className="p-3 md:p-6 space-y-3">
        {/* ─── Контролы: сотрудник + дата + тип ─── */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Сотрудник</label>
              <div className="flex gap-2 flex-wrap">
                {employees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => setEmployeeId(emp.id)}
                    className={["flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                      employeeId === emp.id ? "border-primary bg-primary text-white" : "border-border bg-background text-foreground hover:border-primary/50"
                    ].join(" ")}
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: employeeId === emp.id ? "rgba(255,255,255,0.25)" : emp.color + "22", color: employeeId === emp.id ? "white" : emp.color }}>
                      {getInitials(emp.name)}
                    </span>
                    {emp.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Дата</label>
              <button
                onClick={() => setShowCalendar(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-lg text-sm bg-background hover:border-primary/50 transition-colors text-left"
              >
                <span className="font-medium">{selectedDateLabel}</span>
                <span className="text-muted-foreground text-xs">{MONTH_NAMES[parseInt(date.split("-")[1]) - 1]}</span>
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Тип дня</label>
              <div className="flex gap-1 flex-wrap">
                {Object.entries(DAY_TYPE_LABELS).map(([k, v]) => (
                  <button key={k} onClick={() => setDayType(k)}
                    className={["px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      dayType === k
                        ? k === "work" ? "border-primary bg-primary text-white"
                          : k === "vacation" ? "border-amber-500 bg-amber-500 text-white"
                          : k === "sick" ? "border-red-400 bg-red-400 text-white"
                          : "border-gray-400 bg-gray-400 text-white"
                        : "border-border bg-background text-foreground hover:border-muted-foreground"
                    ].join(" ")}
                  >
                    {v.replace("Рабочий день", "Работа")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Календарь ─── */}
        {showCalendar && (
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => { const d = new Date(calYear, calMonth - 1, 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
                  className="px-2 py-1 text-sm text-muted-foreground hover:bg-muted rounded">←</button>
                <span className="text-sm font-semibold">{MONTH_NAMES[calMonth]} {calYear}</span>
                <button onClick={() => { const d = new Date(calYear, calMonth + 1, 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
                  className="px-2 py-1 text-sm text-muted-foreground hover:bg-muted rounded">→</button>
              </div>
              <button onClick={() => setShowCalendar(false)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted">Закрыть</button>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS_RU.map(d => <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calDays.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isToday = dateStr === todayStr();
                  const hasEntry = entryDates.has(dateStr);
                  const isVac = vacDates.has(dateStr);
                  const isSelected = dateStr === date;
                  return (
                    <button key={i} onClick={() => { setDate(dateStr); setShowCalendar(false); }}
                      className={["h-9 rounded-lg border text-[12px] font-semibold flex flex-col items-center justify-center relative transition-all",
                        isSelected ? "border-primary bg-primary text-white"
                          : isVac ? "border-amber-400 bg-amber-50 text-amber-700"
                          : hasEntry ? "border-primary/40 bg-primary/8 text-primary"
                          : isToday ? "border-primary border-2 text-primary"
                          : "border-border hover:border-primary/40"
                      ].join(" ")}>
                      {day}
                      {hasEntry && !isSelected && <span className="absolute bottom-0.5 w-1 h-1 rounded-full" style={{ background: isVac ? "#f59e0b" : "#2c5f8a" }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── Рабочие сегменты ─── */}
        {dayType === "work" && (
          <>
            <div className="bg-card border border-border rounded-xl shadow-sm">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Рабочие часы</span>
                  {totalRegular > 0 && (
                    <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full">{Math.round(totalRegular * 10) / 10} ч</span>
                  )}
                </div>
                <button onClick={addSegment} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-medium hover:bg-primary/20 transition-colors">
                  + Объект
                </button>
              </div>
              <div className="p-4 space-y-3">
                {regularSegs.map((seg, localIdx) => {
                  const globalIdx = segments.indexOf(seg);
                  return (
                    <SegmentRow key={globalIdx} seg={seg} index={globalIdx} objects={objects}
                      onUpdate={updateSegment}
                      onRemove={regularSegs.length > 1 ? () => removeSegment(globalIdx) : undefined}
                      isOvertime={false}
                    />
                  );
                })}
              </div>
            </div>

            {/* ─── Переработки ─── */}
            <div className="bg-card border border-orange-200 rounded-xl shadow-sm">
              <div className="px-4 py-3 border-b border-orange-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-orange-700">⏱ Переработки</span>
                  {totalOvertime > 0 && (
                    <span className="bg-orange-100 text-orange-700 text-[11px] font-bold px-2 py-0.5 rounded-full">{Math.round(totalOvertime * 10) / 10} ч</span>
                  )}
                </div>
                <button onClick={addOvertimeSegment} className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg font-medium hover:bg-orange-200 transition-colors">
                  + Переработка
                </button>
              </div>
              <div className="p-4">
                {overtimeSegs.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    <p>Нет переработок</p>
                    <button onClick={addOvertimeSegment} className="mt-2 text-orange-600 font-medium text-xs hover:underline">
                      + Добавить переработку
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {overtimeSegs.map((seg, _localIdx) => {
                      const globalIdx = segments.indexOf(seg);
                      return (
                        <SegmentRow key={globalIdx} seg={seg} index={globalIdx} objects={objects}
                          onUpdate={updateSegment}
                          onRemove={() => removeSegment(globalIdx)}
                          isOvertime={true}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {dayType !== "work" && (
          <div className="bg-card border border-border rounded-xl shadow-sm flex items-center justify-center py-8 text-muted-foreground text-sm">
            {DAY_TYPE_LABELS[dayType]} — рабочие сегменты не нужны
          </div>
        )}

        <button
          onClick={saveDay}
          disabled={saving || !employeeId}
          className="w-full bg-primary text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Сохранение..." : saved ? "✓ Сохранено" : "Сохранить день"}
        </button>
      </div>
    </Layout>
  );
}

function SegmentRow({
  seg, index, objects, onUpdate, onRemove, isOvertime,
}: {
  seg: Segment;
  index: number;
  objects: Array<{ id: number; name: string }>;
  onUpdate: (i: number, field: keyof Segment, value: string | number | boolean) => void;
  onRemove?: () => void;
  isOvertime: boolean;
}) {
  const hours = calcHours(seg.startTime, seg.endTime);
  const borderColor = isOvertime ? "border-orange-200 bg-orange-50/50" : "border-border bg-muted/30";
  const hoursBadge = isOvertime ? "bg-orange-100 text-orange-700" : "bg-primary/10 text-primary";

  return (
    <div className={`border rounded-xl p-3 ${borderColor}`}>
      <div className="flex items-start gap-2 mb-2.5">
        <div className="flex-1">
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Объект</label>
          <select
            className="w-full px-2.5 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary"
            value={seg.objectId}
            onChange={e => onUpdate(index, "objectId", Number(e.target.value))}
          >
            <option value={0}>— выбрать —</option>
            {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-1.5 pt-6">
          {hours > 0 && (
            <span className={`text-[11px] font-bold px-2 py-1.5 rounded-lg whitespace-nowrap ${hoursBadge}`}>
              {Math.round(hours * 10) / 10} ч
            </span>
          )}
          {onRemove && (
            <button onClick={onRemove} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors text-base">✕</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Начало</label>
          <input type="time" className="w-full px-2.5 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary"
            value={seg.startTime} onChange={e => onUpdate(index, "startTime", e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Конец</label>
          <input type="time" className="w-full px-2.5 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary"
            value={seg.endTime} onChange={e => onUpdate(index, "endTime", e.target.value)} />
        </div>
        {isOvertime && (
          <div className="col-span-2">
            <label className="block text-[10px] font-semibold text-orange-600 uppercase tracking-wide mb-1">Согласовано с</label>
            <input type="text" placeholder="Имя руководителя"
              className="w-full px-2.5 py-2 border border-orange-200 rounded-lg text-sm bg-background focus:outline-none focus:border-orange-400"
              value={seg.approvedBy} onChange={e => onUpdate(index, "approvedBy", e.target.value)} />
          </div>
        )}
        <div className={isOvertime ? "col-span-2" : "col-span-2"}>
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Заметка</label>
          <input type="text" placeholder="необязательно"
            className="w-full px-2.5 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary"
            value={seg.note} onChange={e => onUpdate(index, "note", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
