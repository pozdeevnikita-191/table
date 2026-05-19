import { useParams, Link } from "wouter";
import { useGetEmployeeStats, useListEntries, useDeleteEntry, getListEntriesQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { getInitials, formatDate, formatMonth, DAY_TYPE_LABELS, calcHours } from "@/lib/utils";

export default function EmployeeStats() {
  const { id } = useParams<{ id: string }>();
  const empId = Number(id);
  const qc = useQueryClient();

  const { data, isLoading } = useGetEmployeeStats(empId, { query: { enabled: !!empId } });
  const { data: entries = [] } = useListEntries({ employeeId: empId }, { query: { enabled: !!empId } });
  const deleteEntry = useDeleteEntry();

  async function handleDelete(entryId: number) {
    if (!confirm("Удалить запись?")) return;
    await deleteEntry.mutateAsync({ id: entryId });
    await qc.invalidateQueries({ queryKey: getListEntriesQueryKey() });
    await qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
  }

  if (isLoading || !data) {
    return (
      <Layout title="Загрузка...">
        <div className="space-y-3">
          <div className="h-20 bg-muted animate-pulse rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  const { employee, totalDays, totalHours, vacationDays, byObject, byMonth } = data;
  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Layout
      title={employee.name.split(" ")[0]}
      actions={
        <Link href="/employees">
          <button className="text-xs text-muted-foreground border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
            ← Назад
          </button>
        </Link>
      }
    >
      <div className="space-y-4">
        {/* Employee header */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
            style={{ background: employee.color + "22", color: employee.color }}>
            {getInitials(employee.name)}
          </div>
          <div>
            <h2 className="text-base font-bold">{employee.name}</h2>
            <p className="text-sm text-muted-foreground">{employee.position || "Сотрудник"}</p>
          </div>
        </div>

        {/* Stat cards 2x2 on mobile */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Рабочих дней", value: totalDays },
            { label: "Всего часов", value: Math.round(totalHours) },
            { label: "Объектов", value: byObject.length },
            { label: "Дней отпуска", value: vacationDays },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 shadow-sm">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{s.label}</div>
              <div className="text-xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>

        {/* By month + by object — stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-border"><span className="text-sm font-semibold">По месяцам</span></div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0">
                  <tr>
                    {["Месяц", "Дней", "Часов"].map(h => <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border bg-card">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {byMonth.length === 0 ? (
                    <tr><td colSpan={3} className="text-center text-muted-foreground py-6 text-sm">Нет данных</td></tr>
                  ) : byMonth.map((row) => (
                    <tr key={row.month} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-2.5 border-b border-border font-medium">{formatMonth(row.month)}</td>
                      <td className="px-4 py-2.5 border-b border-border text-muted-foreground">{row.days}</td>
                      <td className="px-4 py-2.5 border-b border-border"><span className="bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full">{Math.round(row.hours)} ч</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-border"><span className="text-sm font-semibold">По объектам</span></div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0">
                  <tr>
                    {["Объект", "Дней", "Часов"].map(h => <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border bg-card">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {byObject.length === 0 ? (
                    <tr><td colSpan={3} className="text-center text-muted-foreground py-6 text-sm">Нет данных</td></tr>
                  ) : byObject.map((row) => (
                    <tr key={row.objectId} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-2.5 border-b border-border font-medium max-w-[120px] truncate">{row.objectName}</td>
                      <td className="px-4 py-2.5 border-b border-border text-muted-foreground">{row.days}</td>
                      <td className="px-4 py-2.5 border-b border-border"><span className="bg-green-50 text-green-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">{Math.round(row.hours)} ч</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* All entries */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-border"><span className="text-sm font-semibold">Все записи</span></div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr>
                  {["Дата", "Объект", "Нач.", "Кон.", "ч", ""].map((h, i) => (
                    <th key={i} className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedEntries.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-muted-foreground py-8 text-sm">Нет записей</td></tr>
                ) : sortedEntries.flatMap((entry) => {
                  if (entry.type !== "work") {
                    return [(
                      <tr key={entry.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-3 py-2.5 border-b border-border whitespace-nowrap">{formatDate(entry.date)}</td>
                        <td colSpan={3} className="px-3 py-2.5 border-b border-border">
                          <span className="bg-amber-50 text-amber-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">{DAY_TYPE_LABELS[entry.type]}</span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-border" />
                        <td className="px-3 py-2.5 border-b border-border">
                          <button onClick={() => handleDelete(entry.id)} className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors text-xs">✕</button>
                        </td>
                      </tr>
                    )];
                  }
                  return (entry.segments as Array<{ objectId: number; startTime: string; endTime: string; note?: string | null }>).map((seg, si) => (
                    <tr key={`${entry.id}-${si}`} className="hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-2.5 border-b border-border whitespace-nowrap">{si === 0 ? formatDate(entry.date) : ""}</td>
                      <td className="px-3 py-2.5 border-b border-border font-medium max-w-[100px] truncate">{`Объект #${seg.objectId}`}</td>
                      <td className="px-3 py-2.5 border-b border-border text-muted-foreground">{seg.startTime}</td>
                      <td className="px-3 py-2.5 border-b border-border text-muted-foreground">{seg.endTime}</td>
                      <td className="px-3 py-2.5 border-b border-border">
                        {calcHours(seg.startTime, seg.endTime) > 0 && (
                          <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{Math.round(calcHours(seg.startTime, seg.endTime))}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 border-b border-border">
                        {si === 0 && (
                          <button onClick={() => handleDelete(entry.id)} className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors text-xs">✕</button>
                        )}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
