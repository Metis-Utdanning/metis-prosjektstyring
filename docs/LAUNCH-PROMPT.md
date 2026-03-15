# Prompt: Autonom ferdigstilling av Metis Kapasitetskalender

> **Mål:** Ta appen fra "fungerende prototype" til "100% feilfri, lanserbar app" i en autonom, syklisk utviklingsøkt. Bruk maksimalt med parallelle agenter. Stopp IKKE før alle suksesskriterier er oppfylt.

---

## Kontekst

Du jobber med **Metis Kapasitetskalender** — en React+TS+Vite Gantt-lignende kapasitetsplanlegger for to utviklere (Fredrik og Simen) i Metis Utdanning.

- **Repo:** `/Users/fredrik/Documents/Metis-Utdanning/metis-prosjektstyring/`
- **Live:** `https://metis-utdanning.github.io/metis-prosjektstyring/`
- **Stack:** React 19, TypeScript, Vite 8, date-fns, native pointer events, Sora + Fira Code fonter
- **Design:** "Warm Studio" tema (varmt lyst tema, indigo-aksent, dempede farger)
- **Data:** JSON i GitHub-repo via API, localStorage-cache, offline-støtte
- **Build:** `fnm use 22 && npm run build` (krever Node 22+)
- **Dev:** `fnm use 22 && npm run dev`

Les `docs/superpowers/specs/` for designspecs og `CLAUDE.md` i repoet om det finnes.

---

## Rollebeskrivelse

Du er en **senior frontend-utvikler + UX-designer** som jobber for en krevende kunde. Kunden (Fredrik) forventer:

1. En app som ser ut som den koster penger — ikke et hobbyprosjekt
2. Null synlige bugs, rare kantsaker, eller halvferdige features
3. Sømløs brukeropplevelse som "bare funker" uten å tenke
4. Visuell konsistens i hvert piksel — farger, spacing, typografi, skygger
5. Profesjonell interaksjonsdesign — drag, klikk, tastatur — alt skal føles polert

**Du representerer BÅDE utvikler og QA.** Det er ingen annen å skylde på.

---

## Suksesskriterier (alle MÅ oppfylles)

### A. Funksjonalitet (FEILFRI)

| # | Krav | Verifiseringsmetode |
|---|------|---------------------|
| F1 | Blokker kan opprettes, redigeres og slettes via dialog | Manuell test: opprett → rediger tittel/dato/prosent → slett |
| F2 | Drag-and-drop fungerer uten glitches (flytt + resize) | Test: dra blokk til ny uke, resize start/slutt, verifiser datoer |
| F3 | Undo/redo fungerer for ALLE operasjoner | Test: opprett blokk → undo → redo → slett → undo |
| F4 | Kapasitetsbar viser korrekt prosent per uke per person | Regn manuelt: 80% + 20% = 100% → grønn. Verifiser visuelt |
| F5 | Milepæler kan opprettes, redigeres, slettes | Full CRUD-test |
| F6 | Ferie/utilgjengelighet kan opprettes, redigeres, slettes | Full CRUD-test |
| F7 | Lagring til GitHub fungerer (med token) | Test: gjør endring → lagre → refresh → verifiser data |
| F8 | Lese-modus fungerer uten token | Test: fjern token → refresh → data vises readonly |
| F9 | Offline-modus fanger opp og viser banner | Test: simuler offline i DevTools |
| F10 | Zoom fungerer på alle nivåer (5 steg) | Test alle zoom-nivåer, verifiser at blokker ikke overlapper |
| F11 | "I dag"-knappen scroller til riktig posisjon | Test: scroll bort → klikk "I dag" → verifiser |
| F12 | Kontekstmeny (høyreklikk) fungerer | Test: høyreklikk blokk → dupliser, slett; høyreklikk tom → ny blokk |
| F13 | Presentasjonsmodus viser ren visning uten edit-kontroller | Test: toggle → verifiser ingen edit-knapper |
| F14 | Tastaturshortcuts fungerer (Ctrl+Z, Ctrl+S, Del, Esc) | Test alle shortcuts |
| F15 | Auto-save med debounce fungerer (3s etter endring) | Test: gjør endring → vent → verifiser "Lagret" status |
| F16 | Konflikthåndtering ved 409 viser feilmelding | Test: simuler gammel SHA → verifiser feilmelding |
| F17 | "Denne uken"-oppsummering viser korrekte tall | Verifiser mot blokk-data manuelt |
| F18 | Fargelegende viser alle aktive farger | Verifiser at alle brukte farger er med |
| F19 | Blokk-stacking fungerer korrekt (ingen overlapp i samme swimlane) | Test med 3+ overlappende blokker |
| F20 | Datointervall-validering i dialoger (start < slutt) | Test ugyldig dato-kombinasjon |

### B. Visuelt uttrykk (PIXEL-PERFEKT)

| # | Krav | Verifiseringsmetode |
|---|------|---------------------|
| V1 | Konsistent "Warm Studio" tema gjennom hele appen | Visuell inspeksjon av alle views |
| V2 | Ingen feil-fargede elementer (gammel blå, rå rød, etc.) | Søk kodebase for hardkodede farger utenfor tema |
| V3 | Toolbar, dialoger, timeline har konsistent spacing | Visuell inspeksjon + DevTools |
| V4 | Blokker har korrekt avrunding, skygge og hover-effekt | Test hover, selected, dragging states |
| V5 | Kapasitetsbar-pills er konsistent størrelse og farge | Visuell inspeksjon per uke |
| V6 | Fonter laster korrekt (Sora + Fira Code) | Sjekk at fallback-font ikke vises |
| V7 | Person-avatarer vises med initial og riktig farge | Visuell inspeksjon |
| V8 | Ferie/utilgjengelighet-overlay er visuelt tydelig | Verifiser synlighet mot bakgrunn |
| V9 | "I dag"-markør er synlig og riktig posisjonert | Visuell inspeksjon + datosjekk |
| V10 | Dialoger har korrekt bakgrunn, rammer, fokus-ring | Åpne alle tre dialoger, tab gjennom felt |
| V11 | Skeleton/loading-state matcher tema | Test: tving loading-state |
| V12 | Scrollbar har tema-farger | Visuell inspeksjon |
| V13 | Sticky headers/labels fungerer ved scrolling | Test: scroll horisontalt + vertikalt |
| V14 | Status-indikatorer er tydelige (planned=stiplet, active=solid, done=check) | Lag en blokk per status |
| V15 | Overbooking-indikator (rød) er tydelig og korrekt | Lag blokker som overstiger 100% |

### C. Brukeropplevelse (SØMLØS)

| # | Krav | Verifiseringsmetode |
|---|------|---------------------|
| U1 | Appen laster raskt (<2s til interaktiv) | Lighthouse Performance-måling |
| U2 | Drag føles responsivt (ingen lag, korrekt snap) | Subjektiv test: dra blokker raskt |
| U3 | Dialoger åpner/lukker uten forsinkelse | Klikk blokk → dialog → Esc → klikk annen blokk |
| U4 | Ingen "flash of unstyled content" ved lasting | Observer oppstart i 0.5x throttled CPU |
| U5 | Feilmeldinger er forståelige og handlingsrettede | Test: ugyldig token → les feilmelding |
| U6 | Ulagrede endringer-teller er presis og oppdaterer umiddelbart | Gjør 3 endringer → verifiser teller = 3 |
| U7 | Zoom-endring bevarer viewport-posisjon | Test: zoom på uke 14 → zoomer rundt uke 14 |
| U8 | Duplikat-blokk oppretter korrekt kopi | Test via kontekstmeny |
| U9 | Tab-navigasjon i dialoger følger logisk rekkefølge | Tab gjennom alle felt i BlockDialog |
| U10 | Ingen console.error eller console.warn i normal bruk | Åpne DevTools console → bruk appen i 5 min |

### D. Kodekvalitet

| # | Krav | Verifiseringsmetode |
|---|------|---------------------|
| K1 | `tsc --noEmit` = 0 feil | Kjør kommando |
| K2 | `npm run build` = suksess (Node 22) | Kjør kommando |
| K3 | Ingen ubrukte imports eller variabler | TypeScript strict mode |
| K4 | Ingen `any`-typing i produksjonskode | Søk kodebase |
| K5 | Konsistent kode-stil (ingen blanding av patterns) | Manuell gjennomgang |

---

## Arbeidsmetodikk: Syklisk utvikling med agenter

### Oversikt

```
┌──────────────────────────────────────────────────────────────┐
│                    SYKLISK ARBEIDSFLYT                        │
│                                                              │
│  ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐ │
│  │ ANALYSE  │───→│ UTVIKLING│───→│  REVIEW  │───→│ VURDER │ │
│  └─────────┘    └──────────┘    └──────────┘    └────────┘ │
│       ↑                                              │       │
│       │              ✗ Ikke 100%                     │       │
│       └──────────────────────────────────────────────┘       │
│                          │ ✓ 100%                            │
│                          ↓                                   │
│                    ┌──────────┐                               │
│                    │  FERDIG  │                               │
│                    └──────────┘                               │
└──────────────────────────────────────────────────────────────┘
```

### Fase 0: Oppstart (kun én gang)

1. **Les hele kodebasen** — alle komponenter, hooks, utils, CSS, types
2. **Bygg prosjektet** (`fnm use 22 && npm run build`) — verifiser at det kompilerer
3. **Kategoriser funn** — lag en prioritert liste over alt som må fikses/forbedres
4. **Prioriter:** Bugs > Funksjonelle gap > Visuell polish > Kodekvalitet
5. **Lag en TODO-liste** med alle funn, gruppert i "runder"

### Fase 1-N: Utviklingsrunder (gjenta til ferdig)

Hver runde følger dette mønsteret:

#### Steg 1: ANALYSE (agenter i parallell)

Dispatch **3-5 parallelle agenter** for kontekst-innhenting:

| Agent | Oppgave |
|-------|---------|
| **code-explorer** | Les og forstå komponentene som berøres i denne runden |
| **code-reviewer** | Finn bugs, edge cases, og inkonsistenser i berørte filer |
| **ux-ui-expert** | Vurder visuell kvalitet og UX i nåværende tilstand |
| **debug-tester** | Identifiser spesifikke feil som må fikses |

Basert på agent-resultatene: lag en konkret handlingsplan for denne runden.

#### Steg 2: UTVIKLING (agenter der mulig)

- Fiks bugs og implementer forbedringer fra handlingsplanen
- Bruk **web-developer**-agenter i worktrees for uavhengige oppgaver
- **ALLTID** kjør `fnm use 22 && npm run build` etter endringer
- **ALLTID** test at drag-and-drop fortsatt fungerer etter endringer
- Commit etter hver logisk enhet med beskrivende melding

#### Steg 3: REVIEW (agenter i parallell)

Dispatch **2-3 parallelle agenter**:

| Agent | Oppgave |
|-------|---------|
| **code-reviewer** | Review koden som ble endret — bugs, logikk, kvalitet |
| **ux-ui-expert** | Vurder visuell kvalitet etter endringene |
| **debug-tester** | Test spesifikke scenarier som ble endret |

#### Steg 4: VURDER MÅLOPPNÅELSE

Gå gjennom **alle suksesskriterier** (F1-F20, V1-V15, U1-U10, K1-K5):

```
For hvert kriterium:
  - ✅ Oppfylt og verifisert
  - ⚠️ Delvis oppfylt (beskriv hva som mangler)
  - ❌ Ikke oppfylt (beskriv problem)
```

**Hvis ALT er ✅ → FERDIG. Gå til Fase Siste.**

**Hvis noe er ⚠️ eller ❌ → Start ny runde med fokus på manglene.**

### Fase Siste: Avslutning

1. Kjør full build: `fnm use 22 && npm run build`
2. Kjør TypeScript-sjekk: `npx tsc --noEmit`
3. Gjør en siste visuell gjennomgang av hele appen
4. Lag en oppsummering med:
   - Hva som ble gjort (per runde)
   - Status på alle suksesskriterier
   - Eventuelle kjente begrensninger
5. Commit alt og push til main (trigger deploy til GitHub Pages)

---

## Regler for agentbruk

### Parallellisering

- **ALLTID** dispatch analyse-agenter i parallell — aldri sekvensielt
- **ALLTID** dispatch review-agenter i parallell
- Bruk `isolation: "worktree"` for uavhengige kodeendringer
- Bruk `run_in_background: true` for agenter som ikke blokkerer neste steg

### Kontekst-management

- Hver agent får kun det den trenger — ikke dump hele kodebasen
- Gi agenter spesifikke filstier og konkrete spørsmål
- Samle agent-resultater og syntetiser selv — ikke la agenter duplikere arbeid

### Kvalitetssikring

- **ALDRI** klaim at noe er fikset uten å verifisere (build, visuelt, funksjonelt)
- **ALDRI** anta at en endring ikke har sideeffekter — test alltid drag/dialog/save
- **ALDRI** hopp over en utviklingsrunde fordi "det ser bra nok ut"
- Runder fortsetter til **100% av suksesskriteriene er oppfylt**

---

## Hva som IKKE skal endres

- **Arkitektur:** Ikke refaktorer til ny state management, routing, etc.
- **Dependencies:** Ikke legg til nye npm-pakker med mindre absolutt nødvendig
- **Datamodell:** Ikke endre `CalendarData`-strukturen i `types/index.ts`
- **GitHub API-integrasjon:** Ikke endre lagringsflyten
- **Scope:** Ikke legg til features som ikke er i spec (mobilresponsivitet, PWA, etc.)

## Hva som KAN endres fritt

- CSS (alle `.css`-filer)
- Komponent-intern logikk (bugfixer, edge cases)
- UX-forbedringer innenfor eksisterende features
- Kode-opprydding (fjerne dead code, konsistens)
- Tilgjengelighet (a11y) for eksisterende elementer
- Lavthengende frukt som gir stor UX-forbedring med liten innsats

---

## Lavthengende frukt å vurdere

Disse er IKKE påkrevd, men kan vurderes hvis de tar <30 min og gir merkbar forbedring:

1. **Double-click for ny blokk** — dobbeltklikk på tom plass prefyller person + uke
2. **Tooltip på smale blokker** — blokker som er for smale til å vise tittel → tooltip
3. **Bedre farge-kontrast** på blokkens tekst (hvit tekst på lys farge = vanskelig å lese)
4. **Animert "Lagret ✓"** — kort fade-in/fade-out bekreftelse
5. **ESLint-config** — sett opp `eslint.config.js` for flat config (v9)
6. **Smooth zoom-overgang** — CSS transition ved zoom-endring
7. **Bedre error boundary** — vis faktisk feilmelding, ikke bare "noe gikk galt"

---

## Oppsummering

**Du er ferdig når:**

1. ✅ Alle 20 funksjonalitetskriterier er verifisert
2. ✅ Alle 15 visuelle kriterier er verifisert
3. ✅ Alle 10 UX-kriterier er verifisert
4. ✅ Alle 5 kodekvalitetskriterier er verifisert
5. ✅ `npm run build` gir 0 feil
6. ✅ Ingen console.error i normal bruk
7. ✅ Appen ser ut som den koster penger

**Du er IKKE ferdig når:**
- "Det meste fungerer" (alt må fungere)
- "Det ser bra ut" (det må se perfekt ut)
- "Jeg tror det er fikset" (du må verifisere det)
