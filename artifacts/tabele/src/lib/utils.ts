import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calcHours(start: string, end: string): number {
  if (!start || !end || start === "—" || end === "—") return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (isNaN(sh) || isNaN(eh)) return 0;
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff / 60 : 0;
}

export function formatDate(dt: string): string {
  if (!dt) return "—";
  const [y, m, d] = dt.split("-");
  return `${d}.${m}.${y}`;
}

export const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export const MONTH_NAMES_SHORT = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
];

export function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

export const DAY_TYPE_LABELS: Record<string, string> = {
  work: "Рабочий день",
  vacation: "Отпуск",
  sick: "Больничный",
  off: "Выходной",
};

export const EMPLOYEE_COLORS = [
  "#2c5f8a", "#2a7a4e", "#8a3a2a", "#5a3e8a", "#7a5a0a", "#2a5a7a", "#6a2a5a",
];

export function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
