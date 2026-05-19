import { useGetDashboardStats } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { formatDate, MONTH_NAMES } from "@/lib/utils";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Link } from "wouter";

export default function Dashboard() {
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const { data, isLoading } = useGetDashboardStats({ month });

  function changeMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const [y, m] = month.split("-").map(Number);
  const monthLabel = `${MONTH_NAMES[m - 1]} ${y}`;

  const hasOvertime = data && data.monthOvertimeHours > 0;

  return (
    <Layout title="Дашборд">
      <div className="p-3 md:p-6 space-y-3 md:space-y-4">

        {/* Переключатель месяца */}
        <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-2.5 shadow-sm">
          <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors text-lg">←</button>
          <span className="text-sm font-semibold">{monthLabel}</span>
          <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors text-lg">→</button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
            </div>
            <div className="h-40 bg-muted animate-pulse rounded-xl" />
            <div className="h-40 bg-muted animate-pulse rounded-xl" />
          </div>
        ) : data ? (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Часы — обычные синие */}
              <div className="bg-primary border border-primary rounded-xl p-3 md:p-4 shadow-sm">
                <div className="text-[10px] font-semibold text-white/70 uppercase tracking-wide mb-1">Часов</div>
                <div className="text-2xl font-bold text-white">{Math.round(data.monthHours)}</div>
                <div className="text-[11px] text-white/70 mt-0.5">за месяц</div>
              </div>
              {/* Переработки — оранжевые, показываем всегда */}
              <div className="bg-orange-500 border border-orange-500 rounded-xl p-3 md:p-4 shadow-sm">
                <div className="text-[10px] font-semibold text-white/80 uppercase tracking-wide mb-1">Переработки</div>
                <div className="text-2xl font-bold text-white">{Math.round(data.monthOvertimeHours)}</div>
                <div className="text-[11px] text-white/80 mt-0.5">ч за месяц</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 md:p-4 shadow-sm">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Рабочих дней</div>
                <div className="text-2xl font-bold">{data.monthDays}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">в месяце</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 md:p-4 shadow-sm">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Объектов</div>
                <div className="text-2xl font-bold">{data.totalObjects}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">активных</div>
              </div>
            </div>

            {/* Активность — стековый график с переработками */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold">Активность по дням</span>
                {hasOvertime && (
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#2c5f8a" }} />Осн.</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#f97316" }} />Перераб.</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                {data.activityByDay.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">Нет данных за этот месяц</div>
                ) : (
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={data.activityByDay} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(8)} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9 }} width={28} />
                      <Tooltip
                        formatter={(v: number, name: string) => [`${Math.round(v * 10) / 10} ч`, name === "hours" ? "Основные" : "Переработка"]}
                        labelFormatter={(l) => formatDate(l as string)}
                        contentStyle={{ fontSize: 11, borderRadius: 8 }}
                      />
                      <Bar dataKey="hours" stackId="a" fill="#2c5f8a" radius={[0, 0, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="overtimeHours" stackId="a" fill="#f97316" radius={[3, 3, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Топ объектов */}
            <div className="bg-card border border-border rounded-xl shadow-sm">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold">Топ объектов</span>
              </div>
              <div className="p-4 space-y-2.5">
                {data.topObjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Нет данных</p>
                ) : data.topObjects.map((obj, i) => {
                  const max = data.topObjects[0]?.hours ?? 1;
                  return (
                    <div key={obj.objectId} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium truncate">{obj.objectName}</span>
                        <span className="text-muted-foreground ml-2 flex-shrink-0">{Math.round(obj.hours)} ч</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(obj.hours / max) * 100}%`, background: "#2c5f8a", opacity: 1 - i * 0.12 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Последние записи */}
            <div className="bg-card border border-border rounded-xl shadow-sm">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold">Последние записи</span>
                <Link href="/fill">
                  <button className="text-xs text-primary font-medium hover:underline">+ Добавить</button>
                </Link>
              </div>

              {/* Мобильный вид */}
              <div className="md:hidden divide-y divide-border">
                {data.recentEntries.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Нет записей</p>
                ) : data.recentEntries.map((row, i) => (
                  <div key={i} className={`px-4 py-3 flex items-center justify-between gap-3 ${row.overtime ? "bg-orange-50/60" : ""}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {row.overtime && <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">ОТ</span>}
                        <span className="text-xs font-semibold truncate">{row.objectName}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDate(row.date)} · {row.employeeName.split(" ")[0]}
                        {row.overtime && row.approvedBy && <span className="text-orange-600"> · согл. {row.approvedBy}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-muted-foreground">{row.startTime}–{row.endTime}</span>
                      {row.hours > 0 && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${row.overtime ? "bg-orange-100 text-orange-700" : "bg-primary/10 text-primary"}`}>
                          {Math.round(row.hours)} ч
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Десктопный вид */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr>
                      {["Дата", "Сотрудник", "Объект", "Начало", "Конец", "Часов"].map(h => (
                        <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/30 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentEntries.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-muted-foreground py-8 text-sm">Нет записей</td></tr>
                    ) : data.recentEntries.map((row, i) => (
                      <tr key={i} className={`transition-colors ${row.overtime ? "bg-orange-50/50 hover:bg-orange-50" : "hover:bg-muted/40"}`}>
                        <td className="px-4 py-2.5 border-b border-border whitespace-nowrap">{formatDate(row.date)}</td>
                        <td className="px-4 py-2.5 border-b border-border font-medium">{row.employeeName.split(" ")[0]}</td>
                        <td className="px-4 py-2.5 border-b border-border max-w-[150px]">
                          <div className="flex items-center gap-1.5 truncate">
                            {row.overtime && <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded flex-shrink-0">ОТ</span>}
                            <span className="truncate">{row.objectName}</span>
                          </div>
                          {row.overtime && row.approvedBy && (
                            <div className="text-[11px] text-orange-600 mt-0.5">согл. {row.approvedBy}</div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 border-b border-border text-muted-foreground">{row.startTime}</td>
                        <td className="px-4 py-2.5 border-b border-border text-muted-foreground">{row.endTime}</td>
                        <td className="px-4 py-2.5 border-b border-border">
                          {row.hours > 0 && (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${row.overtime ? "bg-orange-100 text-orange-700" : "bg-primary/10 text-primary"}`}>
                              {Math.round(row.hours)} ч
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
