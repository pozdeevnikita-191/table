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
import { todayStr, DAY_TYPE_LABELS, calcHours, MONTH_NAMES, formatDate, getInitials } from "@/lib/utils";

interface Segment {
  objectId: number;
  startTime: string;
  endTime: string;
  note: string;
}

const DAYS_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export default function FillDay() {
  const qc = useQueryClient();
  const { data: employees = [] } = useListEmployees();
  const { data: objects = [] } = useListObjects();

  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [date, setDate] = useState(todayStr());
  const [dayType, setDayType] = useState("work");
  const [segments, setSegments] = useState<Segment[]>([{ objectId: 0, startTime: "09:00", endTime: "18:00", note: "" }]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
        setSegments(existing.segments.map((s: { objectId: number; startTime: string; endTime: string; note?: string | null }) => ({
          objectId: s.objectId,
          startTime: s.startTime,
          endTime: s.endTime,
          note: s.note ?? "",
        })));
      } else if (existing.type === "work") {
        setSegments([{ objectId: objects[0]?.id ?? 0, startTime: "09:00", endTime: "18:00", note: "" }]);
      }
    } else {
      setDayType("work");
      setSegments([{ objectId: objects[0]?.id ?? 0, startTime: "09:00", endTime: "18:00", note: "" }]);
    }
  }, [date, employeeId]);

  function addSegment() {
    setSegments(s => [...s, { objectId: objects[0]?.id ?? 0, startTime: "09:00", endTime: "18:00", note: "" }]);
  }

  function removeSegment(i: number) {
    setSegments(s => s.filter((_, idx) => idx !== i));
  }

  function updateSegment(i: number, field: keyof Segment, value: string | number) {
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

  return (
    <Layout title="Заполнить день">
      <div className="grid gap-5" style={{ gridTemplateColumns: "320px 1fr", alignItems: "start" }}>
        <div className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Сотрудник</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={employeeId ?? ""}
              onChange={e => setEmployeeId(Number(e.target.value))}
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Дата</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={date}
              onChange={e => {
                setDate(e.target.value);
                const [y, m] = e.target.value.split("-").map(Number);
                setCalYear(y);
                setCalMonth(m - 1);
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Тип дня</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={dayType}
              onChange={e => setDayType(e.target.value)}
            >
              {Object.entries(DAY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">
              {dayType === "work" ? "Записи за день" : DAY_TYPE_LABELS[dayType]}
            </span>
            {dayType === "work" && (
              <button
                onClick={addSegment}
                className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                + Добавить объект
              </button>
            )}
          </div>
          <div className="p-5">
            {dayType !== "work" ? (
              <div className="text-sm text-muted-foreground py-4">
                {DAY_TYPE_LABELS[dayType]} — рабочие сегменты не нужны.
              </div>
            ) : (
              <div className="space-y-3">
                {segments.map((seg, i) => (
                  <div key={i} className="bg-muted/40 border border-border rounded-lg p-3 grid gap-2.5" style={{ gridTemplateColumns: "1fr 100px 100px 1fr auto" }}>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Объект</label>
                      <select
                        className="w-full px-2 py-1.5 border border-border rounded text-xs bg-background focus:outline-none focus:border-primary"
                        value={seg.objectId}
                        onChange={e => updateSegment(i, "objectId", Number(e.target.value))}
                      >
                        <option value={0}>— выбрать —</option>
                        {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Начало</label>
                      <input
                        type="time"
                        className="w-full px-2 py-1.5 border border-border rounded text-xs bg-background focus:outline-none focus:border-primary"
                        value={seg.startTime}
                        onChange={e => updateSegment(i, "startTime", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Конец</label>
                      <input
                        type="time"
                        className="w-full px-2 py-1.5 border border-border rounded text-xs bg-background focus:outline-none focus:border-primary"
                        value={seg.endTime}
                        onChange={e => updateSegment(i, "endTime", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Заметка</label>
                      <input
                        type="text"
                        placeholder="необязательно"
                        className="w-full px-2 py-1.5 border border-border rounded text-xs bg-background focus:outline-none focus:border-primary"
                        value={seg.note}
                        onChange={e => updateSegment(i, "note", e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-1.5 rounded min-w-[36px] text-center">
                        {calcHours(seg.startTime, seg.endTime) > 0 ? `${Math.round(calcHours(seg.startTime, seg.endTime))}ч` : "—"}
                      </div>
                      {segments.length > 1 && (
                        <button
                          onClick={() => removeSegment(i)}
                          className="ml-1.5 text-muted-foreground hover:text-destructive text-sm px-1"
                        >✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={saveDay}
                disabled={saving || !employeeId}
                className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Сохранение..." : saved ? "Сохранено" : "Сохранить день"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm mt-5">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">{MONTH_NAMES[calMonth]} {calYear}</span>
          <div className="flex gap-1">
            <button onClick={() => { const d = new Date(calYear, calMonth - 1, 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
              className="px-2 py-1 text-sm text-muted-foreground hover:bg-muted rounded">←</button>
            <button onClick={() => { const d = new Date(calYear, calMonth + 1, 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
              className="px-2 py-1 text-sm text-muted-foreground hover:bg-muted rounded">→</button>
          </div>
        </div>
        <div className="p-4">
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
                <button
                  key={i}
                  onClick={() => setDate(dateStr)}
                  className={[
                    "aspect-square rounded-lg border text-[11px] font-semibold flex flex-col items-center justify-start p-1 min-h-[44px] transition-all",
                    isSelected ? "border-primary bg-primary/15 text-primary" :
                    isVac ? "border-amber-400 bg-amber-50 text-amber-700" :
                    hasEntry ? "border-primary/40 bg-primary/8 text-primary" :
                    isToday ? "border-primary border-2 text-primary" :
                    "border-border hover:border-primary/40 hover:bg-muted/60"
                  ].join(" ")}
                >
                  <span>{day}</span>
                  {hasEntry && <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: isVac ? "#f59e0b" : "#2c5f8a" }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
