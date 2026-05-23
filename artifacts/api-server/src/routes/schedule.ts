import { Router, type IRouter } from "express";
import { eq, gte, lte, and } from "drizzle-orm";
import { db, scheduleTable } from "@workspace/db";
import { UpsertScheduleDayBody, DeleteScheduleDayParams, GetScheduleQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

const serialize = (row: typeof scheduleTable.$inferSelect) => ({
  ...row,
  assignments: (row.assignments as unknown[]) ?? [],
  createdAt: row.createdAt.toISOString(),
});

router.get("/schedule", async (req, res): Promise<void> => {
  const parsed = GetScheduleQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { year, month } = parsed.data;
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-31`;
  const rows = await db
    .select()
    .from(scheduleTable)
    .where(and(gte(scheduleTable.date, from), lte(scheduleTable.date, to)));
  res.json(rows.map(serialize));
});

router.post("/schedule", async (req, res): Promise<void> => {
  const parsed = UpsertScheduleDayBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { date, assignments } = parsed.data;
  const [row] = await db
    .insert(scheduleTable)
    .values({ date, assignments: assignments as unknown as typeof scheduleTable.$inferSelect["assignments"] })
    .onConflictDoUpdate({
      target: scheduleTable.date,
      set: { assignments: assignments as unknown as typeof scheduleTable.$inferSelect["assignments"] },
    })
    .returning();
  res.status(201).json(serialize(row));
});

router.delete("/schedule/:date", async (req, res): Promise<void> => {
  const params = DeleteScheduleDayParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(scheduleTable).where(eq(scheduleTable.date, params.data.date));
  res.sendStatus(204);
});

export default router;
