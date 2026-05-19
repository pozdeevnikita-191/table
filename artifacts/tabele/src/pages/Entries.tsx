import { useState } from "react";
import { useLocation } from "wouter";
import { useListEntries, useListEmployees, useListObjects, useDeleteEntry, getListEntriesQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { formatDate, calcHours, MONTH_NAMES, DAY_TYPE_LABELS, getInitials, currentMonthStr } from "@/lib/utils";

const DAY_TYPE_COLORS: Record<string, string> = {
  work: "bg-primary/10 text-primary",
  vacation: "bg-amber-100 text-amber-700",
  sick: "bg-red-100 text-red-600",
  off: "bg-gray-100 text-gray-500",
};

export default function Entries() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: employees = [] } = useListEmployees();
  const { data: objects = [] } = useListObjects();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | "all">("all");
  const [month, setMonth] = useState(currentMonthStr());
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; date: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const deleteEntry = useDeleteEntry();

  const [y, m] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;

  const { data: entries = [], isLoading } = useListEntries({
    from: monthStart,
    to: monthEnd,
    ...(selectedEmployeeId !== "all" ? { employeeId: selectedEmployeeId } : {}),
  });

  const objById = new Map(objects.map(o => [o.id, o]));
  const empById = new Map(employees.map(e => [e.id, e]));

  function changeMonth(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteEntry.mutateAsync({ id: confirmDelete.id });
      await qc.invalidateQueries({ queryKey: getListEntriesQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  function goEdit(employeeId: number, date: string) {
    navigate(`/fill?employeeId=${employeeId}&date=${date}`);
  }

  const totalHours = sorted.reduce((sum, e) => {
    if (e.type !== "work") return sum;
    return sum + (e.segments as any[]).reduce((s: number, seg: any) => s + calcHours(seg.startTime, seg.endTime), 0);
  }, 0);

  return (
    <Layout title="Записи">
      {/* Диалог удаления */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold mb-1">Удалить запись?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Запись за <strong>{formatDate(confirmDelete.date)}</strong> будет удалена без возможности восстановления.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                Отмена
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-destructive text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50">
                {deleting ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 md:p-6 space-y-3">
        {/* Фильтры */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-3">
          {/* Месяц */}
          <div className="flex items-center justify-between">
            <button onClick={() => changeMonth(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors text-lg">←</button>
            <span className="text-sm font-semibold">{MONTH_NAMES[m - 1]} {y}</span>
            <button onClick={() => changeMonth(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors text-lg">→</button>
          </div>

          {/* Сотрудник */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedEmployeeId("all")}
              className={["px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                selectedEmployeeId === "all" ? "border-primary bg-primary text-white" : "border-border hover:border-primary/50"
              ].join(" ")}
            >
              Все
            </button>
            {employees.map(emp => (
              <button key={emp.id}
                onClick={() => setSelectedEmployeeId(emp.id)}
                className={["flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  selectedEmployeeId === emp.id ? "border-primary bg-primary text-white" : "border-border hover:border-primary/50"
                ].join(" ")}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: selectedEmployeeId === emp.id ? "rgba(255,255,255,0.25)" : emp.color + "22", color: selectedEmployeeId === emp.id ? "white" : emp.color }}>
                  {getInitials(emp.name)}
                </span>
                {emp.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Итоги */}
        {!isLoading && sorted.length > 0 && (
          <div className="flex gap-3 text-sm text-muted-foreground px-1">
            <span><strong className="text-foreground">{sorted.length}</strong> записей</span>
            <span>·</span>
            <span><strong className="text-primary">{Math.round(totalHours)}</strong> ч</span>
          </div>
        )}

        {/* Список */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-card border border-border rounded-xl py-16 text-center text-muted-foreground">
            <div className="text-3xl mb-3">📋</div>
            <p className="font-medium">Нет записей за этот период</p>
            <button onClick={() => navigate("/fill")}
              className="mt-3 text-sm text-primary font-medium hover:underline">
              + Добавить запись
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map(entry => {
              const emp = empById.get(entry.employeeId);
              const segs = (entry.segments as any[]) ?? [];
              const regularSegs = segs.filter((s: any) => !s.overtime);
              const overtimeSegs = segs.filter((s: any) => s.overtime);
              const totalH = segs.reduce((s: number, seg: any) => s + calcHours(seg.startTime, seg.endTime), 0);
              const overtimeH = overtimeSegs.reduce((s: number, seg: any) => s + calcHours(seg.startTime, seg.endTime), 0);

              return (
                <div key={entry.id}
                  className="bg-card border border-border rounded-xl shadow-sm hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  {/* Шапка строки */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => goEdit(entry.employeeId, entry.date)}
                  >
                    {/* Аватар */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                      style={{ background: (emp?.color ?? "#888") + "22", color: emp?.color ?? "#888" }}>
                      {getInitials(emp?.name ?? "?")}
                    </div>

                    {/* Основная инфо */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{formatDate(entry.date)}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DAY_TYPE_COLORS[entry.type] ?? "bg-muted text-muted-foreground"}`}>
                          {DAY_TYPE_LABELS[entry.type] ?? entry.type}
                        </span>
                        {overtimeH > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            +{Math.round(overtimeH * 10) / 10} ч ОТ
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{emp?.name ?? "—"}</span>
                        {entry.type === "work" && regularSegs.length > 0 && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-[200px] md:max-w-none">
                              {regularSegs.slice(0, 2).map((s: any) => objById.get(s.objectId)?.name ?? "?").join(", ")}
                              {regularSegs.length > 2 && ` +${regularSegs.length - 2}`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Часы + кнопки */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {entry.type === "work" && totalH > 0 && (
                        <span className="text-sm font-bold text-primary">{Math.round(totalH * 10) / 10} ч</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); goEdit(entry.employeeId, entry.date); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-primary/10 text-primary"
                        title="Редактировать"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: entry.id, date: entry.date }); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                        title="Удалить"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  {/* Раскрытые сегменты */}
                  {entry.type === "work" && segs.length > 0 && (
                    <div className="border-t border-border px-4 py-2 flex flex-wrap gap-x-4 gap-y-1">
                      {segs.map((seg: any, i: number) => {
                        const obj = objById.get(seg.objectId);
                        const h = calcHours(seg.startTime, seg.endTime);
                        return (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground py-0.5">
                            {seg.overtime && <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1 py-0.5 rounded">ОТ</span>}
                            <span className="font-medium text-foreground">{obj?.name ?? "?"}</span>
                            <span>{seg.startTime}–{seg.endTime}</span>
                            {h > 0 && <span className={`font-semibold ${seg.overtime ? "text-orange-600" : "text-primary"}`}>{Math.round(h * 10) / 10} ч</span>}
                            {seg.overtime && seg.approvedBy && <span className="text-orange-500">· {seg.approvedBy}</span>}
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

        {/* Кнопка добавить */}
        <button
          onClick={() => navigate("/fill")}
          className="w-full border-2 border-dashed border-border rounded-xl py-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors font-medium"
        >
          + Добавить запись
        </button>
      </div>
    </Layout>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  );
}
