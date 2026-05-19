import { Router, type IRouter } from "express";
import { and, gte, lte, eq } from "drizzle-orm";
import { db, employeesTable, objectsTable, entriesTable } from "@workspace/db";
import { GetDashboardStatsQueryParams, GetReportQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

type Segment = { objectId: number; startTime: string; endTime: string; note?: string | null };

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
  const monthWorkDays = new Set<string>();
  const dayHours = new Map<string, number>();
  const objectHours = new Map<number, number>();

  for (const entry of monthEntries) {
    if (entry.type !== "work") continue;
    monthWorkDays.add(entry.date);
    const segs = (entry.segments as unknown as Segment[]) ?? [];
    for (const seg of segs) {
      const h = calcHours(seg.startTime, seg.endTime);
      monthHours += h;
      dayHours.set(entry.date, (dayHours.get(entry.date) ?? 0) + h);
      objectHours.set(seg.objectId, (objectHours.get(seg.objectId) ?? 0) + h);
    }
  }

  const activityByDay = Array.from(dayHours.entries())
    .map(([date, hours]) => ({ date, hours }))
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
    date: string; employeeName: string; objectName: string; startTime: string; endTime: string; hours: number;
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
      });
    }
  }

  res.json({
    totalEmployees: employees.length,
    totalObjects: objects.length,
    monthHours,
    monthDays: monthWorkDays.size,
    recentEntries,
    topObjects,
    activityByDay,
  });
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
    startTime: string; endTime: string; hours: number; note: string;
  }> = [];

  let totalHours = 0;
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
      totalHours += h;
      uniqueDays.add(`${entry.date}|${entry.employeeId}`);
      rows.push({
        date: entry.date,
        employeeName: emp?.name ?? "—",
        objectName: obj?.name ?? "—",
        objectCode: obj?.code ?? "",
        startTime: seg.startTime,
        endTime: seg.endTime,
        hours: h,
        note: seg.note ?? "",
      });
    }
  }

  res.json({ rows, totalHours, totalDays: uniqueDays.size });
});

export default router;
