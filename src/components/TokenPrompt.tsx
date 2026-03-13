import { useRef, useEffect, useState, useCallback, type FormEvent } from 'react';
import './Dialogs.css';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TokenPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (token: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'metis-kapasitet-gh-token';

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TokenPrompt({ isOpen, onClose, onSave }: TokenPromptProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [token, setToken] = useState('');

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

  // Reset input when opening
  useEffect(() => {
    if (isOpen) setToken('');
  }, [isOpen]);

  // --- Close on native dialog close (Escape) ---
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClose = () => onClose();
    el.addEventListener('close', handleClose);
    return () => el.removeEventListener('close', handleClose);
  }, [onClose]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = token.trim();
      if (!trimmed) return;
      storeToken(trimmed);
      onSave(trimmed);
    },
    [token, onSave],
  );

  const isValid = token.trim().length > 0;

  return (
    <dialog ref={dialogRef} className="token-prompt">
      <form onSubmit={handleSubmit}>
        <div className="token-prompt__header">
          <h2 className="token-prompt__title">GitHub-token</h2>
        </div>

        <div className="token-prompt__body">
          <p className="token-prompt__info">
            For å redigere kapasitetskalenderen trenger du en
            <strong> fine-grained Personal Access Token</strong> fra GitHub
            med <code>Contents: Read and write</code>-tilgang
            til <code>metis-kapasitetsdata</code>-repoet.
          </p>
          <p className="token-prompt__info">
            Tokenet lagres kun i denne fanen (sessionStorage) og
            forsvinner når du lukker nettleseren.
          </p>

          <div className="dialog-field">
            <label className="dialog-field__label" htmlFor="gh-token">Token</label>
            <input
              id="gh-token"
              className="dialog-field__input"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="github_pat_..."
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="token-prompt__footer">
          <button type="button" className="dialog-btn dialog-btn--secondary" onClick={onClose}>
            Avbryt
          </button>
          <button type="submit" className="dialog-btn dialog-btn--primary" disabled={!isValid}>
            Lagre
          </button>
        </div>
      </form>
    </dialog>
  );
}
