# Prompt: Visuell QA — Fiks alle UX-bugs funnet i nettleser-testing

> **Kontekst:** Playwright-basert visuell testing avdekket 10 UX-problemer som kode-review ikke fant. Disse er ting som irriterer brukere og forhindrer "Google-kvalitet"-opplevelse.

---

## Arbeidsmetodikk

### Strategi: Grupper etter fil, ikke etter prioritet

Mange fixes berører de SAMME filene. For effektivitet: fiks alt i én fil på én gang.

| Fil | Fixes |
|-----|-------|
| `src/App.tsx` | #1 (zoom scroll), #2 (presentasjon scroll) |
| `src/components/BlockElement.tsx` | #3 (skjul tooltip ved context menu), #4+#5 (norsk tooltip) |
| `src/components/Swimlane.tsx` | #3 (tooltip-state ved context menu) |
| `src/App.tsx` + `src/App.css` | #7 ("Logg inn"-knapp tema) |
| `src/App.tsx` (DEMO_DATA) | #8 (oppdater demo-farger) |
| `src/components/BlockDialog.tsx` + `src/components/MilestoneDialog.tsx` + `src/components/UnavailableDialog.tsx` | #9 (X-knapp i header) |
| `src/components/Dialogs.css` | #9 (X-knapp styling) |
| `src/components/MilestoneRow.tsx` + `src/components/Timeline.css` | #6 (milepæl-overlapp) |

### Rekkefølge (avhengighetsbasert)

1. **Batch A** — `App.tsx` endringer (#1, #2, #7, #8) — størst fil, gjør alt på en gang
2. **Batch B** — `BlockElement.tsx` + `Swimlane.tsx` (#3, #4, #5) — tooltip-fixes henger sammen
3. **Batch C** — Dialoger (#9) — X-knapp i alle 3 dialoger + CSS
4. **Batch D** — MilestoneRow (#6) — uavhengig

Bygg etter hver batch: `fnm use 22 && npm run build`

---

## Fix #1: Zoom bevarer scroll-posisjon

**Problem:** Når brukeren endrer zoom-nivå, endres `dayWidth` og dermed alle piksel-offset. Scroll-posisjonen forblir uendret i piksler, men representerer nå en helt annen dato. Brukeren "mister seg" og må klikke "I dag" for å finne tilbake.

**Fil:** `src/App.tsx` — `handleZoomChange`

**Fix:** Før zoom-endring, les nåværende scroll-posisjon og regn ut hvilken dato som er i sentrum av viewporten. Etter zoom-endring, regn ut ny piksel-offset for den datoen og sett scroll.

```typescript
const handleZoomChange = useCallback((level: ZoomLevel) => {
  // Capture the date currently at the center of the viewport
  const container = timelineRef.current;
  let centerDate: Date | null = null;
  if (container) {
    const centerX = container.scrollLeft + container.clientWidth / 2 - 120; // minus label width
    const oldDayWidth = (WEEK_COLUMN_WIDTH * ZOOM_FACTORS[zoomLevel]) / 7;
    const daysFromStart = centerX / oldDayWidth;
    centerDate = addDays(activeTimelineStart, Math.round(daysFromStart));
  }

  setZoomLevel(level);
  localStorage.setItem('metis-zoom', level);

  // After state update, restore scroll to keep the same date centered
  if (container && centerDate) {
    requestAnimationFrame(() => {
      const newDayWidth = (WEEK_COLUMN_WIDTH * ZOOM_FACTORS[level]) / 7;
      const newOffset = dateToPixelOffset(centerDate!, activeTimelineStart, newDayWidth);
      container.scrollLeft = Math.max(0, newOffset - container.clientWidth / 2 + 120);
    });
  }
}, [zoomLevel, activeTimelineStart]);
```

**Verifisering:** Zoom inn/ut mens du ser på uke 14 → du skal fortsatt se uke 14 etter zoom.

---

## Fix #2: Presentasjonsmodus scroller til i dag

**Problem:** Når brukeren aktiverer presentasjonsmodus, endres layout (dashboard erstatter toolbar+summary), men scroll-posisjon forblir uendret. Ofte viser dette tomme uker langt i fremtiden.

**Fil:** `src/App.tsx` — presentasjon-toggle callback

**Fix:** Etter å ha satt `isPresentationMode(true)`, kall `handleGoToToday()` med en kort delay (DOM må oppdateres først).

```typescript
onTogglePresentation={() => {
  const entering = !isPresentationMode;
  setIsPresentationMode(entering);
  if (entering) {
    document.documentElement.requestFullscreen?.().catch(() => {});
    // Scroll to today after layout shift
    setTimeout(() => handleGoToToday(), 100);
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}}
```

**Verifisering:** Klikk "Presentasjon" → timeline viser dagens dato med blokker synlige, ikke tomme uker.

---

## Fix #3: Skjul tooltip ved høyreklikk (context menu)

**Problem:** Når brukeren høyreklikker en blokk, vises BÅDE tooltip (blokk-detaljer) OG kontekstmeny (Rediger/Dupliser/Slett) samtidig. To overlays oppå hverandre ser rotete ut.

**Filer:** `src/components/BlockElement.tsx`

**Fix:** Skjul tooltip når `onContextMenu` fyrer.

I `BlockElement.tsx`, i `onContextMenu`-handleren:
```tsx
onContextMenu={(e) => {
  e.preventDefault();
  setShowTooltip(false);  // <-- legg til denne
  onContextMenu?.(e, block);
}}
```

**Verifisering:** Høyreklikk blokk → kun kontekstmeny vises, ikke tooltip.

---

## Fix #4 + #5: Norsk tooltip-tekst med formaterte datoer

**Problem:** Tooltip viser "Status: active" (engelsk) og ISO-datoer "2026-03-09" (maskinlesbart). Resten av appen er norsk med lesbare datoer.

**Fil:** `src/components/BlockElement.tsx` — tooltip-render

**Fix:** Formater status og datoer i tooltip:

```tsx
{/* Status-mapping */}
const STATUS_LABELS: Record<string, string> = {
  planned: 'Planlagt',
  active: 'Aktiv',
  done: 'Ferdig',
};

{/* I tooltip-render: */}
{showTooltip && (
  <div className="block__tooltip">
    <strong>{block.title}</strong>
    <br />
    {formatDateNorwegian(block.startDate)} – {formatDateNorwegian(block.endDate)}
    <br />
    Allokering: {block.percent}%
    <br />
    Status: {STATUS_LABELS[block.status] ?? block.status}
    {block.description && (
      <>
        <br />
        {block.description}
      </>
    )}
  </div>
)}
```

`formatDateNorwegian` bruker `format(parseISO(dateStr), 'd. MMMM yyyy', { locale: nb })` fra date-fns, eller en enklere manuell formatter uten ekstra locale-import:

```typescript
function formatDateNorwegian(isoDate: string): string {
  const months = ['jan.', 'feb.', 'mars', 'apr.', 'mai', 'juni',
                  'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'des.'];
  const [y, m, d] = isoDate.split('-');
  return `${parseInt(d)}. ${months[parseInt(m) - 1]} ${y}`;
}
```

**Verifisering:** Hover over blokk → "15. mars 2026 – 29. mars 2026", "Status: Aktiv"

---

## Fix #6: Milepæl-labels overlapper i kompakt zoom

**Problem:** I kompakt zoom (0.4x) er milepæl-markørene tett sammen, og tittel-labels ("Privatistportal MVP", "Inntak komplett") overlapper visuelt.

**Fil:** `src/components/MilestoneRow.tsx` + `src/components/Timeline.css`

**Fix:** Skjul tittel-tekst når to milepæler er nærmere enn 80px, og vis kun diamant-ikonet. Tooltip viser full info ved hover.

Alternativ (enklere): Sett `max-width` på tittel-tekst og bruk `text-overflow: ellipsis`, eller bruk `display: none` under en viss ukebredde.

```css
/* I Timeline.css */
.milestone-row__title {
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

**Verifisering:** Zoom til "Kompakt" → milepæl-titler avkortes med "..." i stedet for å overlappe.

---

## Fix #7: "Logg inn med GitHub"-knapp matcher tema

**Problem:** Knappen er skarp grønn (#16a34a-aktig) som bryter med det indigo-baserte temaet. Burde bruke indigo som primærfarge.

**Fil:** `src/components/Toolbar.tsx` — sjekk hvilken klasse "Logg inn"-knappen bruker. Sannsynligvis `.toolbar__btn--save` (som allerede er indigo) eller en egen klasse.

**Fix:** Endre knappen til å bruke `.toolbar__btn--save`-klassen (som allerede er indigo #4F46E5), eller lag en dedikert `.toolbar__btn--login`-klasse med indigo-farger. Eventuelt bruk en mer subtil stil — sekundær-knapp i stedet for primær — siden innlogging ikke er hovedhandlingen.

**Verifisering:** "Logg inn med GitHub" vises i indigo (eller nøytral), ikke grønn.

---

## Fix #8: Demo-data bruker ny fargepalett

**Problem:** `DEMO_DATA` i App.tsx bruker hardkodede farger fra den gamle paletten (#3B82F6, #F59E0B, #10B981, #EF4444, #8B5CF6, #EC4899, #06B6D4, #F97316). Den nye "Warm Studio"-paletten har dempede dusty-varianter.

**Fil:** `src/App.tsx` — `DEMO_DATA` const

**Fix:** Erstatt fargene i demo-blokkene med de tilsvarende fra `PALETTE` i constants.ts:

| Gammel | Ny (PALETTE) |
|--------|-------------|
| #3B82F6 | #6B8ADB |
| #10B981 | #5BA88C |
| #F59E0B | #D4A853 |
| #EF4444 | #C96B6B |
| #8B5CF6 | #8B7BC7 |
| #EC4899 | #C4789A |
| #06B6D4 | #6B9EC7 |
| #F97316 | #D4885A |

**Verifisering:** Last appen uten token → demo-blokker vises med dempede, varme farger.

---

## Fix #9: X-knapp i dialog-header

**Problem:** Dialoger kan kun lukkes med "Avbryt"-knapp i footer eller Escape-tast. Det er ingen X-knapp i headeren. Brukere forventer en X øverst til høyre.

**Filer:** `src/components/BlockDialog.tsx`, `src/components/MilestoneDialog.tsx`, `src/components/UnavailableDialog.tsx`, `src/components/Dialogs.css`

**Fix:** Legg til en lukkeknapp i `dialog__header` i alle tre dialog-komponenter:

```tsx
<div className="dialog__header">
  <h2 className="dialog__title">{title}</h2>
  <button type="button" className="dialog__close" onClick={onClose} aria-label="Lukk">
    ×
  </button>
</div>
```

CSS (i Dialogs.css):
```css
.dialog__close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: transparent;
  color: var(--tl-text-light, #a8a29e);
  font-size: 20px;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s ease, color 0.12s ease;
  padding: 0;
  line-height: 1;
}

.dialog__close:hover {
  background: #EDEAE5;
  color: #1c1917;
}

.dialog__close:focus-visible {
  outline: 2px solid #4F46E5;
  outline-offset: 2px;
}
```

**Verifisering:** Åpne en dialog → X-knapp synlig øverst til høyre → klikk → dialog lukkes.

---

## Suksesskriterier (Playwright-verifiserbare)

Hver fix verifiseres med Playwright i nettleseren:

| # | Test | Forventet resultat |
|---|------|--------------------|
| 1 | Scroll til uke 14 → zoom til "Detalj" | Uke 14 fortsatt synlig |
| 2 | Klikk "Presentasjon" | Timeline viser mars 2026 med blokker, ikke tomme uker |
| 3 | Høyreklikk blokk | Kun kontekstmeny vises, ingen tooltip |
| 4 | Hover blokk → les tooltip | "Status: Aktiv" (ikke "active") |
| 5 | Hover blokk → les datoer | "15. mars 2026" (ikke "2026-03-15") |
| 6 | Zoom til "Kompakt" | Milepæl-titler avkortes, overlapper ikke |
| 7 | Se "Logg inn"-knapp | Indigo/nøytral, ikke grønn |
| 8 | Last appen uten token | Demo-blokker i dempede dusty-farger |
| 9 | Åpne dialog → se header | X-knapp synlig øverst til høyre |

---

---

## Del 2: Interaksjonstest med Playwright

Etter at alle visuelle fixes er implementert, kjør disse Playwright-testene for å verifisere at alt fungerer end-to-end. Bruk `browser_run_code` for komplekse interaksjoner.

### Test 1: Opprett ny blokk via dialog

```
1. Klikk "+ Ny" → "Ny blokk"
2. Fyll inn: Tittel="Test-prosjekt", Person=Fredrik, Status=Aktiv
3. Sett Fra=2026-04-01, Til=2026-04-30, Prosent=60
4. Velg en farge fra paletten
5. Klikk "Bruk"
6. VERIFISER: Blokk "Test-prosjekt" vises i Fredriks swimlane
7. VERIFISER: Kapasitetsbar oppdateres for april-ukene
8. VERIFISER: Legenden nederst inkluderer "Test-prosjekt"
9. SCREENSHOT: Ta bilde av resultatet
```

### Test 2: Rediger blokk via dialog

```
1. Klikk på "Test-prosjekt"-blokken
2. VERIFISER: Dialog åpnes med riktige verdier forhåndsutfylt
3. Endre tittel til "Test-prosjekt (oppdatert)"
4. Endre prosent til 80
5. Klikk "Bruk"
6. VERIFISER: Blokken viser ny tittel og "80%"
7. VERIFISER: "Sist endret" i dialog viser "akkurat nå" eller "1 min siden"
```

### Test 3: Slett blokk via dialog

```
1. Klikk på "Test-prosjekt (oppdatert)"-blokken
2. Klikk "Slett"
3. VERIFISER: Knappen endres til "Ja, slett" med bekreftelsestekst
4. Klikk "Ja, slett"
5. VERIFISER: Blokken forsvinner fra swimlane
6. VERIFISER: Kapasitetsbar oppdateres (april-verdier redusert)
```

### Test 4: Undo/Redo

```
1. Etter Test 3 (blokk slettet):
2. Trykk Ctrl+Z (eller klikk "Angre")
3. VERIFISER: Blokken dukker opp igjen
4. VERIFISER: "Angre"-knapp er nå disabled eller "Gjenta" er enabled
5. Trykk Ctrl+Shift+Z (eller klikk "Gjenta")
6. VERIFISER: Blokken forsvinner igjen
```

### Test 5: Drag-and-drop (flytt blokk)

```
Bruk browser_run_code med pointer events:

async (page) => {
  // Finn en blokk
  const block = page.getByRole('button', { name: /Inntaksmodul/ });
  const box = await block.boundingBox();

  // Simuler pointer drag — flytt 80px til høyre (ca. 1 uke)
  await block.dispatchEvent('pointerdown', {
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2,
    button: 0,
    pointerId: 1,
    pointerType: 'mouse'
  });

  // Flytt forbi threshold (>4px) og til ny posisjon
  for (let i = 0; i <= 80; i += 10) {
    await page.mouse.move(box.x + box.width / 2 + i, box.y + box.height / 2);
    await page.waitForTimeout(16);
  }

  await page.mouse.up();
  await page.waitForTimeout(200);
}

VERIFISER: Blokken har flyttet seg ca. 1 uke til høyre
VERIFISER: Tooltip viser oppdaterte datoer
VERIFISER: "Angre"-knappen er aktiv (drag ble registrert som endring)
```

### Test 6: Opprett milepæl

```
1. Klikk "+ Ny" → "Ny milepæl"
2. Fyll inn: Tittel="Test-milepæl", Dato=2026-05-01
3. Klikk "Bruk"
4. VERIFISER: Diamant-ikon ◆ vises i milepæl-raden ved uke 18
5. Klikk på milepælen
6. VERIFISER: Dialog åpnes med riktige verdier
```

### Test 7: Opprett fravær

```
1. Klikk "+ Ny" → "Nytt fravær"
2. Fyll inn: Person=Simen, Fra=2026-05-19, Til=2026-05-23, Label="Kurs"
3. Klikk "Bruk"
4. VERIFISER: Skravert felt vises i Simens swimlane for uke 21
5. VERIFISER: Label "Kurs" vises i feltet
```

### Test 8: Kontekstmeny — dupliser og slett

```
1. Høyreklikk på "MetisVerse"-blokken
2. VERIFISER: Kontekstmeny med "Rediger", "Dupliser", "Slett"
3. Klikk "Dupliser"
4. VERIFISER: Ny blokk "MetisVerse (kopi)" vises i Simens swimlane
5. Høyreklikk den nye blokken → "Slett"
6. VERIFISER: Bekreftelsesdialog vises
7. Godta sletting
8. VERIFISER: Kopien forsvinner
```

### Test 9: Zoom — alle 5 nivåer

```
For hvert nivå (0=Kompakt, 1=Smal, 2=Normal, 3=Bred, 4=Detalj):
1. Sett zoom-slider til nivå
2. SCREENSHOT: Ta bilde
3. VERIFISER: Blokker vises korrekt (ingen overlapp, lesbar tekst)
4. VERIFISER: Kapasitetsbar-pills er synlige
5. VERIFISER: Ukenumre er lesbare i header
```

### Test 10: Tastatur-shortcuts

```
1. Klikk på en blokk for å velge den
2. VERIFISER: Blokk får indigo outline (selected state)
3. Trykk Delete
4. VERIFISER: Bekreftelsesdialog vises (window.confirm)
5. Avslå slettingen
6. VERIFISER: Blokken er fortsatt der
7. Trykk Escape
8. VERIFISER: Eventuell åpen dialog lukkes
9. Trykk Ctrl+S
10. VERIFISER: Token-prompt vises (hvis ingen token)
```

### Test 11: "I dag"-knapp

```
1. Scroll tidslinjen langt til venstre (desember 2025)
2. Klikk "I dag"
3. VERIFISER: Timeline scroller smooth til mars 2026
4. VERIFISER: "I DAG"-markøren blinker (flash-animasjon)
```

### Test 12: Presentasjonsmodus etter fix

```
1. Klikk "Presentasjon"
2. VERIFISER: Dashboard vises med store prosent-tall
3. VERIFISER: Timeline viser dagens dato (ikke tomme uker)
4. VERIFISER: Toolbar er skjult
5. VERIFISER: "Avslutt presentasjon"-knapp synlig
6. Klikk "Avslutt presentasjon"
7. VERIFISER: Normal visning gjenopprettet
```

---

## Regler

- **ALLTID** bygg etter endringer: `fnm use 22 && npm run build`
- **ALLTID** verifiser visuelt med Playwright screenshot etter fix
- **ALLTID** sjekk `browser_console_messages` for errors etter interaksjoner
- **IKKE** endre datamodell, arkitektur, eller legg til dependencies
- Bruk norsk i UI, engelsk i kode
- Commit etter hver logisk batch
