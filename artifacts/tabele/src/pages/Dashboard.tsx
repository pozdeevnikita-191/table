import { useGetDashboardStats } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { formatDate, formatMonth, calcHours, currentMonthStr, MONTH_NAMES } from "@/lib/utils";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "wouter";

export default function Dashboard() {
  const now = new Date();
  const [month, setMonth] = useState(currentMonthStr());
  const { data, isLoading } = useGetDashboardStats({ month });

  function changeMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const [y, m] = month.split("-").map(Number);
  const monthLabel = `${MONTH_NAMES[m - 1]} ${y}`;

  return (
    <Layout title="Дашборд" actions={
      <div className="flex items-center gap-1">
        <button onClick={() => changeMonth(-1)} className="px-2 py-1 rounded text-muted-foreground hover:bg-muted text-sm">←</button>
        <span className="text-sm font-medium px-2">{monthLabel}</span>
        <button onClick={() => changeMonth(1)} className="px-2 py-1 rounded text-muted-foreground hover:bg-muted text-sm">→</button>
      </div>
    }>
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
          </div>
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
        </div>
      ) : data ? (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Сотрудников" value={data.totalEmployees} sub="в команде" />
            <StatCard label="Объектов" value={data.totalObjects} sub="активных" />
            <StatCard label="Часов за месяц" value={Math.round(data.monthHours)} sub={monthLabel} />
            <StatCard label="Рабочих дней" value={data.monthDays} sub="в этом месяце" />
          </div>

          <div className="grid gap-5" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
            <div className="bg-card border border-border rounded-xl shadow-sm">
              <div className="px-5 py-3.5 border-b border-border">
                <span className="text-sm font-semibold">Активность по дням</span>
              </div>
              <div className="p-5">
                {data.activityByDay.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Нет данных за этот месяц</div>
                ) : (
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={data.activityByDay} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(8)} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(v: number) => [`${Math.round(v)} ч`, "Часов"]}
                        labelFormatter={(l) => formatDate(l as string)}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Bar dataKey="hours" fill="#2c5f8a" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm">
              <div className="px-5 py-3.5 border-b border-border">
                <span className="text-sm font-semibold">Топ объектов</span>
              </div>
              <div className="p-4 space-y-2">
                {data.topObjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Нет данных</p>
                ) : data.topObjects.map((obj, i) => {
                  const max = data.topObjects[0]?.hours ?? 1;
                  return (
                    <div key={obj.objectId} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium truncate max-w-[160px]">{obj.objectName}</span>
                        <span className="text-muted-foreground ml-2">{Math.round(obj.hours)} ч</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(obj.hours / max) * 100}%`, background: "#2c5f8a", opacity: 1 - i * 0.15 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold">Последние записи</span>
              <Link href="/fill">
                <button className="text-xs text-primary hover:underline">+ Добавить</button>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr>
                    {["Дата", "Сотрудник", "Объект", "Начало", "Конец", "Часов"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/30 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recentEntries.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-muted-foreground py-8 text-sm">Нет записей</td></tr>
                  ) : data.recentEntries.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-2.5 border-b border-border">{formatDate(row.date)}</td>
                      <td className="px-4 py-2.5 border-b border-border font-medium">{row.employeeName}</td>
                      <td className="px-4 py-2.5 border-b border-border">{row.objectName}</td>
                      <td className="px-4 py-2.5 border-b border-border text-muted-foreground">{row.startTime}</td>
                      <td className="px-4 py-2.5 border-b border-border text-muted-foreground">{row.endTime}</td>
                      <td className="px-4 py-2.5 border-b border-border">
                        {row.hours > 0 && (
                          <span className="bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full">
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
        </div>
      ) : null}
    </Layout>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}
