import { useRef, useEffect, useState, useCallback, type FormEvent } from 'react';
import type { Block, Person } from '../types/index.ts';
import { PALETTE } from '../utils/constants.ts';
import './Dialogs.css';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BlockDialogProps {
  block: Block | null; // null = ny blokk
  people: Person[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (block: Block) => void;
  onDelete?: (blockId: string) => void;
  defaultPerson?: string;
  defaultStartDate?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'akkurat nå';
  if (minutes < 60) return `${minutes} min siden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'time' : 'timer'} siden`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'dag' : 'dager'} siden`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function twoWeeksLaterISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Status labels
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: Block['status']; label: string }[] = [
  { value: 'planned', label: 'Planlagt' },
  { value: 'active', label: 'Aktiv' },
  { value: 'done', label: 'Ferdig' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BlockDialog({
  block,
  people,
  isOpen,
  onClose,
  onSave,
  onDelete,
  defaultPerson,
  defaultStartDate,
}: BlockDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // --- Form state ---
  const [title, setTitle] = useState('');
  const [person, setPerson] = useState('');
  const [status, setStatus] = useState<Block['status']>('planned');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [percent, setPercent] = useState(50);
  const [color, setColor] = useState(PALETTE[0]!);
  const [description, setDescription] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // --- Sync dialog open/close with native <dialog> ---
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isOpen && !el.open) {
      el.showModal();
    } else if (!isOpen && el.open) {
      el.close();
    }
  }, [isOpen]);

  // --- Populate form when block/defaults change ---
  useEffect(() => {
    if (!isOpen) return;
    setConfirmDelete(false);

    if (block) {
      setTitle(block.title);
      setPerson(block.person);
      setStatus(block.status);
      setStartDate(block.startDate);
      setEndDate(block.endDate);
      setPercent(block.percent);
      setColor(block.color);
      setDescription(block.description ?? '');
      setLinks(block.links ? [...block.links] : []);
    } else {
      setTitle('');
      setPerson(defaultPerson ?? people[0]?.id ?? '');
      setStatus('planned');
      setStartDate(defaultStartDate ?? todayISO());
      setEndDate(twoWeeksLaterISO());
      setPercent(50);
      setColor(PALETTE[0]!);
      setDescription('');
      setLinks([]);
    }
  }, [isOpen, block, defaultPerson, defaultStartDate, people]);

  // --- Close on native dialog close (Escape) ---
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClose = () => onClose();
    el.addEventListener('close', handleClose);
    return () => el.removeEventListener('close', handleClose);
  }, [onClose]);

  // --- Handlers ---

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const now = new Date().toISOString();
      const result: Block = {
        id: block?.id ?? crypto.randomUUID(),
        title: title.trim(),
        person,
        startDate,
        endDate,
        percent,
        color,
        status,
        description: description.trim() || undefined,
        links: links.filter((l) => l.trim().length > 0),
        updatedAt: now,
        updatedBy: person,
      };
      onSave(result);
    },
    [block, title, person, startDate, endDate, percent, color, status, description, links, onSave],
  );

  const handleDelete = useCallback(() => {
    if (!block || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(block.id);
  }, [block, onDelete, confirmDelete]);

  const handleLinkChange = useCallback((index: number, value: string) => {
    setLinks((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const handleRemoveLink = useCallback((index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddLink = useCallback(() => {
    setLinks((prev) => [...prev, '']);
  }, []);

  // --- Prevent form submit on Enter inside link inputs ---
  const handleLinkKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') e.preventDefault();
  }, []);

  const isEdit = block !== null;
  const isValid = title.trim().length > 0 && person && startDate && endDate && startDate <= endDate;

  // --- Updated-by display ---
  const updatedByName = isEdit
    ? people.find((p) => p.id === block.updatedBy)?.name ?? block.updatedBy
    : null;

  return (
    <dialog ref={dialogRef} className="dialog">
      <form onSubmit={handleSubmit}>
        <div className="dialog__header">
          <h2 className="dialog__title">{isEdit ? 'Rediger blokk' : 'Ny blokk'}</h2>
        </div>

        <div className="dialog__body">
          {/* Tittel */}
          <div className="dialog-field">
            <label className="dialog-field__label" htmlFor="block-title">Tittel</label>
            <input
              id="block-title"
              className="dialog-field__input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Prosjektnavn..."
              autoFocus
              required
            />
          </div>

          {/* Person + Status */}
          <div className="dialog-field__row">
            <div className="dialog-field">
              <label className="dialog-field__label" htmlFor="block-person">Person</label>
              <select
                id="block-person"
                className="dialog-field__select"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="dialog-field">
              <label className="dialog-field__label" htmlFor="block-status">Status</label>
              <select
                id="block-status"
                className="dialog-field__select"
                value={status}
                onChange={(e) => setStatus(e.target.value as Block['status'])}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Datoer */}
          <div className="dialog-field__row">
            <div className="dialog-field">
              <label className="dialog-field__label" htmlFor="block-start">Fra</label>
              <input
                id="block-start"
                className="dialog-field__input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="dialog-field">
              <label className="dialog-field__label" htmlFor="block-end">Til</label>
              <input
                id="block-end"
                className="dialog-field__input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                required
              />
            </div>
          </div>

          {/* Prosent */}
          <div className="dialog-field">
            <label className="dialog-field__label" htmlFor="block-percent">Prosent</label>
            <div className="dialog-field__percent-wrapper">
              <input
                id="block-percent"
                className="dialog-field__input"
                type="number"
                min={1}
                max={100}
                value={percent}
                onChange={(e) => setPercent(Math.max(1, Math.min(100, Number(e.target.value))))}
                required
              />
              <span className="dialog-field__percent-suffix">%</span>
            </div>
          </div>

          {/* Farge */}
          <div className="dialog-field">
            <span className="dialog-field__label">Farge</span>
            <div className="dialog-palette">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`dialog-palette__swatch${c === color ? ' dialog-palette__swatch--selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Velg farge ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Beskrivelse */}
          <div className="dialog-field">
            <label className="dialog-field__label" htmlFor="block-desc">Beskrivelse</label>
            <textarea
              id="block-desc"
              className="dialog-field__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Valgfri beskrivelse..."
              rows={3}
            />
          </div>

          {/* Lenker */}
          <div className="dialog-field">
            <span className="dialog-field__label">Lenker</span>
            <div className="dialog-links">
              {links.map((link, i) => (
                <div key={i} className="dialog-links__item">
                  <input
                    className="dialog-field__input"
                    type="url"
                    value={link}
                    onChange={(e) => handleLinkChange(i, e.target.value)}
                    onKeyDown={handleLinkKeyDown}
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    className="dialog-links__remove"
                    onClick={() => handleRemoveLink(i)}
                    aria-label="Fjern lenke"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button type="button" className="dialog-links__add" onClick={handleAddLink}>
                + Legg til lenke
              </button>
            </div>
          </div>
        </div>

        {/* Sist endret */}
        {isEdit && updatedByName && (
          <div className="dialog__meta">
            Sist endret: {updatedByName}, {timeAgo(block.updatedAt)}
          </div>
        )}

        {/* Footer */}
        <div className={`dialog__footer${isEdit ? ' dialog__footer--with-delete' : ''}`}>
          {isEdit && onDelete && (
            <div className="dialog__confirm-delete">
              {confirmDelete && (
                <span className="dialog__confirm-delete-text">Er du sikker?</span>
              )}
              <button
                type="button"
                className="dialog-btn dialog-btn--danger"
                onClick={handleDelete}
              >
                {confirmDelete ? 'Ja, slett' : 'Slett'}
              </button>
            </div>
          )}
          <button type="button" className="dialog-btn dialog-btn--secondary" onClick={onClose}>
            Avbryt
          </button>
          <button type="submit" className="dialog-btn dialog-btn--primary" disabled={!isValid}>
            Bruk
          </button>
        </div>
      </form>
    </dialog>
  );
}
