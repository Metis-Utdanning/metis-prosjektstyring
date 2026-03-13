# Warm Studio Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the kapasitetskalender from "Refined Stone" to "Warm Studio" — warmer backgrounds, dusty color palette, person avatars, pill-shaped capacity cells, indigo accent.

**Architecture:** CSS-only changes across 3 files + 1 constants file + 1 minimal TSX change. No functional changes. No new dependencies.

**Tech Stack:** React 19, Vite 8, CSS custom properties, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-13-warm-studio-redesign.md`

---

## Task 1: Update PALETTE in constants.ts

**Files:**
- Modify: `src/utils/constants.ts:1-5`

- [ ] **Step 1: Replace PALETTE array with dusty colors**

```ts
export const PALETTE = [
  '#6B8ADB', '#5BA88C', '#D4A853', '#C96B6B', '#8B7BC7',
  '#C4789A', '#6B9EC7', '#8FB85A', '#D4885A', '#7B7BD5',
  '#5BA8A0', '#9B7BC7',
];
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/fredrik/Documents/Metis-Utdanning/metis-prosjektstyring && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/utils/constants.ts
git commit -m "style: replace PALETTE with dusty color variants"
```

---

## Task 2: Update Timeline.css — CSS vars, label borders, capacity pills, blocks, avatar, today animations

**Files:**
- Modify: `src/components/Timeline.css`

This task has many edits in one file. Apply them in sequence.

- [ ] **Step 1: Update CSS custom properties in `:root` block (lines 7-43)**

Replace the `:root` block:

```css
:root {
  --tl-bg: #F4F1EC;
  --tl-surface: #F9F7F4;
  --tl-border: #E8E4DF;
  --tl-border-light: #EDEAE5;
  --tl-text: #1c1917;
  --tl-text-muted: #78716c;
  --tl-text-light: #a8a29e;
  --tl-today-color: #4F46E5;
  --tl-header-bg: #EDEAE5;
  --tl-label-bg: #F0EDE8;
  --tl-label-text: #44403C;
  --tl-swimlane-bg: #F9F7F4;
  --tl-swimlane-alt: #F4F1EC;
  --tl-unavailable-bg: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 4px,
    rgba(168, 162, 158, 0.10) 4px,
    rgba(168, 162, 158, 0.10) 8px
  );
  --tl-capacity-green: #16a34a;
  --tl-capacity-yellow: #ca8a04;
  --tl-capacity-red: #dc2626;
  --tl-milestone-color: #7c3aed;
  --tl-font-sans: 'Sora', system-ui, -apple-system, sans-serif;
  --tl-font-mono: 'Fira Code', 'SF Mono', ui-monospace, monospace;
  --tl-radius: 10px;
  --tl-radius-sm: 6px;
  --tl-resize-handle-width: 10px;
  --tl-block-shadow:
    0 1px 3px rgba(0, 0, 0, 0.06),
    0 2px 8px rgba(0, 0, 0, 0.03);
  --tl-block-shadow-hover:
    0 4px 16px rgba(0, 0, 0, 0.10),
    0 2px 4px rgba(0, 0, 0, 0.05);
}
```

- [ ] **Step 2: Fix white-alpha borders on label elements**

These borders were designed for dark backgrounds and are now invisible on light `--tl-label-bg`. Replace each:

`.timeline-header__corner` (line ~65):
```
border-right: 1px solid rgba(255, 255, 255, 0.06)  →  border-right: 1px solid #DDD9D2
```

`.timeline-header__years` (line ~73):
```
border-bottom: 1px solid rgba(255, 255, 255, 0.06)  →  border-bottom: 1px solid #DDD9D2
```

`.timeline-header__year` (lines ~84-86):
```
color: rgba(255, 255, 255, 0.6)  →  color: #78716C
border-right: 2px solid rgba(255, 255, 255, 0.12)  →  border-right: 2px solid #DDD9D2
```

`.timeline-header__month` (line ~107):
```
border-right: 1px solid rgba(255, 255, 255, 0.08)  →  border-right: 1px solid #DDD9D2
```

`.swimlane__label` (line ~219):
```
border-right: 1px solid rgba(255, 255, 255, 0.06)  →  border-right: 1px solid #DDD9D2
```

`.capacity-bar__label` (line ~527):
```
border-right: 1px solid rgba(255, 255, 255, 0.06)  →  border-right: 1px solid #DDD9D2
```

`.milestone-row__label` (line ~653):
```
border-right: 1px solid rgba(255, 255, 255, 0.06)  →  border-right: 1px solid #DDD9D2
```

- [ ] **Step 3: Update swimlane label padding and add avatar CSS**

Update `.swimlane__label` padding (line ~213-214):
```
padding: 14px 16px  →  padding: 12px 10px
```

Add `gap: 8px;` to `.swimlane__label` if not present.

Add new class after `.swimlane__label` block:

```css
.swimlane__avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--tl-font-sans);
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  margin-top: 1px;
}
```

- [ ] **Step 4: Update block border**

`.block` (line ~293): change border from `rgba(0, 0, 0, 0.08)` to:
```
border: 1px solid rgba(0, 0, 0, 0.06);
```

Note: `.block--active` (line ~351) has its own border — change it too:
```
border-color: rgba(0, 0, 0, 0.06);  /* was 0.08 */
```

- [ ] **Step 5: Update capacity bar cells to pill form**

`.capacity-bar` (line ~513): add padding:
```css
.capacity-bar {
  /* existing properties... */
  padding: 3px 0;
}
```

`.capacity-bar__cell` (line ~531-544): update:
```css
.capacity-bar__cell {
  /* keep existing flex, font, etc. */
  height: 18px;          /* was 20px */
  border-radius: 10px;
  border-right: none;    /* was 1px solid rgba(255,255,255,0.2) */
  margin: 0 1px;
}
```

`.capacity-bar__cell--green` (line ~558): add gradient:
```css
.capacity-bar__cell--green {
  background: linear-gradient(135deg, var(--tl-capacity-green), #22c55e);
}
```

`.capacity-bar__cell--yellow` (line ~562): add gradient:
```css
.capacity-bar__cell--yellow {
  background: linear-gradient(135deg, var(--tl-capacity-yellow), #eab308);
  color: #451a03;
}
```

`.capacity-bar__cell--red` (line ~567): add gradient:
```css
.capacity-bar__cell--red {
  background: linear-gradient(135deg, var(--tl-capacity-red), #ef4444);
}
```

`.capacity-bar__cell--empty` (line ~551): update colors:
```css
.capacity-bar__cell--empty {
  background: rgba(0, 0, 0, 0.03);   /* was transparent */
  color: #C8C3BC;                      /* was var(--tl-text-light) */
  border-right: none;                  /* was 1px solid... */
}
```

- [ ] **Step 6: Update today-marker box-shadows and flash animation**

`.timeline-header__today-marker` (line ~149):
```
box-shadow: 0 0 8px rgba(220, 38, 38, 0.25)  →  box-shadow: 0 0 8px rgba(79, 70, 229, 0.25)
```

`.swimlane__today-marker` (line ~270):
```
box-shadow: 0 0 6px rgba(220, 38, 38, 0.15)  →  box-shadow: 0 0 6px rgba(79, 70, 229, 0.15)
```

`@keyframes today-flash` (lines ~174-178): replace entire keyframe:
```css
@keyframes today-flash {
  0%, 100% { box-shadow: 0 0 8px rgba(79, 70, 229, 0.25); }
  20% { box-shadow: 0 0 24px rgba(79, 70, 229, 0.7), 0 0 48px rgba(79, 70, 229, 0.3); }
  50% { box-shadow: 0 0 16px rgba(79, 70, 229, 0.5), 0 0 32px rgba(79, 70, 229, 0.2); }
}
```

`.timeline-header__week--current` (line ~138):
```
background: rgba(220, 38, 38, 0.06)  →  background: rgba(79, 70, 229, 0.06)
```

- [ ] **Step 7: Update selection ring color**

`.block--selected` (line ~769): change outline-color:
```
outline: 2px solid #2563eb  →  outline: 2px solid #4F46E5
```

`.block:focus-visible` (line ~774): same change:
```
outline: 2px solid #2563eb  →  outline: 2px solid #4F46E5
```

- [ ] **Step 8: Commit**

```bash
git add src/components/Timeline.css
git commit -m "style: apply Warm Studio theme to Timeline — CSS vars, labels, capacity pills, today indigo"
```

---

## Task 3: Update Dialogs.css — toolbar, dialogs, buttons, week summary

**Files:**
- Modify: `src/components/Dialogs.css`

- [ ] **Step 1: Update toolbar background**

`.toolbar` (line ~343):
```
background: #0c0a09  →  background: #1E1B18
```

- [ ] **Step 2: Update save button to indigo**

`.toolbar__btn--save` (line ~428-434):
```css
.toolbar__btn--save {
  background: #4F46E5;
  color: #ffffff;
  border-color: #4F46E5;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(79, 70, 229, 0.35);
  opacity: 1 !important;
}
```

`.toolbar__btn--save:disabled` (line ~436-441):
```css
.toolbar__btn--save:disabled {
  background: rgba(79, 70, 229, 0.3);
  border-color: rgba(79, 70, 229, 0.3);
  box-shadow: none;
  cursor: default;
}
```

`.toolbar__btn--save:hover:not(:disabled)` (line ~443-447):
```css
.toolbar__btn--save:hover:not(:disabled) {
  background: #4338CA;
  border-color: #4338CA;
  box-shadow: 0 3px 10px rgba(79, 70, 229, 0.4);
}
```

- [ ] **Step 3: Update dialog colors to warm + indigo**

`.dialog` (line ~9-21): update background:
```
background: #ffffff  →  background: #FDFCFA
```

`.dialog__header` (line ~57):
```
border-bottom: 1px solid #e5e5e4  →  border-bottom: 1px solid #E8E4DF
```

`.dialog__footer` (line ~82-86):
```
border-top: 1px solid #e5e5e4  →  border-top: 1px solid #E8E4DF
background: #f5f5f4  →  background: #F0EDE8
```

Focus rings (lines ~138-141):
```
border-color: #2563eb  →  border-color: #4F46E5
box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12)  →  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12)
```

`.dialog-btn--primary` (line ~301-303):
```
background: #2563eb  →  background: #4F46E5
box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3)  →  box-shadow: 0 1px 3px rgba(79, 70, 229, 0.3)
```

`.dialog-btn--primary:hover` (line ~307-309):
```
background: #1d4ed8  →  background: #4338CA
box-shadow: 0 3px 10px rgba(37, 99, 235, 0.35)  →  box-shadow: 0 3px 10px rgba(79, 70, 229, 0.35)
```

`.dialog-links__add` (line ~259):
```
color: #2563eb  →  color: #4F46E5
```

`.dialog-links__add:hover` (line ~268):
```
color: #1d4ed8  →  color: #4338CA
```

- [ ] **Step 4: Update token prompt to warm colors**

`.token-prompt` (line ~697): update background:
```
background: #ffffff  →  background: #FDFCFA
```

`.token-prompt__header` (line ~713):
```
border-bottom: 1px solid #e5e5e4  →  border-bottom: 1px solid #E8E4DF
```

`.token-prompt__footer` (line ~750-753):
```
border-top: 1px solid #e5e5e4  →  border-top: 1px solid #E8E4DF
background: #f5f5f4  →  background: #F0EDE8
```

- [ ] **Step 5: Update week summary**

`.week-summary` (line ~598-599):
```
background: #f5f5f4  →  background: #EDEAE5
border-bottom: 1px solid var(--tl-border)  →  border-bottom: 1px solid #DDD9D2
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Dialogs.css
git commit -m "style: apply Warm Studio theme to Dialogs — toolbar, buttons, dialogs, week summary"
```

---

## Task 4: Update App.css — body, scrollbar, skeleton, week-detail-header

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Update body and app shell backgrounds**

`body` (line ~30):
```
background: #fafaf9  →  background: #F4F1EC
```

`.app` (line ~47):
```
background: #fafaf9  →  background: #F4F1EC
```

`.timeline-container` (line ~59):
```
background: #fafaf9  →  background: #F4F1EC
```

- [ ] **Step 2: Update scrollbar**

`.timeline-container::-webkit-scrollbar-track` (line ~69):
```
background: #f5f5f4  →  background: #EDEAE5
```

`.timeline-container::-webkit-scrollbar-thumb` (line ~73):
```
background: #d6d3d1  →  background: #C8C3BC
```

`.timeline-container::-webkit-scrollbar-corner` (line ~82):
```
background: #f5f5f4  →  background: #EDEAE5
```

- [ ] **Step 3: Update week-detail-header**

`.week-detail-header` (line ~95-96):
```
background: #f5f5f4  →  background: #EDEAE5
border-bottom: 1px solid #e5e5e4  →  border-bottom: 1px solid #E8E4DF
```

- [ ] **Step 4: Update skeleton loading states**

`.skeleton-toolbar` (line ~200):
```
background: #0c0a09  →  background: #1E1B18
```

`.skeleton-summary` (line ~205-206):
```
background: #f5f5f4  →  background: #EDEAE5
border-bottom: 1px solid #e5e5e4  →  border-bottom: 1px solid #E8E4DF
```

`.skeleton-timeline` (line ~215):
```
background: #fafaf9  →  background: #F4F1EC
```

`.skeleton-header` (line ~221):
```
background: linear-gradient(180deg, #1c1917 32px, #f5f5f4 32px)
→  background: linear-gradient(180deg, #F0EDE8 32px, #EDEAE5 32px)
```

`.skeleton-label` (line ~233):
```
background: #1c1917  →  background: #F0EDE8
```

`.skeleton-block` (line ~248):
```
background: #e7e5e4  →  background: #DDD9D2
```

- [ ] **Step 5: Commit**

```bash
git add src/App.css
git commit -m "style: apply Warm Studio theme to App shell — backgrounds, scrollbar, skeleton"
```

---

## Task 5: Add person avatars to Swimlane.tsx

**Files:**
- Modify: `src/components/Swimlane.tsx:1-7,191`

Depends on: Task 1 (PALETTE import)

- [ ] **Step 1: Add PALETTE import**

At line 4, update the import from constants:
```ts
import { SWIMLANE_HEIGHT, PALETTE } from '../utils/constants.ts';
```

- [ ] **Step 2: Add avatarColor derivation**

Inside the component function, after `personBlocks` useMemo (after line 91), add:
```ts
const avatarColor = personBlocks[0]?.color ?? PALETTE[(index ?? 0) % PALETTE.length];
```

- [ ] **Step 3: Update JSX label**

Replace line 191:
```tsx
<div className="swimlane__label">{person.name}</div>
```

With:
```tsx
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

- [ ] **Step 4: Verify build**

Run: `cd /Users/fredrik/Documents/Metis-Utdanning/metis-prosjektstyring && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/Swimlane.tsx
git commit -m "feat: add person avatars with initial + color to swimlane labels"
```

---

## Task 6: Visual verification and final commit

Depends on: Tasks 1-5

- [ ] **Step 1: Build**

Run: `cd /Users/fredrik/Documents/Metis-Utdanning/metis-prosjektstyring && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Dev server check**

Run: `npm run dev` and verify in browser that:
- Warm papery backgrounds (#F4F1EC)
- Dusty block colors
- Light label column (not dark)
- Pill-shaped capacity cells with gradients
- Indigo today-marker (not red)
- Person avatars with initials
- Indigo accent on save button, dialogs, focus rings
- Skeleton loading matches new theme

- [ ] **Step 3: Clean up design demo file**

```bash
rm /Users/fredrik/Documents/Metis-Utdanning/metis-prosjektstyring/design-demo.html
```
