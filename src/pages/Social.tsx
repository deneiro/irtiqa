import { useMemo, useState } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { Empty, Modal } from '../components/ui';
import { PayDebtModal } from '../components/PayDebtModal';
import { ARCHETYPES, ARCHETYPE_KEYS, PRIMARY_GROUPS, PRIMARY_GROUP_KEYS } from '../game/constants';
import { addDaysStr, debtPaid, debtRemaining, fmtDay, todayStr } from '../game/engine';
import { fmtMoney } from '../game/money';
import type { Contact, ContactChannels, Debt, PersonalityArchetype, PrimaryGroup, SocialEvent } from '../game/types';
import { t as tr, useT } from '../i18n';
import { useGame } from '../store';

/**
 * The service name lives in the placeholder rather than a separate label: five channel
 * fields in a two-column grid have no room for a caption each, and the glyph alone
 * doesn't say "Instagram" to someone meeting the icon set for the first time.
 */
const CHANNEL_META: { key: keyof ContactChannels; label: string; icon: IconName; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: 'instagram', placeholder: 'Instagram — @handle' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', placeholder: 'WhatsApp — +1 555 …' },
  { key: 'telegram', label: 'Telegram', icon: 'telegram', placeholder: 'Telegram — @username' },
  { key: 'phone', label: 'Phone', icon: 'phone', placeholder: 'Phone — +1 555 …' },
  { key: 'email', label: 'Email', icon: 'email', placeholder: 'Email — name@example.com' },
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

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

/** Longest edge of a stored avatar, in CSS pixels. The card draws it at 36px; 256 keeps
 *  it crisp on a 3x screen and leaves room for a bigger frame later. */
const AVATAR_MAX_PX = 256;
/** Anything past this is rejected before it is read, not after. */
const AVATAR_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Turn a chosen file into a small data URL.
 *
 * Why downscale rather than store the file as-is: avatars live in the persisted store,
 * which is localStorage — a few megabytes for the entire save. A phone photo is 3–6 MB
 * on its own, so a handful of contacts would blow the quota and take every habit, quest
 * and journal entry down with them. Re-encoded at 256px this lands around 10 KB.
 *
 * JPEG, not PNG, for the same reason. JPEG has no alpha channel, so the canvas is filled
 * first — without that a transparent PNG comes out with a black background.
 */
function downscaleToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('unreadable'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('not an image'));
      img.onload = () => {
        const scale = Math.min(1, AVATAR_MAX_PX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('no canvas'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/** A dated line in the two date cards. Birthdays recur and can't be "done"; events can. */
type DateRow =
  | { kind: 'birthday'; key: string; date: string; title: string }
  | { kind: 'event'; key: string; date: string; title: string; event: SocialEvent };

export function Social() {
  const t = useT();
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

  const { upcoming, unconfirmed } = useMemo(() => {
    const horizon = addDaysStr(today, 30);
    const backstop = addDaysStr(today, -30);
    const ahead: DateRow[] = [];
    const behind: DateRow[] = [];

    for (const c of s.contacts) {
      if (!c.birthday) continue;
      const [, m, d] = c.birthday.split('-');
      const year = Number(today.slice(0, 4));
      let bd = `${year}-${m}-${d}`;
      if (bd < today) bd = `${year + 1}-${m}-${d}`;
      if (bd <= horizon) ahead.push({ kind: 'birthday', key: `bd-${c.id}`, date: bd, title: `${c.name}'s birthday` });
    }

    for (const e of s.events) {
      const c = s.contacts.find(x => x.id === e.contactId);
      const row: DateRow = { kind: 'event', key: e.id, date: e.date, title: c ? `${e.title} — ${c.name}` : e.title, event: e };
      if (e.date >= today && e.date <= horizon) ahead.push(row);
      // Completing an event is what earns now, so one that came and went unconfirmed
      // must not silently expire the next morning — it stays offerable for a month.
      else if (!e.doneAt && e.date < today && e.date >= backstop) behind.push(row);
    }

    return {
      upcoming: ahead.sort((a, b) => a.date.localeCompare(b.date)),
      unconfirmed: behind.sort((a, b) => b.date.localeCompare(a.date)),
    };
  }, [s.contacts, s.events, today]);

  const filtering = groupFilter !== null || search.trim() !== '';

  return (
    <div className="page soc-page">
      <div className="page-head">
        <div>
          <h1>{t('soc.title')}</h1>
          <p className="muted">{t('soc.subtitle')}</p>
        </div>
        <button className="btn btn-primary soc-btn-ico" data-tour="new-contact" onClick={() => setEditing('new')}>
          <Icon name="plus" size={15} /> {t('soc.addContact')}
        </button>
      </div>

      {unconfirmed.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>{t('soc.didHappen')}</h2></div>
          <p className="muted soc-lede">{t('soc.didHappenLede')}</p>
          <ul className="list">
            {unconfirmed.map(r => <DateRowView key={r.key} row={r} />)}
          </ul>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>{t('soc.next30')}</h2></div>
          <ul className="list">
            {upcoming.map(r => <DateRowView key={r.key} row={r} />)}
          </ul>
        </section>
      )}

      <div className="filter-row">
        <input className="input input-sm" placeholder={t('soc.searchPh')} value={search} onChange={e => setSearch(e.target.value)} />
        <button className={`chip ${groupFilter === null ? 'chip-on' : ''}`} onClick={() => setGroupFilter(null)}>{t('common.all')}</button>
        {PRIMARY_GROUP_KEYS.map(g => (
          <button key={g} className={`chip ${groupFilter === g ? 'chip-on' : ''}`} onClick={() => setGroupFilter(groupFilter === g ? null : g)}>
            {PRIMARY_GROUPS[g].label}
          </button>
        ))}
      </div>

      {contacts.length === 0 ? (
        // Two different empties: an address book you haven't started, and a filter that
        // happens to match nobody. Offering "add your first contact" to someone with
        // forty contacts and a typo in the search box would be wrong.
        filtering ? (
          <Empty>
            <p className="soc-empty-line">{t('soc.noMatch')}</p>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setGroupFilter(null); }}>{t('soc.clearFilters')}</button>
          </Empty>
        ) : (
          <Empty>
            <p className="soc-empty-line">
              <Icon name="friends" size={16} className="soc-empty-ico" /> {t('soc.noContacts')}
            </p>
            <p className="soc-empty-line">
              {t('soc.noContactsBody')}
            </p>
            <button className="btn btn-primary btn-sm soc-btn-ico" onClick={() => setEditing('new')}>
              <Icon name="plus" size={14} /> {t('soc.addFirst')}
            </button>
          </Empty>
        )
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

/** One line in "Did these happen?" / "Next 30 days". Shared so a completed event looks
 *  identical wherever it turns up. */
function DateRowView({ row }: { row: DateRow }) {
  const t = useT();
  const completeEvent = useGame(s => s.completeEvent);

  if (row.kind === 'birthday') {
    return (
      <li className="list-row">
        <Icon name="cake" size={15} className="soc-row-ico" />
        <span className="list-title">{row.title}</span>
        <span className="muted">{fmtDay(row.date)}</span>
      </li>
    );
  }

  const done = !!row.event.doneAt;
  return (
    <li className="list-row">
      <Icon name={done ? 'check' : 'calendar'} size={15} className={`soc-row-ico ${done ? 'soc-row-ico-done' : ''}`} />
      <span className={`list-title ${done ? 'soc-done' : ''}`}>{row.title}</span>
      <span className="muted">{fmtDay(row.date)}</span>
      {!done && (
        <button className="btn btn-ghost btn-sm soc-btn-ico" onClick={() => completeEvent(row.event.id)}>
          <Icon name="check" size={13} /> Mark as happened
        </button>
      )}
    </li>
  );
}

function ContactCard({ contact, onEdit }: { contact: Contact; onEdit: () => void }) {
  const t = useT();
  const s = useGame();
  const [addingDebt, setAddingDebt] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const today = todayStr();

  // Debts are real money, never Gold — they can be posted to a real account from the
  // payment modal, so every figure on this card carries the currency symbol.
  const money = (n: number) => fmtMoney(n, s.currency);

  const debts = s.debts.filter(d => d.contactId === contact.id);
  const open = debts.filter(d => !d.settledAt);
  const net = open.reduce((a, d) => a + (d.direction === 'theyOwe' ? debtRemaining(d) : -debtRemaining(d)), 0);

  // An unconfirmed event stays on the card for a month past its date (confirming it is
  // what earns, so it must stay reachable), and a confirmed one lingers a week so the
  // strike-through reads as feedback rather than the row simply vanishing.
  const openFloor = addDaysStr(today, -30);
  const doneFloor = addDaysStr(today, -7);
  const events = s.events
    .filter(e => e.contactId === contact.id && (e.doneAt ? e.date >= doneFloor : e.date >= openFloor))
    .sort((a, b) => a.date.localeCompare(b.date));

  const channels = CHANNEL_META.filter(m => contact.channels?.[m.key]);

  return (
    <div className="card contact-card" data-tour="contact-card">
      <div className="card-head">
        <div className="contact-identity">
          {contact.avatarUrl ? (
            <img src={contact.avatarUrl} alt="" className="contact-avatar" />
          ) : (
            <span className="contact-avatar contact-avatar-fallback">{contact.name.trim()[0]?.toUpperCase() ?? '?'}</span>
          )}
          <h3>{contact.name}</h3>
        </div>
        <div className="btn-pair">
          <button className="btn btn-ghost btn-sm" onClick={onEdit} aria-label={`Edit ${contact.name}`}>
            <Icon name="edit" size={14} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            aria-label={`Delete ${contact.name}`}
            onClick={() => confirm(`Delete ${contact.name} (and their debts/events)?`) && s.deleteContact(contact.id)}
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>
      <div className="contact-tags">
        <span className="tag">{PRIMARY_GROUPS[contact.primaryGroup].label}</span>
        {contact.occupation && <span className="tag tag-ico"><Icon name="career" size={12} /> {contact.occupation}</span>}
        {/* 'famErrands' is the pin glyph — the icon vocabulary has no location name of its own. */}
        {contact.city && <span className="tag tag-ico"><Icon name="famErrands" size={12} /> {contact.city}</span>}
        {contact.birthday && <span className="tag tag-ico"><Icon name="cake" size={12} /> {fmtDay(contact.birthday)}</span>}
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
                className="contact-channel-link soc-channel"
                href={href}
                target={m.key === 'phone' || m.key === 'email' ? undefined : '_blank'}
                rel="noopener noreferrer"
                title={t('soc.openChannel', { name: m.label })}
              >
                <Icon name={m.icon} size={13} /> {value}
              </a>
            ) : (
              <span key={m.key} className="muted soc-channel"><Icon name={m.icon} size={13} /> {value}</span>
            );
          })}
        </div>
      )}
      {contact.notes && <p className="contact-notes">{contact.notes}</p>}

      {/* Only shown once money has actually passed between you. "Settled up" on a card
          that never had a debt is a line of noise on every contact you own. */}
      {debts.length > 0 && (
        <div className={`debt-net ${net > 0 ? 'debt-pos' : net < 0 ? 'debt-neg' : ''}`}>
          {net === 0 ? (
            <><Icon name="check" size={15} /> {t('soc.settledUp')}</>
          ) : net > 0 ? (
            t('soc.netTheyOwe', { amount: money(net) })
          ) : (
            t('soc.netYouOwe', { amount: money(-net) })
          )}
        </div>
      )}

      {open.length > 0 && (
        <ul className="list list-tight">
          {open.map(d => {
            const remaining = debtRemaining(d);
            const paid = debtPaid(d);
            const theyOwe = d.direction === 'theyOwe';
            return (
              <li key={d.id} className="list-row">
                {/* Down = coming to you, up = leaving you. Same reading as the ledger. */}
                <Icon
                  name={theyOwe ? 'arrowDown' : 'arrowUp'}
                  size={15}
                  className={`soc-row-ico ${theyOwe ? 'soc-in' : 'soc-out'}`}
                />
                <span className="list-title">
                  {theyOwe ? t('fin.owesYou') : t('soc.youOwe')} {money(remaining)}
                  {paid > 0 && <span className="muted"> {t('fin.paidOf', { paid: money(paid), total: money(d.amount) })}</span>}
                  {d.note ? ` · ${d.note}` : ''}
                </span>
                <button className="btn btn-ghost btn-sm soc-btn-ico" onClick={() => setPayingDebt(d)} title={t('fin.logPayment')}>
                  <Icon name="card" size={13} /> {t('fin.pay')}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {events.length > 0 && (
        <ul className="list list-tight">
          {events.map(e => {
            const done = !!e.doneAt;
            return (
              <li key={e.id} className="list-row">
                <Icon name={done ? 'check' : 'calendar'} size={15} className={`soc-row-ico ${done ? 'soc-row-ico-done' : ''}`} />
                {/* Short date: the row now carries an action as well, and "July 28, 2026"
                    pushed the button off a 300px card. */}
                <span className={`list-title ${done ? 'soc-done' : ''}`}>{e.title}</span>
                <span className="muted">{fmtDay(e.date)}</span>
                {!done && (
                  <button className="btn btn-ghost btn-sm soc-btn-ico" onClick={() => s.completeEvent(e.id)}>
                    <Icon name="check" size={13} /> {t('soc.happened')}
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => s.deleteEvent(e.id)} aria-label={t('soc.deleteEvent', { title: e.title })}>
                  <Icon name="trash" size={13} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="btn-pair">
        <button className="btn btn-ghost btn-sm soc-btn-ico" onClick={() => setAddingDebt(true)}>
          <Icon name="plus" size={13} /> {t('soc.debt')}
        </button>
        <button className="btn btn-ghost btn-sm soc-btn-ico" onClick={() => setAddingEvent(true)}>
          <Icon name="plus" size={13} /> {t('soc.event')}
        </button>
      </div>

      {addingDebt && <DebtForm contactId={contact.id} name={contact.name} onClose={() => setAddingDebt(false)} />}
      {addingEvent && <EventForm contactId={contact.id} name={contact.name} onClose={() => setAddingEvent(false)} />}
      {payingDebt && <PayDebtModal debt={payingDebt} contactName={contact.name} onClose={() => setPayingDebt(null)} />}
    </div>
  );
}

function DebtForm({ contactId, name, onClose }: { contactId: string; name: string; onClose: () => void }) {
  const t = useT();
  const addDebt = useGame(s => s.addDebt);
  const currency = useGame(s => s.currency);
  const [direction, setDirection] = useState<'iOwe' | 'theyOwe'>('theyOwe');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');

  return (
    <Modal title={t('soc.debtWith', { name })} onClose={onClose}>
      <div className="field">
        <span>{t('soc.direction')}</span>
        <div className="seg">
          <button type="button" className={direction === 'theyOwe' ? 'seg-on' : ''} onClick={() => setDirection('theyOwe')}>{t('soc.theyOweMe')}</button>
          <button type="button" className={direction === 'iOwe' ? 'seg-on' : ''} onClick={() => setDirection('iOwe')}>{t('soc.iOweThem')}</button>
        </div>
      </div>
      <label className="field">
        {/* The unit is stated because this is real money and the box is a bare number. */}
        <span>{t('soc.amount', { currency })}</span>
        <input className="input" type="number" min={0} value={amount || ''} onChange={e => setAmount(Number(e.target.value))} autoFocus />
      </label>
      <label className="field">
        <span>{t('fin.noteOptional')}</span>
        <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder={t('soc.debtNotePh')} />
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button
          className="btn btn-primary"
          disabled={amount <= 0}
          onClick={() => { addDebt({ contactId, direction, amount, note: note.trim() }); onClose(); }}
        >
          {t('soc.logDebt')}
        </button>
      </div>
    </Modal>
  );
}

function EventForm({ contactId, name, onClose }: { contactId: string; name: string; onClose: () => void }) {
  const t = useT();
  const addEvent = useGame(s => s.addEvent);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayStr());

  return (
    <Modal title={t('soc.eventWith', { name })} onClose={onClose}>
      <label className="field">
        <span>{t('soc.what')}</span>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('soc.eventPh')} autoFocus />
      </label>
      <label className="field">
        <span>{t('soc.when')}</span>
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
      </label>
      <p className="muted soc-hint">{t('soc.eventHint')}</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button
          className="btn btn-primary"
          disabled={!title.trim() || !date}
          onClick={() => { addEvent({ contactId, title: title.trim(), date }); onClose(); }}
        >
          {t('soc.addEvent')}
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
  icon: IconName;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="icon-field">
      <span className="icon-field-ico"><Icon name={icon} size={15} /></span>
      <input className="input icon-input" type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function ContactForm({ contact, onClose }: { contact: Contact | null; onClose: () => void }) {
  const t = useT();
  const addContact = useGame(s => s.addContact);
  const updateContact = useGame(s => s.updateContact);

  const [name, setName] = useState(contact?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(contact?.avatarUrl ?? '');
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [city, setCity] = useState(contact?.city ?? '');
  const [birthday, setBirthday] = useState(contact?.birthday ?? '');
  const [gender, setGender] = useState<Contact['gender'] | ''>(contact?.gender ?? '');
  const [archetypes, setArchetypes] = useState<PersonalityArchetype[]>(contact?.archetypes ?? []);
  const [occupation, setOccupation] = useState(contact?.occupation ?? '');
  const [primaryGroup, setPrimaryGroup] = useState<PrimaryGroup>(contact?.primaryGroup ?? 'friend');
  const [channels, setChannels] = useState<ContactChannels>(contact?.channels ?? {});
  const [notes, setNotes] = useState(contact?.notes ?? '');

  // An uploaded photo is a data URL tens of thousands of characters long. Putting that in
  // the link box would fill it with unreadable noise, so the box shows empty for an upload
  // and typing a URL into it replaces the upload.
  const uploaded = avatarUrl.startsWith('data:');

  const toggleArchetype = (a: PersonalityArchetype) =>
    setArchetypes(v => (v.includes(a) ? v.filter(x => x !== a) : [...v, a]));

  const setChannel = (key: keyof ContactChannels, value: string) =>
    setChannels(v => ({ ...v, [key]: value }));

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Cleared straight away so choosing the same file twice still fires a change event.
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoNote(tr('soc.notAnImage'));
      return;
    }
    // Checked before the read, not after: decoding an 80 MB file to base64 first would
    // freeze the tab for the time it takes to find out we don't want it.
    if (file.size > AVATAR_MAX_BYTES) {
      setPhotoNote(tr('soc.imageTooBig'));
      return;
    }
    setPhotoNote(tr('soc.resizing'));
    try {
      setAvatarUrl(await downscaleToDataUrl(file));
      setPhotoNote(null);
    } catch {
      setPhotoNote("That image couldn't be read. Try another one.");
    }
  };

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
    <Modal title={contact ? t('soc.editContact') : t('soc.newContact')} onClose={onClose} wide>
      <div className="section-label">{t('habits.fieldName')}</div>
      <IconField icon="people" placeholder={t('soc.theirName')} value={name} onChange={setName} />

      <div className="section-label">{t('soc.photo')}</div>
      <div className="soc-photo">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="contact-avatar soc-photo-preview" />
        ) : (
          <span className="contact-avatar contact-avatar-fallback soc-photo-preview"><Icon name="image" size={16} /></span>
        )}
        <div className="soc-photo-actions">
          <label className="btn btn-ghost btn-sm soc-btn-ico soc-photo-pick">
            <Icon name="upload" size={13} />
            {avatarUrl ? t('soc.replacePhoto') : t('soc.choosePhoto')}
            <input type="file" accept="image/*" onChange={pickPhoto} />
          </label>
          {avatarUrl && (
            <button type="button" className="btn btn-ghost btn-sm soc-btn-ico" onClick={() => { setAvatarUrl(''); setPhotoNote(null); }}>
              <Icon name="trash" size={13} /> Remove
            </button>
          )}
        </div>
      </div>
      {photoNote && <p className="muted soc-photo-note">{photoNote}</p>}
      <IconField
        icon="link"
        placeholder={uploaded ? '…or paste an image link instead' : '…or paste an image link'}
        value={uploaded ? '' : avatarUrl}
        onChange={v => { setAvatarUrl(v); setPhotoNote(null); }}
      />

      <div className="form-grid-2">
        <div>
          <div className="section-label">{t('soc.city')}</div>
          {/* 'famErrands' is the pin glyph — the icon vocabulary has no location name of its own. */}
          <IconField icon="famErrands" placeholder={t('soc.cityPh')} value={city} onChange={setCity} />
        </div>
        <div>
          <div className="section-label">{t('soc.work')}</div>
          <IconField icon="career" placeholder={t('soc.workPh')} value={occupation} onChange={setOccupation} />
        </div>
      </div>

      <div className="form-grid-2">
        <div>
          <div className="section-label">{t('soc.birthday')}</div>
          <IconField icon="cake" type="date" placeholder="" value={birthday} onChange={setBirthday} />
        </div>
        <div>
          <div className="section-label">{t('soc.gender')}</div>
          <select className="input" value={gender} onChange={e => setGender(e.target.value as Contact['gender'])}>
            <option value="">{t('soc.unspecified')}</option>
            <option value="male">{t('soc.male')}</option>
            <option value="female">{t('soc.female')}</option>
            <option value="other">{t('soc.otherGender')}</option>
          </select>
        </div>
      </div>

      <div className="section-label">{t('soc.radicals')}</div>
      <p className="muted soc-hint">{t('soc.radicalsHint')}</p>
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

      <div className="section-label">{t('soc.group')}</div>
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

      <div className="section-label">{t('soc.howToReach')}</div>
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
        <span>{t('soc.notes')}</span>
        <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('soc.notesPh')} />
      </label>

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn-primary" disabled={!name.trim()} onClick={save}>{contact ? t('common.save') : t('soc.addContact')}</button>
      </div>
    </Modal>
  );
}
