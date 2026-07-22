import { habitDueOn, toDayStr } from './engine';
import type { Habit, HabitDayStatus, JournalEntry, Quest, QuickTask } from './types';

export interface ContractStatus {
  habitsDue: number;
  habitsDone: number;
  habitsOk: boolean;
  journalOk: boolean;
  extraOk: boolean;
  complete: boolean;
}

interface ContractSource {
  habits: Habit[];
  habitLog: Record<string, Record<string, HabitDayStatus>>;
  journal: JournalEntry[];
  quickTasks: QuickTask[];
  quests: Quest[];
}

/**
 * The Daily Three: check every due habit, write the journal, and do one
 * extra thing (a quick task or a quest session). All three → the chest unlocks.
 * Derived live from existing records — nothing to store, nothing to fake.
 */
export function contractStatus(s: ContractSource, day: string): ContractStatus {
  const due = s.habits.filter(h => habitDueOn(h, day));
  const done = due.filter(h => s.habitLog[h.id]?.[day] === 'done').length;
  // No habits scheduled → this leg is free; the other two still gate the chest.
  const habitsOk = due.length === 0 || done === due.length;

  const journalOk = s.journal.some(e => e.date === day);

  // doneAt is a UTC ISO timestamp; convert to the LOCAL day so a 11pm completion still counts today
  const extraOk =
    s.quickTasks.some(t => t.doneAt && toDayStr(new Date(t.doneAt)) === day) ||
    s.quests.some(q => q.sessions.some(sess => sess.date === day));

  return { habitsDue: due.length, habitsDone: done, habitsOk, journalOk, extraOk, complete: habitsOk && journalOk && extraOk };
}
