# Metis Kapasitetskalender — Design Spec

## Problem

Fredrik og Simen er to utviklere i Metis Utdanning som jobber for to skoler (BPG, MVS) pluss en kommersiell avdeling. De blir dratt i mange retninger og trenger en visuell oversikt som tydelig viser: "dette bruker vi tiden på frem til sommeren/jul — vil du ha noe inn, pek på hva som skal ut."

Verktøyet skal fungere som et **kapasitetsargument** overfor styret/skolene, og som et daglig planleggingsverktøy for teamet.

## Krav

### Must have
- Visuell tidslinje med uke-kolonner gruppert under måneder
- To swimlanes (Fredrik og Simen) synlige samtidig
- Fargede blokker som representerer prosjekter/oppgaver
- Blokker har: tittel, person, start/slutt-dato, prosent-allokering, farge, beskrivelse, lenker
- Dag som minste enhet, uke som primær visningsenhet
- Dra blokker sideveis for å flytte i tid
- Dra i kant for å endre varighet
- Klikk for å redigere prosent, tittel, beskrivelse, lenker
- "Ny blokk"-dialog for å legge til blokker
- Milepæler som markører på tidslinjen
- Advarsel ved overbooking (>100% i en uke)
- Fast fargepalett (~10-12 farger)
- Data lagret som JSON i GitHub-repo
- Hostet på GitHub Pages (krever GitHub Team for private repos — alternativt Cloudflare Pages som er gratis)
- Ingen backend, ingen database, ingen server

### Nice to have (fase 2)
- Kobling til GitHub Milestones med live completion-prosent
- Eksport/print-vennlig visning for styremøter

### Eksplisitt utenfor scope
- Brukeradmin/roller
- Notifikasjoner
- Tidsregistrering
- Avhengigheter mellom blokker
- Rapportering utover det visuelle
- Kategorisystem (farger er frie, ikke knyttet til kategorier)

## Arkitektur

### Stack
- **React 18+ / TypeScript / Vite** — samme stack som MetisVerse, kjent for teamet
- **GitHub Pages** — gratis hosting, null drift
- **GitHub API** — lese/skrive `data.json` via REST API
- **Auth** — GitHub Personal Access Token lagret i localStorage

### Datamodell

Én fil: `data.json` i repo-root.

```json
{
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
      "description": "Payload CMS kursmateriale-plattform",
      "links": ["https://github.com/Metis-Utdanning/metis-privatistkurs"]
    }
  ],
  "milestones": [
    {
      "id": "ms-1",
      "title": "Privatistportal MVP",
      "date": "2026-04-10",
      "description": "Første kursinnhold tilgjengelig"
    }
  ],
  "palette": [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
    "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
    "#14B8A6", "#A855F7"
  ]
}
```

Felter per blokk:
| Felt | Type | Påkrevd | Beskrivelse |
|------|------|---------|-------------|
| id | string (uuid) | ja | Unik ID |
| title | string | ja | Prosjektnavn |
| person | string | ja | Referanse til people.id |
| startDate | string (YYYY-MM-DD) | ja | Startdato |
| endDate | string (YYYY-MM-DD) | ja | Sluttdato |
| percent | number (1-100) | ja | Prosent av kapasitet |
| color | string (hex) | ja | Farge fra palett |
| description | string | nei | Fritekst |
| links | string[] | nei | URLer (GitHub-repos, issues, etc.) |

Felter per milepæl:
| Felt | Type | Påkrevd | Beskrivelse |
|------|------|---------|-------------|
| id | string (uuid) | ja | Unik ID |
| title | string | ja | Navn |
| date | string (YYYY-MM-DD) | ja | Dato |
| description | string | nei | Fritekst |

### Lagring

- All data i én `data.json`-fil i repo
- Leses ved app-start via GitHub API (`GET /repos/{owner}/{repo}/contents/data.json`)
- Skrives tilbake via GitHub API (`PUT /repos/{owner}/{repo}/contents/data.json`) med commit-melding
- Eksplisitt "Lagre"-knapp (ikke autosave) for å unngå støy i git-historikk
- SHA fra forrige lesing sendes med for å unngå konflikter
- Full historikk i git — kan alltid rulle tilbake via GitHub

### Konflikthåndtering

Hvis to brukere redigerer samtidig og PUT returnerer 409 (SHA mismatch):
- Appen viser dialog: "Data ble endret av noen andre. Last inn på nytt og gjør endringene dine på nytt."
- Brukerens ulagrede endringer vises som påminnelse i dialogen
- Reload-knapp henter fersk data fra GitHub

### Tom tilstand / førstegangsoppsett

Hvis `data.json` ikke finnes i repoet, oppretter appen den med default-struktur (to personer, tom blokk-liste, standard palett) ved første lagring. Tom tilstand viser tidslinje-griddet med en prompt: "Opprett din første blokk."

### Auth

- Ved første besøk: bruker limer inn en fine-grained GitHub PAT scopet til kun dette repoet med "Contents: Read and write"
- Token lagres i localStorage
- Tokenet brukes for alle GitHub API-kall
- Ingen OAuth-app nødvendig (to brukere, internt verktøy)

## UI-design

### Visning 1: Oversikt (default)

Tidslinjen starter på mandagen i inneværende uke og strekker seg 6 måneder frem som default. Forbi-uker er tilgjengelige ved å scrolle til venstre. Griddet utvides automatisk til den lengste blokkens sluttdato + 4 uker. Horisontalt scrollbar.

```
         Mars              April              Mai
     u12  u13  u14     u15  u16  u17  u18  u19  u20  u21
┌──────────────────────────────────────────────────────────┐
│ Fredrik                                                  │
│ ████████████████████  Privatistportal 80%                │
│ ██  ██  ██  ██  ██   Inntak 20%                         │
│                       ████████████  Studentportal 60%    │
├──────────────────────────────────────────────────────────┤
│ Simen                                                    │
│ ██  ██  ██  ██  ██  ██  ██  ██  IT-drift 20% (fast)    │
│ ████████████████████  MetisVerse 60%                     │
│                       ████████  Teams Edu 40%            │
└──────────────────────────────────────────────────────────┘
                  ◆ MVP                    ◆ Lansering
```

- Måneder som gruppe-overskrifter
- Ukenummer som kolonner
- Blokkhøyde proporsjonal med prosent — swimlane har en referansehøyde for 100%, blokker stacker vertikalt. Ved overbooking vokser swimlanen.
- Milepæler er globale (ikke per person) og rendres under alle swimlanes
- "I dag"-markør (vertikal linje)
- Klikk på en uke → åpner ukedetalj

### Visning 2: Ukedetalj

Zoomer inn på én uke (eller noen få uker) med dag-kolonner.

```
              Uke 14 (31. mars – 4. april)
         Man       Tir       Ons       Tor       Fre
┌─────────────────────────────────────────────────────┐
│ Fredrik                                             │
│ ██████████████████████████████████████████  80%     │
│ Privatistportal                                     │
│ ████████  20% Inntak-frontend                       │
├─────────────────────────────────────────────────────┤
│ Simen                                               │
│ ████████████████████████████████  60%               │
│ MetisVerse moduler                                  │
│ ████████████████  20% IT-drift                      │
│ ████████  20% HubSpot sync                          │
└─────────────────────────────────────────────────────┘
```

- Samme layout som oversikt, men med dagkolonner
- Enklere å se nøyaktig hva som skjer den uken
- Tilbake-knapp til oversiktsvisningen

### Interaksjoner

| Handling | Trigger |
|----------|---------|
| Ny blokk | Klikk "+" knapp eller dobbeltklikk på tom plass |
| Rediger blokk | Klikk på blokk → sidepanel/dialog |
| Flytt blokk | Dra sideveis på tidslinjen |
| Endre varighet | Dra i venstre/høyre kant av blokk |
| Slett blokk | Klikk blokk → slett-knapp i dialog |
| Ny milepæl | Klikk "◆+" knapp |
| Lagre | Klikk "Lagre"-knapp → commit alle ulagrede endringer til GitHub. Dialog-"Lagre" lagrer kun lokalt i minnet. Ulagrede endringer indikeres visuelt (badge/prikk på lagre-knappen). |
| Zoom inn | Klikk på uke i oversikt → ukedetalj |
| Zoom ut | Tilbake-knapp i ukedetalj |
| Naviger | Scroll horisontalt eller piltaster |
| Gå til i dag | "I dag"-knapp |

### Overbooking-advarsel

Når en persons blokker summerer til >100% i en gitt uke:
- Uken får rød bakgrunn/ramme i den personens rad
- Tooltip viser "Overbooket: 120% (uke 14)"

### Dialog: Ny/rediger blokk

```
┌─ Ny blokk ──────────────────────────┐
│ Tittel:    [Privatistportal       ] │
│ Person:    [Fredrik ▼]              │
│ Fra:       [2026-03-16]             │
│ Til:       [2026-04-10]             │
│ Prosent:   [80] %                   │
│ Farge:     ● ● ● ● ● ● ● ● ● ●   │
│ Beskrivelse: [                    ] │
│ Lenker:    [+ Legg til lenke]       │
│                                     │
│         [Slett]    [Avbryt] [Lagre] │
└─────────────────────────────────────┘
```

## Tekniske valg

### Drag-and-drop
Bruk en lettvekts drag-bibliotek som `@dnd-kit/core` (lite, fleksibelt, React-native). Alternativt native HTML drag-and-drop for resize.

### Datoberegning
`date-fns` for ukenummer, dag-iterasjon, formatering. Lett bibliotek, tree-shakeable.

### Unik ID
`crypto.randomUUID()` — innebygd i alle moderne nettlesere.

### CSS
Tailwind CSS eller ren CSS — hold det enkelt. Appen har i praksis to visninger og en dialog.

### Responsive
Ikke prioritert — dette er et desktop-verktøy for to utviklere. Minimum 1280px bredde.

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
