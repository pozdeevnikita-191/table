import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const assignmentSchema = z.object({
  employeeIds: z.array(z.number().int()),
  objectId: z.number().int().nullable().optional(),
  objectName: z.string(),
  task: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export type Assignment = z.infer<typeof assignmentSchema>;

export const scheduleTable = pgTable("schedule", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  assignments: jsonb("assignments").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ScheduleRow = typeof scheduleTable.$inferSelect;
