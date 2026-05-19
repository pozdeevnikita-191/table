import { useGetDashboardStats } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { formatDate, MONTH_NAMES } from "@/lib/utils";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
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

  return (
    <Layout title="Дашборд">
      <div className="p-3 md:p-6 space-y-3 md:space-y-4">

        {/* Month switcher — отдельный блок на мобильном */}
        <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-2.5 shadow-sm">
          <button
            onClick={() => changeMonth(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors text-lg"
          >←</button>
          <span className="text-sm font-semibold">{monthLabel}</span>
          <button
            onClick={() => changeMonth(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors text-lg"
          >→</button>
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
            {/* Stat cards — 2×2 на мобильном, 4 в ряд на десктопе */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Часов" value={Math.round(data.monthHours)} sub="за месяц" accent />
              <StatCard label="Рабочих дней" value={data.monthDays} sub="в месяце" accent />
              <StatCard label="Сотрудников" value={data.totalEmployees} sub="в команде" />
              <StatCard label="Объектов" value={data.totalObjects} sub="активных" />
            </div>

            {/* Активность */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold">Активность по дням</span>
              </div>
              <div className="p-3">
                {data.activityByDay.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                    Нет данных за этот месяц
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart
                      data={data.activityByDay}
                      margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                    >
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9 }}
                        tickFormatter={(v) => v.slice(8)}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 9 }} width={28} />
                      <Tooltip
                        formatter={(v: number) => [`${Math.round(v)} ч`, "Часов"]}
                        labelFormatter={(l) => formatDate(l as string)}
                        contentStyle={{ fontSize: 11, borderRadius: 8 }}
                      />
                      <Bar dataKey="hours" fill="#2c5f8a" radius={[3, 3, 0, 0]} maxBarSize={24} />
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
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(obj.hours / max) * 100}%`, background: "#2c5f8a", opacity: 1 - i * 0.12 }}
                        />
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

              {/* Мобильный вид — карточки */}
              <div className="md:hidden divide-y divide-border">
                {data.recentEntries.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Нет записей</p>
                ) : data.recentEntries.map((row, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{row.objectName}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDate(row.date)} · {row.employeeName.split(" ")[0]}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-muted-foreground">{row.startTime}–{row.endTime}</span>
                      {row.hours > 0 && (
                        <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full">
                          {Math.round(row.hours)} ч
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Десктопный вид — таблица */}
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
                      <tr key={i} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-2.5 border-b border-border whitespace-nowrap">{formatDate(row.date)}</td>
                        <td className="px-4 py-2.5 border-b border-border font-medium">{row.employeeName.split(" ")[0]}</td>
                        <td className="px-4 py-2.5 border-b border-border max-w-[150px] truncate">{row.objectName}</td>
                        <td className="px-4 py-2.5 border-b border-border text-muted-foreground">{row.startTime}</td>
                        <td className="px-4 py-2.5 border-b border-border text-muted-foreground">{row.endTime}</td>
                        <td className="px-4 py-2.5 border-b border-border">
                          {row.hours > 0 && (
                            <span className="bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full">{Math.round(row.hours)} ч</span>
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

function StatCard({ label, value, sub, accent }: { label: string; value: number; sub: string; accent?: boolean }) {
  return (
    <div className={`border rounded-xl p-3 md:p-4 shadow-sm ${accent ? "bg-primary text-white border-primary" : "bg-card border-border"}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${accent ? "text-white/70" : "text-muted-foreground"}`}>{label}</div>
      <div className={`text-2xl font-bold ${accent ? "text-white" : ""}`}>{value}</div>
      <div className={`text-[11px] mt-0.5 ${accent ? "text-white/70" : "text-muted-foreground"}`}>{sub}</div>
    </div>
  );
}
