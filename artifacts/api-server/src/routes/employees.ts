import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, employeesTable, entriesTable } from "@workspace/db";
import {
  CreateEmployeeBody,
  UpdateEmployeeParams,
  UpdateEmployeeBody,
  DeleteEmployeeParams,
  GetEmployeeStatsParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/employees", async (_req, res): Promise<void> => {
  const rows = await db.select().from(employeesTable).orderBy(employeesTable.name);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/employees", async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(employeesTable).values(parsed.data).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/employees/:id", async (req, res): Promise<void> => {
  const params = UpdateEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(employeesTable)
    .set(parsed.data)
    .where(eq(employeesTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/employees/:id", async (req, res): Promise<void> => {
  const params = DeleteEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(employeesTable)
    .where(eq(employeesTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/employees/:id/stats", async (req, res): Promise<void> => {
  const params = GetEmployeeStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.id, params.data.id));
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const entries = await db
    .select()
    .from(entriesTable)
    .where(eq(entriesTable.employeeId, params.data.id));

  const workEntries = entries.filter(e => e.type === "work");
  const vacationDays = entries.filter(e => e.type === "vacation").length;

  const calcHours = (start: string, end: string): number => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if (isNaN(sh) || isNaN(eh)) return 0;
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff / 60 : 0;
  };

  const totalDays = new Set(workEntries.map(e => e.date)).size;

  let totalHours = 0;
  const objMap = new Map<number, { days: Set<string>; hours: number }>();
  const monthMap = new Map<string, { days: Set<string>; hours: number }>();

  for (const entry of workEntries) {
    const segments = entry.segments as Array<{ objectId: number; startTime: string; endTime: string }>;
    const month = entry.date.slice(0, 7);
    if (!monthMap.has(month)) monthMap.set(month, { days: new Set(), hours: 0 });
    monthMap.get(month)!.days.add(entry.date);

    for (const seg of segments) {
      const h = calcHours(seg.startTime, seg.endTime);
      totalHours += h;
      monthMap.get(month)!.hours += h;
      if (!objMap.has(seg.objectId)) objMap.set(seg.objectId, { days: new Set(), hours: 0 });
      objMap.get(seg.objectId)!.days.add(entry.date);
      objMap.get(seg.objectId)!.hours += h;
    }
  }

  const { objectsTable } = await import("@workspace/db");
  const allObjects = await db.select().from(objectsTable);
  const objById = new Map(allObjects.map(o => [o.id, o]));

  const byObject = Array.from(objMap.entries())
    .map(([objectId, v]) => ({
      objectId,
      objectName: objById.get(objectId)?.name ?? "—",
      days: v.days.size,
      hours: v.hours,
    }))
    .sort((a, b) => b.hours - a.hours);

  const byMonth = Array.from(monthMap.entries())
    .map(([month, v]) => ({ month, days: v.days.size, hours: v.hours }))
    .sort((a, b) => a.month.localeCompare(b.month));

  res.json({
    employee: { ...employee, createdAt: employee.createdAt.toISOString() },
    totalDays,
    totalHours,
    vacationDays,
    byObject,
    byMonth,
  });
});

export default router;
