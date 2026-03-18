# Prompt: Ferdigstill Metis Kapasitetskalender til produksjonskvalitet

> Bruk dette promptet i Claude Code for å ta appen fra "fungerende prototype" til "polert produkt klar for daglig bruk".

---

## Kontekst

Du jobber med Metis Kapasitetskalender — en React+TS+Vite Gantt-lignende kapasitetsplanlegger for to personer (Fredrik og Simen) i Metis Utdanning. Appen er hostet på GitHub Pages (metis-utdanning.github.io/metis-prosjektstyring/), lagrer data i `data.json` via GitHub API, og brukes i styremøter for å argumentere kapasitet.

Repoet er `metis-prosjektstyring`. Kodebasen har: React 19, TypeScript, Vite 8, date-fns, native pointer events for drag, Sora + Fira Code fonter, "Refined Stone" dark-header design.

---

## Prompt

```
Du er en senior frontend-utvikler og UX-designer. Din oppgave er å ferdigstille Metis Kapasitetskalender til et nivå hvor det kan presenteres for styret uten forbehold — et produkt som ser ut som det koster penger.

Les HELE kodebasen først (src/, alle komponenter, hooks, utils, CSS). Forstå arkitekturen før du gjør noe.

### 1. INTERAKSJONSPOLISH

Appen har drag-and-drop (flytt + resize blokker), men det mangler finpuss:

- [ ] **Sticky swimlane-labels**: Når brukeren scroller horisontalt, skal "Fredrik"/"Simen"-kolonnene forbli synlige (position: sticky + z-index). Krever refaktorering av layout slik at label-kolonnen er sticky innenfor scroll-containeren.
- [ ] **Sticky timeline-header**: Måneds- og ukeradene skal forbli synlige ved vertikal scrolling (position: sticky; top: 0).
- [ ] **Smooth scroll-to-today**: "I dag"-knappen scroller til dagens dato med smooth animation og en kort "flash" på today-markøren.
- [ ] **Keyboard navigation mellom blokker**: Tab/Shift+Tab for å navigere mellom blokker, Enter for å åpne dialog.
- [ ] **Blokkvelging**: Klikk på blokk markerer den med outline/ring. Delete-tasten sletter valgt blokk (med bekreftelse).
- [ ] **Kontekstmeny (høyreklikk)**: Høyreklikk på blokk → "Rediger", "Dupliser", "Slett". Høyreklikk på tom swimlane → "Ny blokk her".

### 2. VISUELL PERFEKSJON

Designet er allerede "Refined Stone" med mørk toolbar/labels. Gjør det komplett:

- [ ] **Animert block-inngang**: Blokker fader inn med stagger-delay ved første lasting (CSS animation + animation-delay via inline style basert på block-index).
- [ ] **Hover-preview**: Når du holder over en kapasitetsbar-celle, highlight blokkene som bidrar til den uken (dimm andre blokker, gjør relevante lysere).
- [ ] **Drag ghost**: Under drag vises en halvgjennomsiktig "ghost" som følger musepekeren, mens originalblokken forblir dimmed på plass.
- [ ] **Snap-indikator**: Vis en tynn vertikal linje som viser hvor blokken vil snappe til under drag.
- [ ] **Zoom-kontroll**: Toolbar-knapper for å justere ukebredde (smal/normal/bred). Lagre preferansen i localStorage.
- [ ] **Ferie-overlay forbedring**: Vis ferieperioder med en mer synlig indikator — f.eks. en subtil ikonfarge og "Ferie 🏖️"-tekst over hele bredden.
- [ ] **Tomme uker**: Uker uten blokker kan ha et subtilt "ledig"-indikator i kapasitetsbaren (f.eks. prikket outline).

### 3. DATAINTEGRASJON

Appen er klar for ekte data, men mangler noe infrastruktur:

- [ ] **Auto-save med debounce**: Lagre automatisk til GitHub 3 sekunder etter siste endring (med visuell indikator "Lagrer..." → "Lagret ✓"). Behold manuell "Lagre"-knapp som fallback.
- [ ] **Offline-modus**: Vis en banner "Offline — endringer lagres lokalt" når navigator.onLine er false. Sync automatisk når tilkoblingen er tilbake.
- [ ] **Konflikthåndtering UX**: Når en 409-konflikt oppstår, vis en tydelig dialog: "Simen har gjort endringer. Vil du: (1) Beholde dine, (2) Beholde Simens, (3) Se differanse". Differanse-visning er nice-to-have.
- [ ] **Data-validering**: Valider data.json-strukturen ved lasting. Vis feilmelding med "Laster demo-data" fallback ved ugyldig JSON. Ikke bare crashe stille.

### 4. PRESENTASJONSMODUS

Presentasjonsmodus er allerede implementert (skjuler toolbar, øker skrift). Gjør den imponerende:

- [ ] **Fullskjerm**: Presentasjonsmodus trigger browser fullscreen API (document.requestFullscreen).
- [ ] **Stor kapasitetssammendrag**: I presentasjon, vis en stor "dashboard-stil" sammendrag øverst med store prosent-tall per person.
- [ ] **Auto-scroll**: Sakte automatisk horisontal scrolling gjennom tidslinjen (toggle-bar, justérbar hastighet).
- [ ] **"Hva om"-modus**: Midlertidig drag-blokker uten å lagre. Vis "Ulagrede endringer" og "Forkast"-knapp. For å teste scenarioer i styremøte.

### 5. RESPONSIV DESIGN

- [ ] **Touch-support**: Fungerer på iPad for presentasjon (touch-drag, pinch-zoom).
- [ ] **Smal skjerm**: Ved viewport < 768px, vis en forenklet "liste-visning" med blokker stacked vertikalt per person istedenfor tidslinje.
- [ ] **Print-optimalisering**: @media print skal vise hele tidslinjen uten scrolling, med kompakte blokker. Test at det ser bra ut på A4 landscape.

### 6. TILGJENGELIGHET (a11y)

- [ ] **ARIA-roles**: Blokkene bør ha role="button", aria-label med "Privatistportal, Fredrik, 80%, uke 12–17, aktiv".
- [ ] **Screen reader**: Naviger blokker med piltaster, les opp detaljer.
- [ ] **Kontrast**: Verifiser at alle fargekombinasjoner har WCAG AA-kontrast (4.5:1 for tekst). Bruk Chrome DevTools Lighthouse.
- [ ] **Redusert bevegelse**: @media (prefers-reduced-motion) fjerner alle animasjoner.

### 7. TESTING & KVALITET

- [ ] **Vitest unit-tester**: Test alle utils (dates.ts, capacity.ts, github.ts). Minimum 90% dekning.
- [ ] **Vitest component-tester**: Test at BlockDialog validerer input, at CapacityBar beregner riktig, at undo/redo fungerer.
- [ ] **Playwright E2E**: Test full brukerflyt: last side → lag blokk → drag → resize → slett → undo.
- [ ] **Lighthouse audit**: Oppnå 90+ på Performance, Accessibility, Best Practices.
- [ ] **Lint-rens**: Null ESLint-warnings. Kjør `npx eslint src/ --fix`.

### 8. DEPLOY & PRODUKSJON

- [ ] **PWA-support**: Legg til manifest.json og service worker for offline-bruk og "Installer som app"-prompt.
- [ ] **Favicon**: Lag et polert SVG-ikon (kalender med "M" for Metis). Generer apple-touch-icon og diverse størrelser.
- [ ] **Meta-tags**: Open Graph tags for deling (tittel, beskrivelse, bilde). Bra for når noen deler lenken i Teams/Slack.
- [ ] **Error boundary**: React ErrorBoundary som fanger uventede feil og viser "Noe gikk galt — last inn på nytt".
- [ ] **Loading skeleton**: Vis pulserende skeleton-loader mens data hentes fra GitHub istedenfor bare "Laster..."-tekst.

### Rekkefølge

Jobb i denne rekkefølgen:
1. Interaksjonspolish (mest synlig forbedring)
2. Visuell perfeksjon (wow-faktor)
3. Presentasjonsmodus (kritisk for styremøter)
4. Dataintegrasjon (for daglig bruk)
5. Responsiv + a11y (bredere målgruppe)
6. Testing (kvalitetssikring)
7. Deploy/produksjon (finpuss)

### Prinsipper

- IKKE endre eksisterende arkitektur unødvendig. Bygg PÅ det som finnes.
- IKKE legg til avhengigheter med mindre det er en veldig god grunn. Native browser API-er først.
- Hold koden enkel. Én fil per komponent. Ingen over-abstraksjoner.
- Test at drag-and-drop fortsatt fungerer etter hver endring.
- Commit etter hver logisk enhet (ikke alt i én commit).
- Bruk norsk i UI-tekst, engelsk i kode/kommentarer.
```

---

*Generert av Claude Code basert på nåværende tilstand av kapasitetskalenderen per 2026-03-13.*
