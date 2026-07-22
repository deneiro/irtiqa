import { describe, expect, it } from 'vitest';
import { buildCalendarItems } from '../lib/calendar';
import type { Contact, JournalEntry, Quest, QuickTask, SocialEvent } from '../game/types';

function mkContact(patch: Partial<Contact> = {}): Contact {
  return {
    id: 'c1', name: 'Alice', archetypes: [], primaryGroup: 'friend', channels: {}, notes: '', createdAt: '2026-01-01T00:00:00.000Z',
    ...patch,
  };
}

function mkEvent(patch: Partial<SocialEvent> = {}): SocialEvent {
  return { id: 'e1', title: 'Coffee', date: '2026-07-10', createdAt: '2026-07-01T00:00:00.000Z', ...patch };
}

function mkTask(patch: Partial<QuickTask> = {}): QuickTask {
  return { id: 't1', title: 'Buy milk', attr: 'development', createdAt: '2026-07-01T00:00:00.000Z', ...patch };
}

function mkJournal(patch: Partial<JournalEntry> = {}): JournalEntry {
  return { id: 'j1', date: '2026-07-10', createdAt: '2026-07-10T00:00:00.000Z', mood: 3, stress: 3, answers: [], ...patch };
}

function mkQuest(patch: Partial<Quest> = {}): Quest {
  return {
    id: 'q1', title: 'Ship it', targetDuration: '1w', attrs: ['career'], sessions: [], priority: false,
    createdAt: '2026-07-03T00:00:00.000Z', ...patch,
  };
}

const empty = { events: [] as SocialEvent[], contacts: [] as Contact[], quickTasks: [] as QuickTask[], journal: [] as JournalEntry[], quests: [] as Quest[] };

describe('buildCalendarItems', () => {
  it('includes events within range and excludes events outside it', () => {
    const inRange = mkEvent({ id: 'e-in', date: '2026-07-10' });
    const outOfRange = mkEvent({ id: 'e-out', date: '2026-08-01' });
    const items = buildCalendarItems({ ...empty, events: [inRange, outOfRange] }, '2026-07-01', '2026-07-31');
    expect(items.map(i => i.id)).toEqual(['event-e-in']);
    expect(items[0].type).toBe('event');
    expect(items[0].link).toBe('/social');
  });

  it('places a birthday on this year inside the range and skips it outside the range', () => {
    const alice = mkContact({ id: 'c-bday', name: 'Alice', birthday: '1990-07-15' });
    const inRange = buildCalendarItems({ ...empty, contacts: [alice] }, '2026-07-01', '2026-07-31');
    expect(inRange).toHaveLength(1);
    expect(inRange[0]).toMatchObject({ type: 'birthday', date: '2026-07-15', title: "Alice's birthday" });

    const outOfRange = buildCalendarItems({ ...empty, contacts: [alice] }, '2026-08-01', '2026-08-31');
    expect(outOfRange).toHaveLength(0);
  });

  it('handles a birthday recurrence across a year boundary', () => {
    const bob = mkContact({ id: 'c-bob', name: 'Bob', birthday: '1985-12-31' });
    const items = buildCalendarItems({ ...empty, contacts: [bob] }, '2026-12-28', '2027-01-03');
    expect(items).toHaveLength(1);
    expect(items[0].date).toBe('2026-12-31');
  });

  it('only includes quick tasks that have a due date inside the range, and reports their done state', () => {
    const dated = mkTask({ id: 't-dated', dueDate: '2026-07-12', doneAt: '2026-07-12T10:00:00.000Z' });
    const undated = mkTask({ id: 't-undated' });
    const outOfRange = mkTask({ id: 't-far', dueDate: '2026-09-01' });
    const items = buildCalendarItems({ ...empty, quickTasks: [dated, undated, outOfRange] }, '2026-07-01', '2026-07-31');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: 'quickTask', date: '2026-07-12', done: true, link: '/' });
  });

  it('includes journal entries written within the range', () => {
    const entry = mkJournal({ date: '2026-07-20' });
    const items = buildCalendarItems({ ...empty, journal: [entry] }, '2026-07-01', '2026-07-31');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: 'journal', date: '2026-07-20', link: '/journal' });
  });

  it('includes an active quest\'s target date but excludes completed quests and undated quests', () => {
    const active = mkQuest({ id: 'q-active', createdAt: '2026-07-01T00:00:00.000Z', targetDuration: '1w' }); // target = 2026-07-08
    const completed = mkQuest({ id: 'q-done', createdAt: '2026-07-01T00:00:00.000Z', targetDuration: '1w', completedAt: '2026-07-05T00:00:00.000Z' });
    const undated = mkQuest({ id: 'q-none', targetDuration: 'none' });
    const items = buildCalendarItems({ ...empty, quests: [active, completed, undated] }, '2026-07-01', '2026-07-31');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: 'questTarget', date: '2026-07-08', link: '/quests/q-active' });
  });

  it('sorts the merged result by date ascending', () => {
    const items = buildCalendarItems({
      ...empty,
      events: [mkEvent({ id: 'e-late', date: '2026-07-25' })],
      journal: [mkJournal({ id: 'j-early', date: '2026-07-02' })],
      quickTasks: [mkTask({ id: 't-mid', dueDate: '2026-07-15' })],
    }, '2026-07-01', '2026-07-31');
    expect(items.map(i => i.date)).toEqual(['2026-07-02', '2026-07-15', '2026-07-25']);
  });
});
