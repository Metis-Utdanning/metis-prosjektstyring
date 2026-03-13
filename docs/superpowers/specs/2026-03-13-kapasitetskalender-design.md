# Metis Kapasitetskalender — Design Spec

## Problem

Fredrik og Simen er to utviklere i Metis Utdanning som jobber for to skoler (BPG, MVS) pluss en kommersiell avdeling. De blir dratt i mange retninger og trenger en visuell oversikt som tydelig viser: "dette bruker vi tiden på frem til sommeren/jul — vil du ha noe inn, pek på hva som skal ut."

Verktøyet skal fungere som et **kapasitetsargument** overfor styret/skolene, og som et daglig planleggingsverktøy for teamet.

## Krav

### Must have
- Visuell tidslinje med uke-kolonner gruppert under måneder
- To swimlanes (Fredrik og Simen) synlige samtidig
- Fargede blokker som representerer prosjekter/oppgaver
- Blokker har: tittel, person, start/slutt-dato, prosent-allokering, status, farge, beskrivelse, lenker
- Status per blokk: `planned` (stiplet kant), `active` (solid), `done` (mettet farge + checkmark)
- Dag som minste enhet, uke som primær visningsenhet
- Dra blokker sideveis for å flytte i tid
- Dra i kant for å endre varighet (resize-håndtak 8-12px med `:hover` gripepunkt)
- Klikk for å redigere prosent, tittel, beskrivelse, lenker
- "Ny blokk"-dialog for å legge til blokker — dobbeltklikk prefyller person + dato fra kontekst
- Milepæler som globale markører på tidslinjen (ikke per person)
- Kapasitetsbar per person per uke — farget (grønn ≤80%, gul 80-100%, rød >100%) med prosenttall
- Overbooking-advarsel med detaljer (hvilke blokker som bidrar)
- Ferie/utilgjengelighet — grå/skraverte felt i swimlane med label
- Fast fargepalett (~12 farger, definert i kildekode)
- Undo/redo (Ctrl+Z / Ctrl+Shift+Z) med history-stack
- Presentasjonsmodus — fjerner edit-kontroller, øker fonter, viser legend
- "Denne uken"-oppsummering øverst ved app-start
- Auto-generert fargelegende fra aktive blokker
- Data lagret som JSON i separat GitHub-repo via API
- Hostet på GitHub Pages (public repo, ingenting sensitivt — kan flyttes til egen frontend-droplet senere)
- Leser-modus uten auth (for styret) + redaktør-modus med PAT
- Ingen backend, ingen database, ingen server

### Nice to have (fase 2)
- Kobling til GitHub Milestones med live completion-prosent
- "Hva hvis"-blokker (stiplet, midlertidige) for å simulere konsekvenser
- Inline prosent-redigering direkte på blokk
- Ukentlig notat-felt per uke
- Tastaturnavigasjon (Tab mellom blokker, Delete for slett, Escape for lukk)
- GitHub Action-påminnelse om ukentlig oppdatering

### Eksplisitt utenfor scope
- Brukeradmin/roller
- Notifikasjoner
- Tidsregistrering
- Avhengigheter mellom blokker
- Rapportering utover det visuelle
- Kategorisystem (farger er frie, ikke knyttet til kategorier)
- Responsive/mobil (desktop-verktøy, minimum 1280px)

## Arkitektur

### Stack
- **React 18+ / TypeScript / Vite**
- **GitHub Pages** — public repo, gratis, null config. Kan flyttes til egen DO frontend-droplet senere.
- **GitHub API** — lese/skrive `data.json` via REST API
- **Native pointer events** for drag-and-drop + resize (~150 linjer, null deps)
- **date-fns** for ISO-uker, datoberegning
- **Én CSS-fil** med CSS custom properties — ingen Tailwind, ingen CSS-in-JS

### Repo-struktur: Data separert fra kode

To repos for å unngå at data-commits trigger re-deploy og søpler git-historikk:
- **`metis-prosjektstyring`** — kildekode, hostet på Cloudflare Pages
- **`metis-kapasitetsdata`** (privat) — kun `data.json`, commits = lagrehistorikk

### Datamodell

Én fil: `data.json` i `metis-kapasitetsdata`-repoet.

```json
{
  "version": 1,
  "people": [
    { "id": "fredrik", "name": "Fredrik" },
    { "id": "simen", "name": "Simen" }
  ],
  "blocks": [
    {
      "id": "uuid-1",
      "title": "Privatistportal",
      "person": "fredrik",
      "startDate": "2026-03-16",
      "endDate": "2026-04-10",
      "percent": 80,
      "color": "#3B82F6",
      "status": "active",
      "description": "Payload CMS kursmateriale-plattform",
      "links": ["https://github.com/Metis-Utdanning/metis-privatistkurs"],
      "updatedAt": "2026-03-13T10:00:00Z",
      "updatedBy": "fredrik"
    }
  ],
  "unavailable": [
    {
      "id": "ferie-1",
      "person": "fredrik",
      "startDate": "2026-06-29",
      "endDate": "2026-07-24",
      "label": "Ferie"
    }
  ],
  "milestones": [
    {
      "id": "ms-1",
      "title": "Privatistportal MVP",
      "date": "2026-04-10",
      "description": "Første kursinnhold tilgjengelig"
    }
  ]
}
```

Fargepalett defineres i kildekoden (konstant), ikke i data.json:
```typescript
export const PALETTE = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
  "#14B8A6", "#A855F7"
];
```

Felter per blokk:
| Felt | Type | Påkrevd | Beskrivelse |
|------|------|---------|-------------|
| id | string (uuid) | ja | Unik ID |
| title | string | ja | Prosjektnavn, rendres INNE i blokken med overflow ellipsis |
| person | string | ja | Referanse til people.id |
| startDate | string (YYYY-MM-DD) | ja | Startdato |
| endDate | string (YYYY-MM-DD) | ja | Sluttdato |
| percent | number (1-100) | ja | Prosent av kapasitet |
| color | string (hex) | ja | Farge fra palett |
| status | string | ja | `planned`, `active`, eller `done` |
| description | string | nei | Fritekst |
| links | string[] | nei | URLer (GitHub-repos, issues, etc.) |
| updatedAt | string (ISO 8601) | ja | Auto-satt ved lagring |
| updatedBy | string | ja | person-id som sist endret |

Felter per utilgjengelighet:
| Felt | Type | Påkrevd | Beskrivelse |
|------|------|---------|-------------|
| id | string (uuid) | ja | Unik ID |
| person | string | ja | Referanse til people.id |
| startDate | string (YYYY-MM-DD) | ja | Startdato |
| endDate | string (YYYY-MM-DD) | ja | Sluttdato |
| label | string | ja | F.eks. "Ferie", "Kurs", "Permisjon" |

Felter per milepæl:
| Felt | Type | Påkrevd | Beskrivelse |
|------|------|---------|-------------|
| id | string (uuid) | ja | Unik ID |
| title | string | ja | Navn |
| date | string (YYYY-MM-DD) | ja | Dato |
| description | string | nei | Fritekst |

### Lagring

- All data i én `data.json`-fil i separat repo (`metis-kapasitetsdata`)
- Leses ved app-start via GitHub API (`GET /repos/Metis-Utdanning/metis-kapasitetsdata/contents/data.json`)
- Leser-modus: bruker raw.githubusercontent.com (ingen auth nødvendig for public, eller hardkodet token for privat)
- Skrives tilbake via GitHub API (`PUT`) med commit-melding
- Eksplisitt "Lagre til GitHub"-knapp (ikke autosave)
- Dialog-knappen heter "Bruk" (ikke "Lagre") — lagrer kun i lokal state
- Ulagrede endringer indikeres med teller: "3 ulagrede endringer"
- SHA fra forrige lesing sendes med for å unngå konflikter
- `beforeunload`-handler advarer ved ulagrede endringer
- Siste kjente data caches i localStorage som fallback ved nettverksfeil
- Full historikk i git — kan alltid rulle tilbake via GitHub

### Konflikthåndtering

Ved 409 (SHA mismatch) — UUID-basert auto-merge:
1. Hent fersk data fra GitHub
2. Sammenlign blokker basert på UUID: identifiser nye, slettede og endrede
3. Hvis endringer er på *forskjellige blokker*: auto-merge og lagre
4. Hvis konflikt på *samme blokk*: vis dialog for manuell valg
5. Fallback: vis brukerens endringer med "Kopier til utklippstavle"-knapp

### Auth

- **Leser-modus** (default): Ingen auth. Data hentes via offentlig URL eller hardkodet read-token.
- **Redaktør-modus**: Klikk "Rediger" → lim inn fine-grained GitHub PAT scopet til `metis-kapasitetsdata` med "Contents: Read and write"
- Token lagres i **sessionStorage** (ikke localStorage — mildner XSS-risiko)
- Content Security Policy-headere begrenser scripts
- Ingen OAuth-app nødvendig (to brukere, internt verktøy)

### Feilhåndtering

- **Lagring feiler**: Tydelig feilmelding, endringer bevares i minnet + localStorage-cache
- **Innlasting feiler**: Vis siste cachede data fra localStorage med "Jobber offline"-indikator
- **Token utløpt/ugyldig**: Tydelig "Token utløpt — lim inn ny"-melding, ikke stille feil
- **Ingen auto-retry** — manuell retry er tilstrekkelig for 2 brukere

## UI-design

### "Denne uken"-oppsummering (toppen av appen)

```
┌─────────────────────────────────────────────────────────┐
│  Denne uken (uke 12)                     [Rediger] [⟳]  │
│                                                          │
│  Fredrik: Privatistportal 80% + Inntak 20%    = 100% 🟢 │
│  Simen:   MetisVerse 60% + IT-drift 20%      = 80%  🟢 │
└─────────────────────────────────────────────────────────┘
```

Vises alltid øverst. Gir umiddelbar verdi på 2 sekunder uten å lese tidslinjen.

### Visning 1: Oversikt (default)

Tidslinjen starter på mandagen i inneværende uke og strekker seg 6 måneder frem som default. Forbi-uker tilgjengelige ved å scrolle til venstre. Griddet utvides til lengste blokkens sluttdato + 4 uker.

```
           Mars              April              Mai
       u12  u13  u14     u15  u16  u17  u18  u19  u20  u21
┌────────────────────────────────────────────────────────────┐
│ Fredrik                                                    │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  Privatistportal 80%              │
│ ░░  ░░  ░░  ░░  ░░     Inntak 20%                        │
│ ░░░░░░░░░░░░░░░░░░░░░░ ▒▒▒▒▒▒▒▒▒▒▒▒  Studentportal 60% │
│ ┄┄┄┄┄┄┄┄  Security 40% (planned)                         │
│─────────────────────────────────────────────────── 100%  🟢│
│                                                     80%  🟢│
├────────────────────────────────────────────────────────────┤
│ Simen                                                      │
│ ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  IT-drift 20%            │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  MetisVerse 60%                    │
│                         ▒▒▒▒▒▒▒▒  Teams Edu 40%           │
│──────────────────────────────────────────────────── 80%  🟢│
│                                                    100%  🟡│
├────────────────────────────────────────────────────────────┤
│ ◆ MVP                              ◆ Lansering            │
├────────────────────────────────────────────────────────────┤
│ ● Privatistportal  ● MetisVerse  ● IT-drift  ● Inntak    │
│ ● Studentportal    ● Teams Edu   ┄ Security (planlagt)    │
└────────────────────────────────────────────────────────────┘
```

- Måneder som gruppe-overskrifter
- Ukenummer som kolonner (standard bredde: 80px, min: 60px)
- Alle posisjoner beregnes fra dager (`dateToPixelOffset(date, timelineStart, dayWidth)`), uke-headers er visuell dekor
- Blokktittel + prosent rendres INNE i blokken med `overflow: hidden; text-overflow: ellipsis`
- Blokker under minimumsbredde viser kun initial + farge, tooltip med full info
- Blokkhøyde proporsjonal med prosent — swimlane har referansehøyde for 100%, vokser ved overbooking
- Kapasitetsbar under hver swimlane: farget linje med prosent per uke
- Ferie/utilgjengelighet: grå skravert felt over hele swimlane-bredden
- Milepæler under swimlanes
- "I dag"-markør (vertikal linje) i begge visninger
- Fargelegende auto-generert nederst
- Klikk på en uke → åpner ukedetalj

### Visning 2: Ukedetalj

Zoomer inn på én uke med dag-kolonner.

```
              Uke 14 (31. mars – 4. april)
         Man       Tir       Ons       Tor       Fre
┌─────────────────────────────────────────────────────┐
│ Fredrik                                    = 100% 🟢│
│ ██████████████████████████████████████████  80%     │
│ Privatistportal                                     │
│ ████████  20% Inntak-frontend                       │
├─────────────────────────────────────────────────────┤
│ Simen                                      = 80%  🟢│
│ ████████████████████████████████  60%               │
│ MetisVerse moduler                                  │
│ ████████████████  20% IT-drift                      │
└─────────────────────────────────────────────────────┘
│ [← Tilbake til oversikt]                            │
```

- Dag-kolonner (man-fre)
- "I dag"-markør med dato-label
- Kapasitetsoppsummering per person
- Tilbake-knapp til oversikt

### Presentasjonsmodus

Aktiveres via knapp i toolbar eller URL-parameter `?mode=present`:
- Fjerner alle edit-kontroller (+, Lagre, Rediger)
- Øker fontstørrelse og blokkstørrelse
- Viser fargelegende mer prominent
- Kapasitetsbar alltid synlig og tydelig
- Ren layout optimalisert for projeksjon
- `@media print`-regler for utskrift til PDF

### Interaksjoner

| Handling | Trigger |
|----------|---------|
| Ny blokk | Klikk "+" eller dobbeltklikk på tom plass (prefyller person + dato fra kontekst) |
| Rediger blokk | Klikk på blokk → dialog |
| Flytt blokk | Dra sideveis (4px threshold for å skille fra klikk). Snapper til uker i oversikt, dager i ukedetalj. Halvgjennomsiktig kopi + stiplet drop-sone. |
| Endre varighet | Dra i kant (resize-håndtak 8-12px, `cursor: ew-resize`, synlig på hover) |
| Endre status | I blokk-dialog: velg planned/active/done |
| Slett blokk | Klikk blokk → slett-knapp i dialog |
| Ny milepæl | Klikk "◆+" knapp |
| Ny utilgjengelighet | Klikk "Ferie+"-knapp |
| Bruk endring | Dialog-knapp "Bruk" → lagrer kun i lokal state |
| Lagre til GitHub | Toolbar-knapp "Lagre til GitHub" → committer alle endringer |
| Undo/Redo | Ctrl+Z / Ctrl+Shift+Z (history-stack, maks 50 steg) |
| Zoom inn | Klikk uke → ukedetalj |
| Zoom ut | Tilbake-knapp |
| Naviger | Scroll horisontalt eller piltaster |
| Gå til i dag | "I dag"-knapp |
| Presentasjonsmodus | Toggle-knapp i toolbar |

### Overbooking-advarsel

Kapasitetsbar under swimlane viser total per uke:
- ≤80%: grønn
- 80-100%: gul
- >100%: rød

Tooltip viser detaljert breakdown: "Privatistportal 80% + Inntak 20% + HubSpot 40% = 140%"

### Dialog: Ny/rediger blokk

```
┌─ Ny blokk ──────────────────────────┐
│ Tittel:    [Privatistportal       ] │
│ Person:    [Fredrik ▼]              │
│ Status:    [● Active ▼]            │
│ Fra:       [2026-03-16]             │
│ Til:       [2026-04-10]             │
│ Prosent:   [80] %                   │
│ Farge:     ● ● ● ● ● ● ● ● ● ●   │
│            ● ●                      │
│ Beskrivelse: [                    ] │
│ Lenker:    [+ Legg til lenke]       │
│                                     │
│ Sist endret: Fredrik, 2 timer siden │
│         [Slett]    [Avbryt] [Bruk]  │
└─────────────────────────────────────┘
```

## Tekniske valg

### Drag-and-drop: Native pointer events

Ingen bibliotek. Én unified modell for flytt og resize med `pointerdown`/`pointermove`/`pointerup`:
- `DragMode`: `'move' | 'resize-start' | 'resize-end'`
- 4px threshold via pointer distance for å skille klikk fra drag
- Under drag: CSS transform for visuell feedback (aldri setState på pointermove)
- Ved pointerup: commit til React state
- Snapping: uker i oversikt, dager i ukedetalj

### State management

Enkel React state med undoable history-stack:
```typescript
function useUndoableState<T>(initial: T) {
  // history-array + index, undo/redo, canUndo/canRedo
  // ~20 linjer, maks 50 steg
}
```

Ingen Zustand/Redux. `beforeunload`-handler for ulagrede endringer. localStorage-cache av siste kjente data.

### Datoberegning

`date-fns` med ISO-uker (`getISOWeek`, `startOfISOWeek`). Alle posisjoner beregnes fra en `dateToPixelOffset(date, timelineStart, dayWidth)`-funksjon — ukekolonner er kun visuell dekor.

Ingen helligdags-logikk i MVP — ferier håndteres manuelt via `unavailable`-blokker.

### Unik ID
`crypto.randomUUID()` — innebygd i moderne nettlesere.

### CSS
Én CSS-fil med BEM-navngiving og CSS custom properties for farger/spacing:
```css
.timeline { }
.timeline__grid { }
.block { }
.block--planned { border-style: dashed; opacity: 0.7; }
.block--active { }
.block--done { opacity: 0.8; }
.block--dragging { opacity: 0.5; }
.swimlane { }
.swimlane--overbooked { }
.capacity-bar { }
.capacity-bar--green { }
.capacity-bar--yellow { }
.capacity-bar--red { }
```

### Deploy

GitHub Pages med GitHub Actions:
- Push til main → automatisk build og deploy
- Public repo, ingen plan-krav
- Kan flyttes til egen DO frontend-droplet på sikt

### Sikkerhet

- PAT i sessionStorage (ikke localStorage)
- Content Security Policy via `_headers`
- Fine-grained PAT scopet kun til `metis-kapasitetsdata`
- Leser-modus krever ingen auth

## Fase 2: GitHub Milestones (etter MVP)

Legg til valgfritt felt på milepæler:
```json
{
  "id": "ms-1",
  "title": "Privatistportal MVP",
  "date": "2026-04-10",
  "githubMilestone": "metis-privatistkurs/1"
}
```

Appen henter `GET /repos/Metis-Utdanning/{repo}/milestones/{number}` og viser:
```
◆ Privatistportal MVP — 8/12 issues (67%)
```

Oppdateres ved app-load, ingen polling.
