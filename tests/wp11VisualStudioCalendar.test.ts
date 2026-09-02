import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addCalendarEvent, addTask, deleteCalendarEvent, updateCalendarEvent } from '../src/domains/workspace';
import { emptyCanonicalWorkspaceState } from '../src/domains/persistence/canonicalWorkspaceRepository';
import {
  calendarDateKey,
  calendarMonthDays,
  calendarWeekDays,
  itemsForCalendarDate,
  moveEventEndToCalendarDate,
  moveTimestampToCalendarDate,
} from '../src/lib/canonicalPlanCalendar';
import { selectPlanCalendarItems } from '../src/lib/canonicalPlanPresentation';

const studioId = '30000000-0000-4000-8000-000000000001';

describe('WP11P-D Visual Studio Calendar', () => {
  it('constructs intentional month and week boundaries in the device calendar', () => {
    const cursor = new Date(2026, 8, 14, 12);
    const month = calendarMonthDays(cursor);
    const week = calendarWeekDays(cursor);
    expect(month).toHaveLength(42);
    expect(calendarDateKey(month[0].date)).toBe('2026-08-30');
    expect(calendarDateKey(month.at(-1)!.date)).toBe('2026-10-10');
    expect(week.map((day) => day.key)).toEqual(['2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19']);
  });

  it('projects dated tasks and events once, and preserves clock time when moved to another date', () => {
    const state = emptyCanonicalWorkspaceState(studioId);
    const task = addTask(state, { description: '', dueAt: '2026-09-14T14:30:00.000Z', garmentId: '', priority: 'high', title: 'Task due' });
    const event = addCalendarEvent(task.state, { endsAt: '2026-09-14T16:00:00.000Z', eventType: 'fitting', garmentId: null, notes: 'Assess sleeve pitch.', startsAt: '2026-09-14T15:00:00.000Z', title: 'Fit review' });
    const items = selectPlanCalendarItems(event.state);
    expect(items).toHaveLength(2);
    expect(itemsForCalendarDate(items, calendarDateKey('2026-09-14T15:00:00.000Z'))).toHaveLength(2);

    const targetStart = moveTimestampToCalendarDate(event.record.startsAt, '2026-09-18');
    const updated = updateCalendarEvent(event.state, event.record.id, { endsAt: moveEventEndToCalendarDate(event.record.startsAt, event.record.endsAt, targetStart), startsAt: targetStart });
    expect(updated.calendarEvents[0].notes).toBe('Assess sleeve pitch.');
    expect(updated.calendarEvents[0].endsAt).toBe('2026-09-18T16:00:00.000Z');
    expect(deleteCalendarEvent(updated, event.record.id).calendarEvents).toHaveLength(0);
    expect(selectPlanCalendarItems(updated).filter((item) => item.source === 'task')).toHaveLength(1);
  });

  it('keeps the new optional notes field inside the canonical event transport and calendar workbench', () => {
    const migration = readFileSync(new URL('../supabase/migrations/20260902011308_add_calendar_event_notes.sql', import.meta.url), 'utf8');
    const page = readFileSync(new URL('../src/pages/Plan/PlanPage.tsx', import.meta.url), 'utf8');
    expect(migration).toContain("add column if not exists notes text not null default ''");
    expect(migration).toContain("'calendar_events' then array['garment_id','event_type','title','notes'");
    expect(migration).toContain("when 'material_variant_media' then array['variant_id','asset_id','role','sort_order','framing_json']");
    for (const contract of ['Month', 'Week', 'Agenda', 'CalendarDayPanel', 'CalendarEventDetailDrawer', 'CalendarItemChip']) expect(page).toContain(contract);
  });
});
