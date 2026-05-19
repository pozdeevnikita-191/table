import { useState } from "react";
import { useListEmployees, useListObjects, useGetReport } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { formatDate, currentMonthStr } from "@/lib/utils";

export default function Reports() {
  const { data: employees = [] } = useListEmployees();
  const { data: objects = [] } = useListObjects();

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const [employeeId, setEmployeeId] = useState<number | "">("");
  const [objectId, setObjectId] = useState<number | "">("");
  const [from, setFrom] = useState(`${y}-${m}-01`);
  const [to, setTo] = useState(now.toISOString().slice(0, 10));
  const [generate, setGenerate] = useState(false);

  const params = generate ? {
    ...(employeeId !== "" ? { employeeId: Number(employeeId) } : {}),
    ...(objectId !== "" ? { objectId: Number(objectId) } : {}),
    from,
    to,
  } : undefined;

  const { data: report, isLoading } = useGetReport(params, { query: { enabled: generate } });

  function exportCSV() {
    if (!report) return;
    const header = "Дата,Сотрудник,Объект,Код ЛЗ,Начало,Конец,Часов,Заметка";
    const rows = report.rows.map(r =>
      [r.date, r.employeeName, r.objectName, r.objectCode, r.startTime, r.endTime, r.hours, r.note]
        .map(v => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tabele.csv";
    a.click();
  }

  return (
    <Layout title="Отчёты">
      <div className="space-y-5">
        <div className="bg-card border border-border rounded-xl shadow-sm p-5">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Сотрудник</label>
              <select value={employeeId} onChange={e => setEmployeeId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                <option value="">Все сотрудники</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">С</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">По</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Объект</label>
              <select value={objectId} onChange={e => setObjectId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                <option value="">Все объекты</option>
                {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setGenerate(true)}
                className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                Сформировать
              </button>
              <button
                onClick={exportCSV}
                disabled={!report}
                className="border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors whitespace-nowrap disabled:opacity-40"
              >
                Скачать CSV
              </button>
            </div>
          </div>
        </div>

        {!generate ? (
          <div className="bg-card border border-border rounded-xl shadow-sm flex items-center justify-center py-16 text-muted-foreground text-sm">
            Выберите параметры и нажмите «Сформировать»
          </div>
        ) : isLoading ? (
          <div className="h-40 bg-muted animate-pulse rounded-xl" />
        ) : report ? (
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="px-5 py-3.5 border-b border-border flex gap-6 text-sm">
              <span><span className="text-muted-foreground">Записей:</span> <b>{report.rows.length}</b></span>
              <span><span className="text-muted-foreground">Дней:</span> <b>{report.totalDays}</b></span>
              <span><span className="text-muted-foreground">Часов:</span> <b>{Math.round(report.totalHours)}</b></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr>
                    {["Дата", "Сотрудник", "Объект", "Начало", "Конец", "Часов", "Заметка"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/30 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-muted-foreground py-8 text-sm">Нет данных</td></tr>
                  ) : report.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-2.5 border-b border-border">{formatDate(row.date)}</td>
                      <td className="px-4 py-2.5 border-b border-border font-medium">{row.employeeName}</td>
                      <td className="px-4 py-2.5 border-b border-border">
                        {row.objectName}
                        {row.objectCode && row.objectCode !== "-" && <span className="ml-1 text-[11px] text-muted-foreground">#{row.objectCode}</span>}
                      </td>
                      <td className="px-4 py-2.5 border-b border-border text-muted-foreground">{row.startTime}</td>
                      <td className="px-4 py-2.5 border-b border-border text-muted-foreground">{row.endTime}</td>
                      <td className="px-4 py-2.5 border-b border-border">
                        {row.hours > 0 && <span className="bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full">{Math.round(row.hours)} ч</span>}
                      </td>
                      <td className="px-4 py-2.5 border-b border-border text-muted-foreground text-xs">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
