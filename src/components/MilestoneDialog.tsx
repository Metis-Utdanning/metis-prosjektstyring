import { useRef, useEffect, useState, useCallback, type FormEvent } from 'react';
import type { Milestone } from '../types/index.ts';
import './Dialogs.css';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MilestoneDialogProps {
  milestone: Milestone | null; // null = ny milepæl
  isOpen: boolean;
  onClose: () => void;
  onSave: (milestone: Milestone) => void;
  onDelete?: (milestoneId: string) => void;
  defaultDate?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MilestoneDialog({
  milestone,
  isOpen,
  onClose,
  onSave,
  onDelete,
  defaultDate,
}: MilestoneDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
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

    if (milestone) {
      setTitle(milestone.title);
      setDate(milestone.date);
      setDescription(milestone.description ?? '');
    } else {
      setTitle('');
      setDate(defaultDate ?? todayISO());
      setDescription('');
    }
  }, [isOpen, milestone, defaultDate]);

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
      const result: Milestone = {
        id: milestone?.id ?? crypto.randomUUID(),
        title: title.trim(),
        date,
        description: description.trim() || undefined,
      };
      onSave(result);
    },
    [milestone, title, date, description, onSave],
  );

  const handleDelete = useCallback(() => {
    if (!milestone || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(milestone.id);
  }, [milestone, onDelete, confirmDelete]);

  const isEdit = milestone !== null;
  const isValid = title.trim().length > 0 && date.length > 0;

  return (
    <dialog ref={dialogRef} className="dialog">
      <form onSubmit={handleSubmit}>
        <div className="dialog__header">
          <h2 className="dialog__title">
            {isEdit ? 'Rediger milepæl' : 'Ny milepæl'}
          </h2>
        </div>

        <div className="dialog__body">
          {/* Tittel */}
          <div className="dialog-field">
            <label className="dialog-field__label" htmlFor="ms-title">Tittel</label>
            <input
              id="ms-title"
              className="dialog-field__input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Milepælnavn..."
              autoFocus
              required
            />
          </div>

          {/* Dato */}
          <div className="dialog-field">
            <label className="dialog-field__label" htmlFor="ms-date">Dato</label>
            <input
              id="ms-date"
              className="dialog-field__input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Beskrivelse */}
          <div className="dialog-field">
            <label className="dialog-field__label" htmlFor="ms-desc">Beskrivelse</label>
            <textarea
              id="ms-desc"
              className="dialog-field__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Valgfri beskrivelse..."
              rows={3}
            />
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
