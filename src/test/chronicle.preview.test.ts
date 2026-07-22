import { describe, expect, it } from 'vitest';
import { buildChronicle, lastCompleteWeek } from '../game/chronicle';
import { addDaysStr } from '../game/engine';
import type { Habit, JournalEntry, Quest, QuickTask } from '../game/types';

// Renders one realistic week and snapshots the result, so the Chronicle's prose
// can be read as writing rather than inferred from unit assertions. Any change to
// the generator shows up here as a readable diff — review it as copy, not as code.
// Accept an intended change with: npx vitest run chronicle.preview -u

const TODAY = '2026-07-22';
const WEEK = lastCompleteWeek(TODAY);
const D = Array.from({ length: 7 }, (_, i) => addDaysStr(WEEK, i));

const habits: Habit[] = [
  { id: 'fajr', name: 'Fajr on time', kind: 'good', freq: 'daily', attrs: ['spirituality'], streak: 23, best: 23, createdAt: '2026-01-01' },
  { id: 'smoke', name: 'No smoking', kind: 'bad', freq: 'daily', attrs: ['health'], streak: 2, best: 14, createdAt: '2026-01-01' },
  { id: 'run', name: 'Morning run', kind: 'good', freq: 'weekly', weekdays: [1, 3, 5], attrs: ['health'], streak: 1, best: 6, createdAt: '2026-01-01' },
];

const habitLog: Record<string, Record<string, 'done' | 'failed'>> = {
  fajr: Object.fromEntries(D.map(d => [d, 'done'])),
  smoke: Object.fromEntries(D.map((d, i) => [d, i === 4 ? 'failed' : 'done'])),
  run: { [D[0]]: 'done', [D[2]]: 'failed', [D[4]]: 'failed' },
};

const quests: Quest[] = [
  {
    id: 'q1', title: 'Ship IrtiQa v1', targetDuration: '1m', attrs: ['career'], priority: true,
    createdAt: `${WEEK}T09:00:00.000Z`,
    sessions: [
      { id: 's1', date: D[1], minutes: 145, note: 'rebuilt the whole mobile shell' },
      { id: 's2', date: D[3], minutes: 95, note: 'stripped the shame layer out of the engine' },
      { id: 's3', date: D[5], minutes: 180, note: 'wrote the Chronicle generator, finally reads like prose' },
    ],
  },
  {
    id: 'q2', title: 'Lesson plans for UniteUS', targetDuration: '1w', attrs: ['career'], priority: false,
    createdAt: `${WEEK}T09:00:00.000Z`,
    completedAt: `${D[6]}T18:00:00.000Z`,
    sessions: [{ id: 's4', date: D[6], minutes: 70, note: 'B1 unit 4 done' }],
  },
];

const journal: JournalEntry[] = [
  { id: 'j1', date: D[1], createdAt: '', mood: 4, stress: 4, answers: [{ q: 'What went well today?', a: 'Got two hours of deep work in before anyone was awake. That never happens.' }] },
  { id: 'j2', date: D[4], createdAt: '', mood: 2, stress: 8, answers: [{ q: 'What drained you?', a: 'Smoked with Alimzhan again. Knew it was coming the moment he called and went anyway.' }] },
  { id: 'j3', date: D[6], createdAt: '', mood: 4, stress: 3, answers: [{ q: 'What are you grateful for?', a: 'Mum woke me for fajr again without being asked.' }] },
];

const quickTasks: QuickTask[] = [
  { id: 't1', title: 'Pay Bekbolat 20k', attr: 'money', createdAt: '', doneAt: `${D[2]}T14:00:00.000Z` },
  { id: 't2', title: 'Call uncle Nurlan', attr: 'family', createdAt: '', doneAt: `${D[5]}T19:00:00.000Z` },
];

const dayLog = Object.fromEntries(D.map((d, i) => [d, { xp: 60 + i * 12, gold: 22 + i * 3 }]));

describe('chronicle preview', () => {
  it('renders a realistic week', () => {
    const c = buildChronicle({ habits, habitLog, journal, quests, quickTasks, dayLog }, WEEK);
    const line = '─'.repeat(74);
    const out: string[] = [
      line,
      `  ${c.title.toUpperCase()}`,
      `  ${c.range}`,
      line,
      `  ${c.stats.map(s => `${s.value} ${s.label}`).join('   ·   ')}`,
      line,
      '',
    ];
    for (const p of c.paragraphs) {
      // Soft-wrap to ~72 chars so the prose is judged the way it will be read
      const words = p.replace(/\*\*/g, '').split(' ');
      let row = ' ';
      const rows: string[] = [];
      for (const w of words) {
        if ((row + w).length > 72) { rows.push(row); row = ' '; }
        row += ` ${w}`;
      }
      rows.push(row);
      out.push(rows.join('\n'), '');
    }
    out.push(line);
    expect(`\n${out.join('\n')}\n`).toMatchSnapshot();
  });
});
