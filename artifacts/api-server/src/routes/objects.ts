import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, objectsTable } from "@workspace/db";
import {
  CreateObjectBody,
  UpdateObjectParams,
  UpdateObjectBody,
  DeleteObjectParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/objects", async (_req, res): Promise<void> => {
  const rows = await db.select().from(objectsTable).orderBy(objectsTable.name);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/objects", async (req, res): Promise<void> => {
  const parsed = CreateObjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(objectsTable).values(parsed.data).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/objects/:id", async (req, res): Promise<void> => {
  const params = UpdateObjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateObjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(objectsTable)
    .set(parsed.data)
    .where(eq(objectsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Object not found" });
    return;
  }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/objects/:id", async (req, res): Promise<void> => {
  const params = DeleteObjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(objectsTable)
    .where(eq(objectsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Object not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
