import { useRef, useEffect, useState, useCallback, type FormEvent } from 'react';
import type { Unavailable, Person } from '../types/index.ts';
import './Dialogs.css';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface UnavailableDialogProps {
  unavailable: Unavailable | null; // null = ny
  people: Person[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (unavailable: Unavailable) => void;
  onDelete?: (unavailableId: string) => void;
  defaultPerson?: string;
  defaultStartDate?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function oneWeekLaterISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Suggested labels
// ---------------------------------------------------------------------------

const SUGGESTED_LABELS = ['Ferie', 'Kurs', 'Permisjon', 'Syk', 'Konferanse'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UnavailableDialog({
  unavailable,
  people,
  isOpen,
  onClose,
  onSave,
  onDelete,
  defaultPerson,
  defaultStartDate,
}: UnavailableDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [person, setPerson] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [label, setLabel] = useState('');
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

  // --- Populate form ---
  useEffect(() => {
    if (!isOpen) return;
    setConfirmDelete(false);

    if (unavailable) {
      setPerson(unavailable.person);
      setStartDate(unavailable.startDate);
      setEndDate(unavailable.endDate);
      setLabel(unavailable.label);
    } else {
      setPerson(defaultPerson ?? people[0]?.id ?? '');
      setStartDate(defaultStartDate ?? todayISO());
      setEndDate(oneWeekLaterISO());
      setLabel('Ferie');
    }
  }, [isOpen, unavailable, defaultPerson, defaultStartDate, people]);

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
      const result: Unavailable = {
        id: unavailable?.id ?? crypto.randomUUID(),
        person,
        startDate,
        endDate,
        label: label.trim(),
      };
      onSave(result);
    },
    [unavailable, person, startDate, endDate, label, onSave],
  );

  const handleDelete = useCallback(() => {
    if (!unavailable || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(unavailable.id);
  }, [unavailable, onDelete, confirmDelete]);

  const isEdit = unavailable !== null;
  const isValid = person && startDate && endDate && startDate <= endDate && label.trim().length > 0;

  return (
    <dialog ref={dialogRef} className="dialog">
      <form onSubmit={handleSubmit}>
        <div className="dialog__header">
          <h2 className="dialog__title">
            {isEdit ? 'Rediger fravær' : 'Nytt fravær'}
          </h2>
        </div>

        <div className="dialog__body">
          {/* Person */}
          <div className="dialog-field">
            <label className="dialog-field__label" htmlFor="ua-person">Person</label>
            <select
              id="ua-person"
              className="dialog-field__select"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Datoer */}
          <div className="dialog-field__row">
            <div className="dialog-field">
              <label className="dialog-field__label" htmlFor="ua-start">Fra</label>
              <input
                id="ua-start"
                className="dialog-field__input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="dialog-field">
              <label className="dialog-field__label" htmlFor="ua-end">Til</label>
              <input
                id="ua-end"
                className="dialog-field__input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                required
              />
            </div>
          </div>

          {/* Label */}
          <div className="dialog-field">
            <label className="dialog-field__label" htmlFor="ua-label">Type</label>
            <input
              id="ua-label"
              className="dialog-field__input"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="F.eks. Ferie, Kurs..."
              list="ua-label-suggestions"
              autoFocus
              required
            />
            <datalist id="ua-label-suggestions">
              {SUGGESTED_LABELS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </div>

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
