import { useMemo, useState } from 'react';
import { Empty, Modal } from '../components/ui';
import { PayDebtModal } from '../components/PayDebtModal';
import { ARCHETYPES, ARCHETYPE_KEYS, PRIMARY_GROUPS, PRIMARY_GROUP_KEYS } from '../game/constants';
import { addDaysStr, debtPaid, debtRemaining, fmtDay, fmtDayFull, todayStr } from '../game/engine';
import type { Contact, ContactChannels, Debt, PersonalityArchetype, PrimaryGroup } from '../game/types';
import { useGame } from '../store';

const CHANNEL_META: { key: keyof ContactChannels; label: string; icon: string; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram handle', icon: '📸', placeholder: '@handle' },
  { key: 'whatsapp', label: 'WhatsApp Number', icon: '💬', placeholder: '+1 555 …' },
  { key: 'telegram', label: 'Telegram Username', icon: '✈️', placeholder: '@username' },
  { key: 'phone', label: 'Direct Phone', icon: '☎️', placeholder: '+1 555 …' },
  { key: 'email', label: 'Primary Email Address', icon: '✉️', placeholder: 'name@example.com' },
];

/** Deep-link straight into a chat/profile/mail composer with this contact, not just the app's home screen. */
function channelHref(key: keyof ContactChannels, raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  switch (key) {
    case 'whatsapp': {
      const digits = value.replace(/\D/g, '');
      return digits ? `https://wa.me/${digits}` : null;
    }
    case 'telegram': {
      const handle = value.replace(/^@/, '');
      return handle ? `https://t.me/${handle}` : null;
    }
    case 'instagram': {
      const handle = value.replace(/^@/, '');
      return handle ? `https://instagram.com/${handle}` : null;
    }
    case 'phone':
      return `tel:${value.replace(/[^\d+]/g, '')}`;
    case 'email':
      return `mailto:${value}`;
    default:
      return null;
  }
}

export function Social() {
  const s = useGame();
  const [editing, setEditing] = useState<Contact | 'new' | null>(null);
  const [groupFilter, setGroupFilter] = useState<PrimaryGroup | null>(null);
  const [search, setSearch] = useState('');
  const today = todayStr();

  const contacts = useMemo(() => {
    let list = [...s.contacts].sort((a, b) => a.name.localeCompare(b.name));
    if (groupFilter) list = list.filter(c => c.primaryGroup === groupFilter);
    if (search.trim()) list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [s.contacts, groupFilter, search]);

  const upcoming = useMemo(() => {
    const horizon = addDaysStr(today, 30);
    const list: { date: string; title: string; emoji: string }[] = [];
    for (const c of s.contacts) {
      if (!c.birthday) continue;
      const [, m, d] = c.birthday.split('-');
      const year = Number(today.slice(0, 4));
      let bd = `${year}-${m}-${d}`;
      if (bd < today) bd = `${year + 1}-${m}-${d}`;
      if (bd <= horizon) list.push({ date: bd, title: `${c.name}'s birthday`, emoji: '🎂' });
    }
    for (const e of s.events) {
      if (e.date >= today && e.date <= horizon) {
        const c = s.contacts.find(x => x.id === e.contactId);
        list.push({ date: e.date, title: c ? `${e.title} — ${c.name}` : e.title, emoji: '📅' });
      }
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [s.contacts, s.events, today]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Social Hub</h1>
          <p className="muted">Your people, remembered properly. Private — nothing leaves this app.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>+ Add contact (+6 XP)</button>
      </div>

      {upcoming.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>Next 30 days</h2></div>
          <ul className="list">
            {upcoming.map((u, i) => (
              <li key={i} className="list-row">
                <span>{u.emoji}</span>
                <span className="list-title">{u.title}</span>
                <span className="muted">{fmtDay(u.date)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="filter-row">
        <input className="input input-sm" placeholder="Search people…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className={`chip ${groupFilter === null ? 'chip-on' : ''}`} onClick={() => setGroupFilter(null)}>All</button>
        {PRIMARY_GROUP_KEYS.map(g => (
          <button key={g} className={`chip ${groupFilter === g ? 'chip-on' : ''}`} onClick={() => setGroupFilter(groupFilter === g ? null : g)}>
            {PRIMARY_GROUPS[g].label}
          </button>
        ))}
      </div>

      {contacts.length === 0 ? (
        <Empty>No contacts yet. Log the people who matter — classification, birthdays, notes, debts. Each one earns XP toward 🤝 Friends.</Empty>
      ) : (
        <div className="contact-grid">
          {contacts.map(c => (
            <ContactCard key={c.id} contact={c} onEdit={() => setEditing(c)} />
          ))}
        </div>
      )}

      {editing && <ContactForm contact={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ContactCard({ contact, onEdit }: { contact: Contact; onEdit: () => void }) {
  const s = useGame();
  const [addingDebt, setAddingDebt] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);

  const debts = s.debts.filter(d => d.contactId === contact.id);
  const open = debts.filter(d => !d.settledAt);
  const net = open.reduce((a, d) => a + (d.direction === 'theyOwe' ? debtRemaining(d) : -debtRemaining(d)), 0);
  const events = s.events.filter(e => e.contactId === contact.id && e.date >= todayStr());
  const channels = CHANNEL_META.filter(m => contact.channels?.[m.key]);
  const genderEmoji = contact.gender === 'male' ? '♂️' : contact.gender === 'female' ? '♀️' : contact.gender === 'other' ? '⚧' : null;

  return (
    <div className="card contact-card">
      <div className="card-head">
        <div className="contact-identity">
          {contact.avatarUrl ? (
            <img src={contact.avatarUrl} alt="" className="contact-avatar" />
          ) : (
            <span className="contact-avatar contact-avatar-fallback">{contact.name.trim()[0]?.toUpperCase() ?? '?'}</span>
          )}
          <h3>{contact.name}{genderEmoji && <span className="muted"> {genderEmoji}</span>}</h3>
        </div>
        <div className="btn-pair">
          <button className="btn btn-ghost btn-sm" onClick={onEdit} title="Edit">✎</button>
          <button
            className="btn btn-ghost btn-sm"
            title="Delete"
            onClick={() => confirm(`Delete ${contact.name} (and their debts/events)?`) && s.deleteContact(contact.id)}
          >
            ✕
          </button>
        </div>
      </div>
      <div className="contact-tags">
        <span className="tag">{PRIMARY_GROUPS[contact.primaryGroup].label}</span>
        {contact.occupation && <span className="tag">💼 {contact.occupation}</span>}
        {contact.city && <span className="tag">📍 {contact.city}</span>}
        {contact.birthday && <span className="tag">🎂 {fmtDay(contact.birthday)}</span>}
      </div>
      {contact.archetypes.length > 0 && (
        <div className="archetype-row">
          {contact.archetypes.map(a => (
            <span key={a} className="archetype-chip" style={{ '--ac': ARCHETYPES[a].color } as React.CSSProperties}>
              {ARCHETYPES[a].label}
            </span>
          ))}
        </div>
      )}
      {channels.length > 0 && (
        <div className="contact-channels">
          {channels.map(m => {
            const value = contact.channels[m.key] ?? '';
            const href = channelHref(m.key, value);
            return href ? (
              <a
                key={m.key}
                className="contact-channel-link"
                href={href}
                target={m.key === 'phone' || m.key === 'email' ? undefined : '_blank'}
                rel="noopener noreferrer"
                title={`Open ${m.label.replace(/ handle| Number| Username| Phone| Address/, '')}`}
              >
                {m.icon} {value}
              </a>
            ) : (
              <span key={m.key} className="muted">{m.icon} {value}</span>
            );
          })}
        </div>
      )}
      {contact.notes && <p className="contact-notes">{contact.notes}</p>}

      <div className={`debt-net ${net > 0 ? 'debt-pos' : net < 0 ? 'debt-neg' : ''}`}>
        {net === 0 ? '⚖️ Settled up' : net > 0 ? `They owe you ${net}` : `You owe ${-net}`}
      </div>

      {open.length > 0 && (
        <ul className="list list-tight">
          {open.map(d => {
            const remaining = debtRemaining(d);
            const paid = debtPaid(d);
            return (
              <li key={d.id} className="list-row">
                <span>{d.direction === 'theyOwe' ? '⬅️' : '➡️'}</span>
                <span className="list-title">
                  {d.direction === 'theyOwe' ? 'owes you' : 'you owe'} {remaining}
                  {paid > 0 && <span className="muted"> (paid {paid} of {d.amount})</span>}
                  {d.note ? ` · ${d.note}` : ''}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setPayingDebt(d)} title="Log a payment">💳 Pay</button>
              </li>
            );
          })}
        </ul>
      )}

      {events.length > 0 && (
        <ul className="list list-tight">
          {events.map(e => (
            <li key={e.id} className="list-row">
              <span>📅</span>
              <span className="list-title">{e.title}</span>
              <span className="muted">{fmtDayFull(e.date)}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => s.deleteEvent(e.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}

      <div className="btn-pair">
        <button className="btn btn-ghost btn-sm" onClick={() => setAddingDebt(true)}>+ Debt</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setAddingEvent(true)}>+ Event</button>
      </div>

      {addingDebt && <DebtForm contactId={contact.id} name={contact.name} onClose={() => setAddingDebt(false)} />}
      {addingEvent && <EventForm contactId={contact.id} name={contact.name} onClose={() => setAddingEvent(false)} />}
      {payingDebt && <PayDebtModal debt={payingDebt} contactName={contact.name} onClose={() => setPayingDebt(null)} />}
    </div>
  );
}

function DebtForm({ contactId, name, onClose }: { contactId: string; name: string; onClose: () => void }) {
  const addDebt = useGame(s => s.addDebt);
  const [direction, setDirection] = useState<'iOwe' | 'theyOwe'>('theyOwe');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');

  return (
    <Modal title={`Debt with ${name}`} onClose={onClose}>
      <div className="field">
        <span>Direction</span>
        <div className="seg">
          <button type="button" className={direction === 'theyOwe' ? 'seg-on' : ''} onClick={() => setDirection('theyOwe')}>They owe me</button>
          <button type="button" className={direction === 'iOwe' ? 'seg-on' : ''} onClick={() => setDirection('iOwe')}>I owe them</button>
        </div>
      </div>
      <label className="field">
        <span>Amount</span>
        <input className="input" type="number" min={0} value={amount || ''} onChange={e => setAmount(Number(e.target.value))} autoFocus />
      </label>
      <label className="field">
        <span>Note (optional)</span>
        <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="lunch, borrowed cash…" />
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          disabled={amount <= 0}
          onClick={() => { addDebt({ contactId, direction, amount, note: note.trim() }); onClose(); }}
        >
          Log debt (+4 XP)
        </button>
      </div>
    </Modal>
  );
}

function EventForm({ contactId, name, onClose }: { contactId: string; name: string; onClose: () => void }) {
  const addEvent = useGame(s => s.addEvent);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayStr());

  return (
    <Modal title={`Event with ${name}`} onClose={onClose}>
      <label className="field">
        <span>What</span>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Coffee catch-up" autoFocus />
      </label>
      <label className="field">
        <span>When</span>
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          disabled={!title.trim() || !date}
          onClick={() => { addEvent({ contactId, title: title.trim(), date }); onClose(); }}
        >
          Add event
        </button>
      </div>
    </Modal>
  );
}

function IconField({
  icon,
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  icon: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="icon-field">
      <span className="icon-field-ico">{icon}</span>
      <input className="input icon-input" type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function ContactForm({ contact, onClose }: { contact: Contact | null; onClose: () => void }) {
  const addContact = useGame(s => s.addContact);
  const updateContact = useGame(s => s.updateContact);

  const [name, setName] = useState(contact?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(contact?.avatarUrl ?? '');
  const [city, setCity] = useState(contact?.city ?? '');
  const [birthday, setBirthday] = useState(contact?.birthday ?? '');
  const [gender, setGender] = useState<Contact['gender'] | ''>(contact?.gender ?? '');
  const [archetypes, setArchetypes] = useState<PersonalityArchetype[]>(contact?.archetypes ?? []);
  const [occupation, setOccupation] = useState(contact?.occupation ?? '');
  const [primaryGroup, setPrimaryGroup] = useState<PrimaryGroup>(contact?.primaryGroup ?? 'friend');
  const [channels, setChannels] = useState<ContactChannels>(contact?.channels ?? {});
  const [notes, setNotes] = useState(contact?.notes ?? '');

  const toggleArchetype = (a: PersonalityArchetype) =>
    setArchetypes(v => (v.includes(a) ? v.filter(x => x !== a) : [...v, a]));

  const setChannel = (key: keyof ContactChannels, value: string) =>
    setChannels(v => ({ ...v, [key]: value }));

  const save = () => {
    const data = {
      name: name.trim(),
      avatarUrl: avatarUrl.trim() || undefined,
      city: city.trim() || undefined,
      birthday: birthday || undefined,
      gender: gender || undefined,
      archetypes,
      occupation: occupation.trim() || undefined,
      primaryGroup,
      channels: Object.fromEntries(
        Object.entries(channels).map(([k, v]) => [k, (v as string)?.trim() || undefined]),
      ) as ContactChannels,
      notes: notes.trim(),
    };
    if (contact) updateContact(contact.id, data);
    else addContact(data);
    onClose();
  };

  return (
    <Modal title="Establish Intelligence Connection" onClose={onClose} wide>
      <div className="section-label">Full identity</div>
      <IconField icon="👤" placeholder="Subject Name" value={name} onChange={setName} />

      <div className="form-grid-2">
        <div>
          <div className="section-label">Visual ID (URL)</div>
          <IconField icon="🖼️" placeholder="https://…" value={avatarUrl} onChange={setAvatarUrl} />
        </div>
        <div>
          <div className="section-label">Sector (city)</div>
          <IconField icon="📍" placeholder="San Francisco" value={city} onChange={setCity} />
        </div>
      </div>

      <div className="form-grid-2">
        <div>
          <div className="section-label">Temporal origin (birthday)</div>
          <IconField icon="🎂" type="date" placeholder="" value={birthday} onChange={setBirthday} />
        </div>
        <div>
          <div className="section-label">Archetype (gender)</div>
          <select className="input" value={gender} onChange={e => setGender(e.target.value as Contact['gender'])}>
            <option value="">Unspecified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="section-label">Personality baseline (archetypes)</div>
      <div className="archetype-picker">
        {ARCHETYPE_KEYS.map(a => (
          <button
            type="button"
            key={a}
            className={`archetype-chip archetype-chip-btn ${archetypes.includes(a) ? 'archetype-on' : ''}`}
            style={{ '--ac': ARCHETYPES[a].color } as React.CSSProperties}
            onClick={() => toggleArchetype(a)}
          >
            {ARCHETYPES[a].label}
          </button>
        ))}
      </div>

      <div className="section-label">Occupational context</div>
      <IconField icon="💼" placeholder="Software Architect" value={occupation} onChange={setOccupation} />

      <div className="section-label">Classification (primary group)</div>
      <div className="seg seg-5">
        {PRIMARY_GROUP_KEYS.map(g => (
          <button
            type="button"
            key={g}
            className={primaryGroup === g ? 'seg-on' : ''}
            onClick={() => setPrimaryGroup(g)}
          >
            {PRIMARY_GROUPS[g].label}
          </button>
        ))}
      </div>

      <div className="section-label">Communication channels</div>
      <div className="form-grid-2">
        {CHANNEL_META.map(m => (
          <IconField
            key={m.key}
            icon={m.icon}
            placeholder={m.placeholder}
            value={channels[m.key] ?? ''}
            onChange={v => setChannel(m.key, v)}
          />
        ))}
      </div>

      <label className="field">
        <span>Personality notes</span>
        <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Loves chess, allergic to peanuts, ask about her thesis" />
      </label>

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!name.trim()} onClick={save}>{contact ? 'Save' : 'Add contact'}</button>
      </div>
    </Modal>
  );
}
