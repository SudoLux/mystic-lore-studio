import type { PlanCalendarItem } from './canonicalPlanPresentation';

export type PlanCalendarMode = 'month' | 'week' | 'agenda';

export type CalendarDay = {
  date: Date;
  key: string;
  outsideMonth: boolean;
};

const dayMs = 86_400_000;

/** Local calendar boundaries deliberately match the designer's device. */
export function calendarDateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function calendarDateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function startOfCalendarWeek(value: Date) {
  const result = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  result.setDate(result.getDate() - result.getDay());
  return result;
}

export function calendarMonthDays(cursor: Date): CalendarDay[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfCalendarWeek(first);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart); date.setDate(gridStart.getDate() + index);
    return { date, key: calendarDateKey(date), outsideMonth: date.getMonth() !== cursor.getMonth() };
  });
}

export function calendarWeekDays(cursor: Date): CalendarDay[] {
  const first = startOfCalendarWeek(cursor);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(first); date.setDate(first.getDate() + index);
    return { date, key: calendarDateKey(date), outsideMonth: false };
  });
}

export function itemsForCalendarDate(items: PlanCalendarItem[], dateKey: string) {
  return items.filter((item) => calendarDateKey(item.startsAt) === dateKey)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt) || left.id.localeCompare(right.id));
}

export function moveCalendarCursor(cursor: Date, mode: PlanCalendarMode, direction: -1 | 1) {
  const next = new Date(cursor);
  if (mode === 'month' || mode === 'agenda') next.setMonth(next.getMonth() + direction);
  else next.setDate(next.getDate() + direction * 7);
  return next;
}

/** Moves a timestamp to a day while keeping its local clock time intact. */
export function moveTimestampToCalendarDate(value: string, dateKey: string) {
  const original = new Date(value);
  const target = calendarDateFromKey(dateKey);
  target.setHours(original.getHours(), original.getMinutes(), original.getSeconds(), original.getMilliseconds());
  return target.toISOString();
}

export function moveEventEndToCalendarDate(startsAt: string, endsAt: string | null, targetStart: string) {
  if (!endsAt) return null;
  const duration = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  return new Date(new Date(targetStart).getTime() + Math.max(0, duration)).toISOString();
}

export function calendarLabel(cursor: Date, mode: PlanCalendarMode) {
  if (mode === 'month' || mode === 'agenda') return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(cursor);
  const first = startOfCalendarWeek(cursor);
  const last = new Date(first.getTime() + 6 * dayMs);
  const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  return `${formatter.format(first)} – ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(last)}`;
}

export function calendarTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
