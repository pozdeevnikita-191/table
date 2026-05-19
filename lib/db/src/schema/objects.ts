import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const objectsTable = pgTable("work_objects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().default("-"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertObjectSchema = createInsertSchema(objectsTable).omit({ id: true, createdAt: true });
export type InsertObject = z.infer<typeof insertObjectSchema>;
export type WorkObject = typeof objectsTable.$inferSelect;
