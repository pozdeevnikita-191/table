import { Router, type IRouter } from "express";
import { and, gte, lte, eq } from "drizzle-orm";
import { db, employeesTable, objectsTable, entriesTable } from "@workspace/db";
import { GetDashboardStatsQueryParams, GetReportQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

type Segment = { objectId: number; startTime: string; endTime: string; note?: string | null; overtime?: boolean; approvedBy?: string | null };

const calcHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (isNaN(sh) || isNaN(eh)) return 0;
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff / 60 : 0;
};

router.get("/stats/dashboard", async (req, res): Promise<void> => {
  const parsed = GetDashboardStatsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const now = new Date();
  const month = parsed.data.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;

  const [employees, objects, monthEntries, allEntries] = await Promise.all([
    db.select().from(employeesTable),
    db.select().from(objectsTable),
    db.select().from(entriesTable).where(and(gte(entriesTable.date, monthStart), lte(entriesTable.date, monthEnd))),
    db.select().from(entriesTable).orderBy(entriesTable.date),
  ]);

  const empById = new Map(employees.map(e => [e.id, e]));
  const objById = new Map(objects.map(o => [o.id, o]));

  let monthHours = 0;
  let monthOvertimeHours = 0;
  const monthWorkDays = new Set<string>();
  const dayHours = new Map<string, number>();
  const dayOvertimeHours = new Map<string, number>();
  const objectHours = new Map<number, number>();

  for (const entry of monthEntries) {
    if (entry.type !== "work") continue;
    monthWorkDays.add(entry.date);
    const segs = (entry.segments as unknown as Segment[]) ?? [];
    for (const seg of segs) {
      const h = calcHours(seg.startTime, seg.endTime);
      if (seg.overtime) {
        monthOvertimeHours += h;
        dayOvertimeHours.set(entry.date, (dayOvertimeHours.get(entry.date) ?? 0) + h);
      } else {
        monthHours += h;
        dayHours.set(entry.date, (dayHours.get(entry.date) ?? 0) + h);
      }
      objectHours.set(seg.objectId, (objectHours.get(seg.objectId) ?? 0) + h);
    }
  }

  const allDates = new Set([...dayHours.keys(), ...dayOvertimeHours.keys()]);
  const activityByDay = Array.from(allDates)
    .map(date => ({ date, hours: dayHours.get(date) ?? 0, overtimeHours: dayOvertimeHours.get(date) ?? 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const topObjects = Array.from(objectHours.entries())
    .map(([objectId, hours]) => ({
      objectId,
      objectName: objById.get(objectId)?.name ?? "—",
      hours,
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  const recentEntries: Array<{
    date: string; employeeName: string; objectName: string; startTime: string; endTime: string; hours: number; overtime: boolean; approvedBy: string | null;
  }> = [];

  const sortedEntries = [...allEntries]
    .filter(e => e.type === "work")
    .sort((a, b) => b.date.localeCompare(a.date));

  for (const entry of sortedEntries) {
    if (recentEntries.length >= 10) break;
    const emp = empById.get(entry.employeeId);
    const segs = (entry.segments as unknown as Segment[]) ?? [];
    for (const seg of segs) {
      if (recentEntries.length >= 10) break;
      const obj = objById.get(seg.objectId);
      recentEntries.push({
        date: entry.date,
        employeeName: emp?.name ?? "—",
        objectName: obj?.name ?? "—",
        startTime: seg.startTime,
        endTime: seg.endTime,
        hours: calcHours(seg.startTime, seg.endTime),
        overtime: seg.overtime ?? false,
        approvedBy: seg.approvedBy ?? null,
      });
    }
  }

  res.json({
    totalEmployees: employees.length,
    totalObjects: objects.length,
    monthHours,
    monthOvertimeHours,
    monthDays: monthWorkDays.size,
    recentEntries,
    topObjects,
    activityByDay,
  });
});

const MONTH_NAMES_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

router.get("/stats/unfilled-days", async (req, res): Promise<void> => {
  const months = Math.min(Math.max(parseInt(req.query["months"] as string) || 3, 1), 12);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const startDate = new Date(today.getFullYear(), today.getMonth() - months + 1, 1);

  const fromStr = startDate.toISOString().slice(0, 10);
  const toStr = yesterday.toISOString().slice(0, 10);

  const [employees, entries] = await Promise.all([
    db.select({ id: employeesTable.id, name: employeesTable.name }).from(employeesTable),
    db.select({ employeeId: entriesTable.employeeId, date: entriesTable.date })
      .from(entriesTable)
      .where(and(gte(entriesTable.date, fromStr), lte(entriesTable.date, toStr))),
  ]);

  if (employees.length === 0) { res.json({ months: [] }); return; }

  const filled = new Set(entries.map(e => `${e.employeeId}_${e.date}`));

  const monthMap = new Map<string, Array<{ date: string; missingCount: number; totalEmployees: number; missingEmployees: Array<{ id: number; name: string }> }>>();

  const cur = new Date(startDate);
  while (cur <= yesterday) {
    const dow = cur.getDay(); // 0=Sun
    if (dow !== 0) { // Mon-Sat
      const dateStr = cur.toISOString().slice(0, 10);
      const month = dateStr.slice(0, 7);
      const missing = employees.filter(emp => !filled.has(`${emp.id}_${dateStr}`));
      if (missing.length > 0) {
        if (!monthMap.has(month)) monthMap.set(month, []);
        monthMap.get(month)!.push({
          date: dateStr,
          missingCount: missing.length,
          totalEmployees: employees.length,
          missingEmployees: missing.map(e => ({ id: e.id, name: e.name })),
        });
      }
    }
    cur.setDate(cur.getDate() + 1);
  }

  const result = Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, days]) => {
      const [y, m] = month.split("-").map(Number);
      return {
        month,
        label: `${MONTH_NAMES_RU[m - 1]} ${y}`,
        days: days.sort((a, b) => b.date.localeCompare(a.date)),
      };
    });

  res.json({ months: result });
});

router.get("/stats/report", async (req, res): Promise<void> => {
  const parsed = GetReportQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { employeeId, objectId, from, to } = parsed.data;

  const conditions = [];
  if (employeeId != null) conditions.push(eq(entriesTable.employeeId, employeeId));
  if (from) conditions.push(gte(entriesTable.date, from));
  if (to) conditions.push(lte(entriesTable.date, to));

  const entries = conditions.length > 0
    ? await db.select().from(entriesTable).where(and(...conditions)).orderBy(entriesTable.date)
    : await db.select().from(entriesTable).orderBy(entriesTable.date);

  const [employees, objects] = await Promise.all([
    db.select().from(employeesTable),
    db.select().from(objectsTable),
  ]);

  const empById = new Map(employees.map(e => [e.id, e]));
  const objById = new Map(objects.map(o => [o.id, o]));

  const VACTYPE_LABELS: Record<string, string> = {
    work: "Рабочий день",
    vacation: "Отпуск",
    sick: "Больничный",
    off: "Выходной",
  };

  const rows: Array<{
    date: string; employeeName: string; objectName: string; objectCode: string;
    startTime: string; endTime: string; hours: number; regularHours: number; overtimeHours: number; overtime: boolean; note: string;
  }> = [];

  let totalHours = 0;
  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  const uniqueDays = new Set<string>();

  for (const entry of entries) {
    const emp = empById.get(entry.employeeId);
    if (entry.type !== "work") {
      // Если фильтруем по объекту — отпуска/больничные не показываем
      if (objectId != null) continue;
      rows.push({
        date: entry.date,
        employeeName: emp?.name ?? "—",
        objectName: VACTYPE_LABELS[entry.type] ?? entry.type,
        objectCode: "",
        startTime: "—",
        endTime: "—",
        hours: 0,
        regularHours: 0,
        overtimeHours: 0,
        overtime: false,
        note: "",
      });
      uniqueDays.add(`${entry.date}|${entry.employeeId}`);
      continue;
    }

    const segs = (entry.segments as unknown as Segment[]) ?? [];
    for (const seg of segs) {
      if (objectId != null && seg.objectId !== objectId) continue;
      const obj = objById.get(seg.objectId);
      const h = calcHours(seg.startTime, seg.endTime);
      const isOvertime = seg.overtime ?? false;
      totalHours += h;
      if (isOvertime) totalOvertimeHours += h;
      else totalRegularHours += h;
      uniqueDays.add(`${entry.date}|${entry.employeeId}`);
      rows.push({
        date: entry.date,
        employeeName: emp?.name ?? "—",
        objectName: obj?.name ?? "—",
        objectCode: obj?.code ?? "",
        startTime: seg.startTime,
        endTime: seg.endTime,
        hours: h,
        regularHours: isOvertime ? 0 : h,
        overtimeHours: isOvertime ? h : 0,
        overtime: isOvertime,
        note: seg.note ?? "",
      });
    }
  }

  res.json({ rows, totalHours, totalRegularHours, totalOvertimeHours, totalDays: uniqueDays.size });
});

export default router;
