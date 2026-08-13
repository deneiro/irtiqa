import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Empty } from '../components/ui';
import {
  buildChronicle,
  chronicleWeeks,
  lastCompleteWeek,
  type Chronicle as ChronicleWeek,
} from '../game/chronicle';
import { fmtDayFull, todayStr } from '../game/engine';
import { useT } from '../i18n';
import { useGame } from '../store';

/**
 * Renders **bold** spans. The generator marks the player's own habit and quest
 * names this way so their words stand out from the connective prose around them.
 */
function Prose({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="chron-para">
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          part
        ),
      )}
    </p>
  );
}

function ChronicleBody({ chronicle }: { chronicle: ChronicleWeek }) {
  return (
    <>
      {chronicle.stats.length > 0 && (
        <div className="chron-stats">
          {chronicle.stats.map(s => (
            <div key={s.label} className="chron-stat">
              <span className="chron-stat-value">{s.value}</span>
              <span className="chron-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="chron-prose">
        {chronicle.paragraphs.map((p, i) => (
          <Prose key={i} text={p} />
        ))}
      </div>
    </>
  );
}

export function Chronicle() {
  const t = useT();
  const s = useGame();
  const today = todayStr();
  const [openWeek, setOpenWeek] = useState<string | null>(null);

  const src = useMemo(
    () => ({
      habits: s.habits,
      habitLog: s.habitLog,
      journal: s.journal,
      quests: s.quests,
      quickTasks: s.quickTasks,
      dayLog: s.dayLog,
    }),
    [s.habits, s.habitLog, s.journal, s.quests, s.quickTasks, s.dayLog],
  );

  const current = useMemo(() => buildChronicle(src, lastCompleteWeek(today)), [src, today]);

  // Past weeks, minus the one already shown in full above
  const archive = useMemo(() => {
    const weeks = chronicleWeeks(src, today).slice(1);
    return weeks.map(w => buildChronicle(src, w)).filter(c => !c.thin);
  }, [src, today]);

  const copyToClipboard = async (c: ChronicleWeek) => {
    const plain = c.paragraphs.map(p => p.replace(/\*\*/g, '')).join('\n\n');
    const header = `${c.title}\n${c.range}\n\n`;
    const footer = c.stats.length > 0 ? `\n\n${c.stats.map(x => `${x.value} ${x.label}`).join(' · ')}` : '';
    await navigator.clipboard.writeText(header + plain + footer);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t('nav.chronicle')}</h1>
          <p className="muted">{t('chron.subtitle')}</p>
        </div>
      </div>

      <section className="card card-hero chron-card">
        <div className="chron-head">
          <div>
            <h2 className="chron-title">{current.title}</h2>
            <p className="muted">{current.range}</p>
          </div>
          <CopyButton onCopy={() => copyToClipboard(current)} />
        </div>

        {current.thin ? (
          <Empty>
            Not enough happened last week to write about honestly. The Chronicle builds itself from
            what you log: <Link to="/habits">check in on a habit</Link>,{' '}
            <Link to="/quests">work a quest</Link>, or <Link to="/journal">write tonight's entry</Link>.
          </Empty>
        ) : (
          <ChronicleBody chronicle={current} />
        )}
      </section>

      <h2 className="section-title">{t('chron.earlierWeeks')}</h2>
      {archive.length === 0 ? (
        <Empty>
          No earlier weeks on record yet — they accumulate on their own as you go. Meanwhile,{' '}
          <Link to="/journal">tonight's journal entry</Link> gives next week's chronicle something to
          quote.
        </Empty>
      ) : (
        <div className="chron-archive">
          {archive.map(c => {
            const open = openWeek === c.week;
            return (
              <div key={c.week} className={`card chron-entry ${open ? 'chron-open' : ''}`}>
                <button
                  className="chron-entry-head"
                  onClick={() => setOpenWeek(open ? null : c.week)}
                  aria-expanded={open}
                >
                  <span className="chron-entry-title">{c.title}</span>
                  <span className="muted">{c.range}</span>
                </button>
                {open && (
                  <div className="chron-entry-body">
                    <ChronicleBody chronicle={c} />
                    <p className="muted chron-filed">{t('chron.filed', { date: fmtDayFull(c.week) })}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CopyButton({ onCopy }: { onCopy: () => Promise<void> }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        try {
          await onCopy();
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // Clipboard blocked (insecure origin or denied permission) — stay quiet
        }
      }}
      aria-live="polite"
    >
      {copied ? <span className="heading-icon"><Icon name="check" size={13} /> Copied</span> : 'Copy'}
    </button>
  );
}
