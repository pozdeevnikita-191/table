import { useState, useMemo } from "react";
import { useListEmployees, useListObjects, useGetReport } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { formatDate } from "@/lib/utils";

export default function Reports() {
  const { data: employees = [] } = useListEmployees();
  const { data: objects = [] } = useListObjects();

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");

  const [employeeId, setEmployeeId] = useState<number | "">("");
  const [objectId, setObjectId] = useState<number | "">("");
  const [lzSearch, setLzSearch] = useState("");
  const [from, setFrom] = useState(`${y}-${m}-01`);
  const [to, setTo] = useState(now.toISOString().slice(0, 10));
  const [generate, setGenerate] = useState(false);

  // Когда объект выбран из дропдауна — заполняем ЛЗ поле
  function handleObjectChange(val: number | "") {
    setObjectId(val);
    if (val === "") {
      setLzSearch("");
    } else {
      const obj = objects.find(o => o.id === val);
      setLzSearch(obj?.code && obj.code !== "-" ? obj.code : "");
    }
    setGenerate(false);
  }

  // Когда вводим ЛЗ — ищем объект по коду
  function handleLzSearch(val: string) {
    setLzSearch(val);
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) {
      setObjectId("");
    } else {
      const found = objects.find(o => o.code && o.code.toLowerCase() === trimmed);
      setObjectId(found ? found.id : "");
    }
    setGenerate(false);
  }

  // Объекты с кодами ЛЗ для подсказки в дропдауне
  const objectsWithCode = useMemo(() =>
    objects.map(o => ({ ...o, label: o.code && o.code !== "-" ? `${o.name} (ЛЗ ${o.code})` : o.name })),
    [objects]
  );

  const lzMatches = useMemo(() => {
    if (!lzSearch.trim()) return [];
    const q = lzSearch.trim().toLowerCase();
    return objects.filter(o => o.code && o.code !== "-" && o.code.toLowerCase().includes(q));
  }, [lzSearch, objects]);

  const params = generate ? {
    ...(employeeId !== "" ? { employeeId: Number(employeeId) } : {}),
    ...(objectId !== "" ? { objectId: Number(objectId) } : {}),
    from, to,
  } : undefined;

  const { data: report, isLoading } = useGetReport(params, { query: { enabled: generate } as any });

  function exportCSV() {
    if (!report) return;
    const header = "Дата,Сотрудник,Объект,Код ЛЗ,Начало,Конец,Рабочие часы,Переработки,Заметка";
    const rows = report.rows.map(r =>
      [r.date, r.employeeName, r.objectName, r.objectCode, r.startTime, r.endTime, r.regularHours || "", r.overtimeHours || "", r.note]
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
      <div className="space-y-4">
        {/* Filters */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Сотрудник */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Сотрудник</label>
              <select
                value={employeeId}
                onChange={e => { setEmployeeId(e.target.value === "" ? "" : Number(e.target.value)); setGenerate(false); }}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary"
              >
                <option value="">Все сотрудники</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            {/* Объект */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Объект</label>
              <select
                value={objectId}
                onChange={e => handleObjectChange(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary"
              >
                <option value="">Все объекты</option>
                {objectsWithCode.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>

            {/* Поиск по ЛЗ */}
            <div className="col-span-2 sm:col-span-1 relative">
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Номер ЛЗ</label>
              <input
                type="text"
                value={lzSearch}
                onChange={e => handleLzSearch(e.target.value)}
                placeholder="Введите номер ЛЗ..."
                className={[
                  "w-full px-3 py-2.5 border rounded-lg text-sm bg-background focus:outline-none transition-colors",
                  objectId !== "" && lzSearch ? "border-primary bg-primary/5 focus:border-primary" : "border-border focus:border-primary"
                ].join(" ")}
              />
              {/* Подсказки при вводе */}
              {lzSearch && lzMatches.length > 0 && objectId === "" && (
                <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  {lzMatches.slice(0, 6).map(o => (
                    <button
                      key={o.id}
                      onClick={() => { setObjectId(o.id); setLzSearch(o.code ?? ""); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium">{o.name}</span>
                      <span className="text-xs text-primary font-mono">ЛЗ {o.code}</span>
                    </button>
                  ))}
                </div>
              )}
              {objectId !== "" && lzSearch && (
                <p className="mt-1 text-[11px] text-primary">
                  ✓ {objects.find(o => o.id === objectId)?.name}
                </p>
              )}
              {lzSearch && objectId === "" && lzMatches.length === 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">Объект с таким ЛЗ не найден</p>
              )}
            </div>

            {/* Даты */}
            <div className="col-span-2 sm:col-span-1 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">С</label>
                <input type="date" value={from} onChange={e => { setFrom(e.target.value); setGenerate(false); }}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">По</label>
                <input type="date" value={to} onChange={e => { setTo(e.target.value); setGenerate(false); }}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setGenerate(true)}
              className="flex-1 sm:flex-none bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Сформировать
            </button>
            <button
              onClick={exportCSV}
              disabled={!report}
              className="flex-1 sm:flex-none border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
            >
              CSV
            </button>
          </div>
        </div>

        {/* Results */}
        {!generate ? (
          <div className="bg-card border border-border rounded-xl shadow-sm flex items-center justify-center py-14 text-muted-foreground text-sm">
            Выберите параметры и нажмите «Сформировать»
          </div>
        ) : isLoading ? (
          <div className="h-40 bg-muted animate-pulse rounded-xl" />
        ) : report ? (
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-border flex flex-wrap gap-4 text-sm">
              <span><span className="text-muted-foreground">Записей:</span> <b>{report.rows.length}</b></span>
              <span><span className="text-muted-foreground">Дней:</span> <b>{report.totalDays}</b></span>
              <span><span className="text-muted-foreground">Рабочие ч.:</span> <b>{Math.round(report.totalRegularHours)}</b></span>
              {report.totalOvertimeHours > 0 && (
                <span><span className="text-orange-500 font-semibold">Переработки:</span> <b className="text-orange-600">{Math.round(report.totalOvertimeHours)}</b></span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr>
                    {["Дата", "Сотрудник", "Объект", "№ ЛЗ", "Нач.", "Кон.", "Раб. ч.", "Перераб.", "Заметка"].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/30 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.length === 0 ? (
                    <tr><td colSpan={9} className="text-center text-muted-foreground py-8 text-sm">Нет данных</td></tr>
                  ) : report.rows.map((row, i) => (
                    <tr key={i} className={`hover:bg-muted/40 transition-colors ${row.overtime ? "bg-orange-50/40" : ""}`}>
                      <td className="px-3 py-2.5 border-b border-border whitespace-nowrap">{formatDate(row.date)}</td>
                      <td className="px-3 py-2.5 border-b border-border font-medium whitespace-nowrap">{row.employeeName.split(" ")[0]}</td>
                      <td className="px-3 py-2.5 border-b border-border max-w-[140px] truncate font-medium">{row.objectName}</td>
                      <td className="px-3 py-2.5 border-b border-border">
                        {row.objectCode && row.objectCode !== "-" ? (
                          <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-foreground">{row.objectCode}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 border-b border-border text-muted-foreground">{row.startTime}</td>
                      <td className="px-3 py-2.5 border-b border-border text-muted-foreground">{row.endTime}</td>
                      <td className="px-3 py-2.5 border-b border-border">
                        {row.regularHours > 0 && <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{Math.round(row.regularHours * 10) / 10}</span>}
                      </td>
                      <td className="px-3 py-2.5 border-b border-border">
                        {row.overtimeHours > 0 && <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{Math.round(row.overtimeHours * 10) / 10}</span>}
                      </td>
                      <td className="px-3 py-2.5 border-b border-border text-muted-foreground text-[11px] max-w-[100px] truncate">{row.note}</td>
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
