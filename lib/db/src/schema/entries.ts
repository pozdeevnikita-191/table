import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const segmentSchema = z.object({
  objectId: z.number().int(),
  startTime: z.string(),
  endTime: z.string(),
  note: z.string().nullable().optional(),
});

export type Segment = z.infer<typeof segmentSchema>;

export const entriesTable = pgTable("entries", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  date: text("date").notNull(),
  type: text("type").notNull().default("work"),
  segments: jsonb("segments").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEntrySchema = createInsertSchema(entriesTable).omit({ id: true, createdAt: true });
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type Entry = typeof entriesTable.$inferSelect;
