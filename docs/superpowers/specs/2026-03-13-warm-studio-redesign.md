# Warm Studio — Kapasitetskalender Redesign

## Summary

Visuell oppgradering av kapasitetskalenderen fra "Refined Stone" til "Warm Studio" — et varmere, mer raffinert lyst tema med dempede farger, person-avatarer, og bedre visuell dybde.

Ingen funksjonelle endringer. Kun CSS og minimal JSX (avatarer).

## Design Decisions

- **Avatarer**: Sirkel med initial + personens prosjektfarge ved person-label
- **Gradient-stripe under toolbar**: Nei (for mye)
- **Dusty fargepalett**: Ja, erstatt skarpe Tailwind-farger i PALETTE
- **Font**: Behold Sora (ingen endring)
- **Overbooked-indikator**: Forblir rod — semantisk "fare"-farge, uavhengig av aksent
- **Presentasjonsmodus**: Ut av scope — oppdateres separat om nodvendig

## Changes

### 1. Fargepalett (constants.ts)

Erstatt `PALETTE` med dempede "dusty" versjoner:

```
#3B82F6 → #6B8ADB  (dusty blue)
#10B981 → #5BA88C  (sage green)
#F59E0B → #D4A853  (warm gold)
#EF4444 → #C96B6B  (dusty rose)
#8B5CF6 → #8B7BC7  (muted lavender)
#EC4899 → #C4789A  (mauve)
#06B6D4 → #6B9EC7  (dusty cyan)
#84CC16 → #8FB85A  (olive)
#F97316 → #D4885A  (burnt sienna)
#6366F1 → #7B7BD5  (muted indigo)
#14B8A6 → #5BA8A0  (teal sage)
#A855F7 → #9B7BC7  (soft purple)
```

### 2. CSS Custom Properties (Timeline.css :root)

```css
--tl-bg: #F4F1EC;              /* was #fafaf9 — warmer, more "papir" */
--tl-surface: #F9F7F4;         /* was #ffffff — soft off-white */
--tl-border: #E8E4DF;          /* was #e5e5e4 — warmer gray */
--tl-border-light: #EDEAE5;    /* was #f0efed */
--tl-text: #1C1917;            /* unchanged */
--tl-text-muted: #78716C;      /* unchanged */
--tl-text-light: #A8A29E;      /* unchanged */
--tl-today-color: #4F46E5;     /* was #dc2626 — indigo instead of red */
--tl-header-bg: #EDEAE5;       /* was #f5f5f4 — warmer */
--tl-label-bg: #F0EDE8;        /* was #1c1917 — LIGHT instead of dark */
--tl-label-text: #44403C;      /* was #f5f5f4 — dark text on light bg */
--tl-swimlane-bg: #F9F7F4;     /* was #ffffff */
--tl-swimlane-alt: #F4F1EC;    /* was #fafaf9 */
--tl-capacity-green: #16a34a;  /* unchanged */
--tl-capacity-yellow: #ca8a04; /* unchanged */
--tl-capacity-red: #dc2626;    /* unchanged */
--tl-milestone-color: #7c3aed; /* unchanged */
--tl-radius: 10px;             /* was 8px — slightly rounder */
--tl-radius-sm: 6px;           /* was 5px — proportional increase */
--tl-block-shadow:
  0 1px 3px rgba(0, 0, 0, 0.06),
  0 2px 8px rgba(0, 0, 0, 0.03);  /* was 0.08/0.04 — softer */
--tl-block-shadow-hover:
  0 4px 16px rgba(0, 0, 0, 0.10),
  0 2px 4px rgba(0, 0, 0, 0.05);  /* was 0.10/0.06 — softer */
```

### 3. Label-bg shift: dark → light (CRITICAL)

`--tl-label-bg` endres fra mork (#1c1917) til lys (#F0EDE8). Alle steder med `rgba(255, 255, 255, ...)` borders/colors pa label-elementer MÅ oppdateres:

```css
/* Timeline.css — alle endringer fra white-alpha til dark-alpha: */

.timeline-header__corner {
  border-right: 1px solid #DDD9D2;               /* was rgba(255,255,255,0.06) */
}

.timeline-header__years {
  background: var(--tl-label-bg);                 /* was --tl-label-bg (OK) */
  border-bottom: 1px solid #DDD9D2;              /* was rgba(255,255,255,0.06) */
}

.timeline-header__year {
  color: #78716C;                                 /* was rgba(255,255,255,0.6) */
  border-right: 2px solid #DDD9D2;               /* was rgba(255,255,255,0.12) */
}

.timeline-header__month {
  border-right: 1px solid #DDD9D2;               /* was rgba(255,255,255,0.08) */
}

.swimlane__label {
  border-right: 1px solid #DDD9D2;               /* was rgba(255,255,255,0.06) */
}

.capacity-bar__label {
  border-right: 1px solid #DDD9D2;               /* was rgba(255,255,255,0.06) */
}

.milestone-row__label {
  border-right: 1px solid #DDD9D2;               /* was rgba(255,255,255,0.06) */
}
```

### 4. Kapasitets-celler — pill-form (Timeline.css)

Erstatt firkantede celler med pill-form:

```css
.capacity-bar {
  padding: 3px 0;
}

.capacity-bar__cell {
  border-radius: 10px;
  height: 18px;
  border-right: none;
  margin: 0 1px;
}

.capacity-bar__cell--green {
  background: linear-gradient(135deg, #16a34a, #22c55e);
}

.capacity-bar__cell--yellow {
  background: linear-gradient(135deg, #ca8a04, #eab308);
}

.capacity-bar__cell--red {
  background: linear-gradient(135deg, #dc2626, #ef4444);
}

.capacity-bar__cell--empty {
  background: rgba(0,0,0,0.03);
  color: #C8C3BC;
}
```

### 5. Blokker — mer dybde (Timeline.css)

Oppdater via CSS custom properties (--tl-block-shadow, --tl-block-shadow-hover) definert i seksjon 2. Blokk-radien bruker --tl-radius som na er 10px.

```css
.block {
  border: 1px solid rgba(0,0,0,0.06);          /* was rgba(0,0,0,0.08) */
}
```

### 6. Today-markering — rod → indigo (Timeline.css)

`--tl-today-color` endres til #4F46E5, men hardkodede rod-verdier ma ogsa oppdateres:

```css
/* Header today marker — box-shadow var hardkodet */
.timeline-header__today-marker {
  box-shadow: 0 0 8px rgba(79, 70, 229, 0.25);  /* was rgba(220,38,38,0.25) */
}

/* Swimlane today marker — box-shadow var hardkodet */
.swimlane__today-marker {
  box-shadow: 0 0 6px rgba(79, 70, 229, 0.15);  /* was rgba(220,38,38,0.15) */
}

/* Flash-animasjon ved klikk "I dag" */
@keyframes today-flash {
  0%, 100% { box-shadow: 0 0 8px rgba(79, 70, 229, 0.25); }
  20% { box-shadow: 0 0 24px rgba(79, 70, 229, 0.7), 0 0 48px rgba(79, 70, 229, 0.3); }
  50% { box-shadow: 0 0 16px rgba(79, 70, 229, 0.5), 0 0 32px rgba(79, 70, 229, 0.2); }
}

/* Current week highlight */
.timeline-header__week--current {
  color: var(--tl-today-color);               /* already uses var — OK */
  background: rgba(79, 70, 229, 0.06);        /* was rgba(220,38,38,0.06) */
}
```

Note: `.swimlane--overbooked` forblir rod (`rgba(220,38,38,...)`). Rod = semantisk fare, ikke koblet til aksent-farge.

### 7. Skeleton/loading states (App.css)

Oppdater skeleton til nye farger:

```css
.skeleton-toolbar {
  background: #1E1B18;                        /* was #0c0a09 */
}

.skeleton-summary {
  background: #EDEAE5;                        /* was #f5f5f4 */
  border-bottom-color: #E8E4DF;               /* was #e5e5e4 */
}

.skeleton-timeline {
  background: #F4F1EC;                        /* was #fafaf9 */
}

.skeleton-header {
  background: linear-gradient(180deg, #F0EDE8 32px, #EDEAE5 32px);
  /* was linear-gradient(180deg, #1c1917 32px, #f5f5f4 32px) */
}

.skeleton-label {
  background: #F0EDE8;                        /* was #1c1917 */
}

.skeleton-block {
  background: #DDD9D2;                        /* was #e7e5e4 */
}
```

### 8. Scrollbar (App.css)

```css
.timeline-container::-webkit-scrollbar-track { background: #EDEAE5; }
.timeline-container::-webkit-scrollbar-thumb { background: #C8C3BC; }
.timeline-container::-webkit-scrollbar-thumb:hover { background: #A8A29E; }
.timeline-container::-webkit-scrollbar-corner { background: #EDEAE5; }
```

### 9. Body & app shell (App.css)

```css
body { background: #F4F1EC; }
.app { background: #F4F1EC; }
.timeline-container { background: #F4F1EC; }

/* Week detail header */
.week-detail-header {
  background: #EDEAE5;                        /* was #f5f5f4 */
  border-bottom-color: #E8E4DF;               /* was #e5e5e4 */
}
```

### 10. Toolbar (Dialogs.css)

Toolbar forblir mork (#1E1B18), men varmere. Aksent endres til indigo:

```css
.toolbar {
  background: #1E1B18;                        /* was #0c0a09 */
}

.toolbar__btn--save {
  background: #4F46E5;                        /* was #2563eb */
  border-color: #4F46E5;
  box-shadow: 0 1px 4px rgba(79,70,229,0.35);
}

.toolbar__btn--save:hover:not(:disabled) {
  background: #4338CA;
  border-color: #4338CA;
  box-shadow: 0 3px 10px rgba(79,70,229,0.4);
}

.toolbar__btn--save:disabled {
  background: rgba(79,70,229,0.3);
  border-color: rgba(79,70,229,0.3);
}
```

### 11. Dialog-oppdateringer (Dialogs.css)

Dialoger far varmere bakgrunn. Aksent-farge endres konsekvent til indigo:

```css
.dialog { background: #FDFCFA; }
.dialog__header { border-bottom-color: #E8E4DF; }
.dialog__footer { background: #F0EDE8; border-top-color: #E8E4DF; }

/* Focus rings → indigo */
.dialog-field__input:focus,
.dialog-field__select:focus,
.dialog-field__textarea:focus {
  border-color: #4F46E5;
  box-shadow: 0 0 0 3px rgba(79,70,229,0.12);
}

/* Primary button → indigo */
.dialog-btn--primary {
  background: #4F46E5;
  box-shadow: 0 1px 3px rgba(79,70,229,0.3);
}

.dialog-btn--primary:hover:not(:disabled) {
  background: #4338CA;
  box-shadow: 0 3px 10px rgba(79,70,229,0.35);
}

/* Links → indigo */
.dialog-links__add { color: #4F46E5; }
.dialog-links__add:hover { color: #4338CA; }

/* Selection ring */
.block--selected { outline-color: #4F46E5; }
.block:focus-visible { outline-color: #4F46E5; }

/* Token prompt */
.token-prompt { background: #FDFCFA; }
.token-prompt__header { border-bottom-color: #E8E4DF; }
.token-prompt__footer { background: #F0EDE8; border-top-color: #E8E4DF; }
```

### 12. Week summary (Dialogs.css)

```css
.week-summary {
  background: #EDEAE5;
  border-bottom-color: #DDD9D2;
}
```

### 13. Person-avatarer (Swimlane.tsx)

Legg til avatar-sirkel i swimlane label:

```tsx
// Use existing personBlocks (already computed via useMemo in Swimlane).
// Import PALETTE from constants.ts.
// `index` prop is already available (person's position in people array).
const avatarColor = personBlocks[0]?.color ?? PALETTE[(index ?? 0) % PALETTE.length];

<div className="swimlane__label">
  <div
    className="swimlane__avatar"
    style={{ backgroundColor: avatarColor }}
  >
    {person.name.charAt(0)}
  </div>
  <span>{person.name}</span>
</div>
```

Default-farge: `PALETTE[index % PALETTE.length]` — sikrer at personer uten blokker fortsatt far en farge. `personBlocks` refererer til den eksisterende memoized variabelen, IKKE en ny deklarasjon.

CSS for avatar (Timeline.css):

```css
.swimlane__label {
  gap: 8px;
  /* Existing: display:flex, align-items:flex-start, padding:14px 16px */
  /* Reduser padding noe for a gi plass til avatar */
  padding: 12px 10px;
}

.swimlane__avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  margin-top: 1px;
}
```

Label width forblir 120px. Med padding 10px + 26px avatar + 8px gap = 44px. Gir ~76px for navn — nok for "Fredrik" og "Simen".

### 14. Unavailable-blokker (Timeline.css)

Forblir uendret. De eksisterende `rgba(168, 162, 158, 0.10)` hatching-verdiene fungerer godt mot den nye varme bakgrunnen.

## Files to Modify

| File | Scope |
|------|-------|
| `src/utils/constants.ts` | PALETTE array (12 farger) |
| `src/components/Timeline.css` | CSS vars, label-bg borders, capacity-cell, block, swimlane, avatar, today-flash |
| `src/components/Dialogs.css` | Toolbar, dialog, buttons, links, week-summary, token-prompt |
| `src/App.css` | Body, app shell, scrollbar, skeleton, week-detail-header |
| `src/components/Swimlane.tsx` | Avatar-element + avatarColor derivation |

## Out of Scope

- Mork modus / tema-bytte
- Font-endringer
- Sidebar/layout-endringer
- Funksjonelle endringer
- Mobilresponsivitet-forbedringer
- Presentasjonsmodus-farger (PresentationDashboard) — kan oppdateres separat
- ErrorBoundary.tsx inline farger (#2563eb, #fafaf9) — minimal synlighet, oppdateres separat
