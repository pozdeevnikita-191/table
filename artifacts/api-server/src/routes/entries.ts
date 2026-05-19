import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, entriesTable } from "@workspace/db";
import {
  ListEntriesQueryParams,
  CreateEntryBody,
  GetEntryParams,
  UpdateEntryParams,
  UpdateEntryBody,
  DeleteEntryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const serializeEntry = (e: typeof entriesTable.$inferSelect) => ({
  ...e,
  segments: (e.segments as unknown[]) ?? [],
  createdAt: e.createdAt.toISOString(),
});

router.get("/entries", async (req, res): Promise<void> => {
  const parsed = ListEntriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { employeeId, from, to } = parsed.data;

  const conditions = [];
  if (employeeId != null) conditions.push(eq(entriesTable.employeeId, employeeId));
  if (from) conditions.push(gte(entriesTable.date, from));
  if (to) conditions.push(lte(entriesTable.date, to));

  const rows = conditions.length > 0
    ? await db.select().from(entriesTable).where(and(...conditions)).orderBy(entriesTable.date)
    : await db.select().from(entriesTable).orderBy(entriesTable.date);

  res.json(rows.map(serializeEntry));
});

router.post("/entries", async (req, res): Promise<void> => {
  const parsed = CreateEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { employeeId, date, type, segments } = parsed.data;

  const existing = await db
    .select()
    .from(entriesTable)
    .where(and(eq(entriesTable.employeeId, employeeId), eq(entriesTable.date, date)));

  if (existing.length > 0) {
    const [updated] = await db
      .update(entriesTable)
      .set({ type, segments: (segments ?? []) as unknown as typeof entriesTable.$inferSelect["segments"] })
      .where(eq(entriesTable.id, existing[0].id))
      .returning();
    res.status(201).json(serializeEntry(updated));
    return;
  }

  const [row] = await db
    .insert(entriesTable)
    .values({ employeeId, date, type, segments: (segments ?? []) as unknown as typeof entriesTable.$inferSelect["segments"] })
    .returning();
  res.status(201).json(serializeEntry(row));
});

router.get("/entries/:id", async (req, res): Promise<void> => {
  const params = GetEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(entriesTable).where(eq(entriesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  res.json(serializeEntry(row));
});

router.patch("/entries/:id", async (req, res): Promise<void> => {
  const params = UpdateEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof entriesTable.$inferSelect> = {};
  if (parsed.data.type != null) updateData.type = parsed.data.type;
  if (parsed.data.segments != null) updateData.segments = parsed.data.segments as unknown as typeof entriesTable.$inferSelect["segments"];

  const [row] = await db
    .update(entriesTable)
    .set(updateData)
    .where(eq(entriesTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  res.json(serializeEntry(row));
});

router.delete("/entries/:id", async (req, res): Promise<void> => {
  const params = DeleteEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(entriesTable)
    .where(eq(entriesTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
