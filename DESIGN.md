---
name: Markdown Vault
description: A calm, focused, trustworthy workspace for capturing and refining markdown notes.
colors:
  muted-sage: "oklch(0.8348 0.1302 160.9080)"
  sage-ink: "oklch(0.2626 0.0147 166.4589)"
  warm-paper: "oklch(0.9911 0 0)"
  soft-stone: "oklch(0.9461 0 0)"
  deep-ink: "oklch(0.2046 0 0)"
  mid-ink: "oklch(0.4386 0 0)"
  caution-red: "oklch(0.5523 0.1927 32.7272)"
  hairline: "oklch(0.9037 0 0)"
typography:
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.04em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
rounded:
  sm: "0.25rem"
  md: "0.375rem"
  lg: "0.5rem"
  xl: "0.75rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.muted-sage}"
    textColor: "{colors.sage-ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-primary-hover:
    backgroundColor: "color-mix(in oklch, {colors.muted-sage} 90%, transparent)"
    textColor: "{colors.sage-ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-secondary:
    backgroundColor: "{colors.warm-paper}"
    textColor: "{colors.deep-ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.deep-ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.deep-ink}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.75rem"
  command-list:
    backgroundColor: "{colors.warm-paper}"
    textColor: "{colors.deep-ink}"
    rounded: "{rounded.lg}"
    padding: "0.25rem"
  dialog:
    backgroundColor: "{colors.warm-paper}"
    textColor: "{colors.deep-ink}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  toast:
    backgroundColor: "{colors.warm-paper}"
    textColor: "{colors.deep-ink}"
    rounded: "{rounded.md}"
    padding: "1rem"
---

# Design System: Markdown Vault

## 1. Overview

**Creative North Star: "The Focused Workshop"**

Markdown Vault is a quiet craftsman's bench for writing: the tools sit within reach, the surfaces are kept clear, and the material itself gets the light. The interface does not announce itself; it recedes until a gesture, a save state, or an AI suggestion needs attention. Calm is the default posture. Focus is the outcome.

This system trusts restraint. One green accent does the navigational work. Neutrals carry the structure. Type is compact and legible. Motion is quick and functional. The design explicitly rejects the density war of cluttered note apps and the choreographed theater of over-animated SaaS dashboards. Every surface should feel like a clean sheet on a stable desk.

**Key Characteristics:**
- One accent voice: Muted Sage handles selection, focus, and primary action. Nothing else competes.
- Compact, native-feeling density: 13px body type, tight line heights, small radii, and a 4px spacing base.
- Flat-first elevation: shadows are state feedback, not decoration.
- Honest state visibility: dirty, saving, error, and selection states are readable at a glance through label, icon, and shape as well as color.
- Reduced-motion respect: transitions collapse to near-instant when the user prefers less motion.

## 2. Colors

The palette is deliberately small. Most of the UI lives in warm neutrals so the user's content stays dominant. Muted Sage is the single functional accent; Caution Red is reserved for errors and destructive actions.

### Primary
- **Muted Sage** (`oklch(0.8348 0.1302 160.9080)`): the only brand accent. Used for primary buttons, focus rings, active selection, save-state indicators, and linked text. In dark mode it deepens to `oklch(0.4365 0.1044 156.7556)`.

### Neutral
- **Warm Paper** (`oklch(0.9911 0 0)`): the primary background in light mode. Almost white, with just enough warmth to avoid clinical starkness.
- **Soft Stone** (`oklch(0.9461 0 0)`): hover states, secondary backgrounds, and muted fills.
- **Deep Ink** (`oklch(0.2046 0 0)`): primary text and strong UI elements. Dark mode text lightens to `oklch(0.9288 0.0126 255.5078)`.
- **Mid Ink** (`oklch(0.4386 0 0)`): placeholder text, secondary descriptions, and disabled cues.
- **Hairline** (`oklch(0.9037 0 0)`): borders, dividers, and the faint edges of cards and inputs.
- **Caution Red** (`oklch(0.5523 0.1927 32.7272)`): errors, destructive actions, and validation failures.

### Named Rules
**The One Voice Rule.** Muted Sage is the only accent color. Use it for focus, selection, primary actions, and links. No second brand hue, no gradient overlays, no neon highlights.

**The Honest State Rule.** Color never carries meaning alone. A saving state shows the icon and label; an error shows the message; a selected item shows shape and icon alongside the sage fill.

## 3. Typography

**Body Font:** Geist (with `system-ui, sans-serif` fallback)
**Mono Font:** JetBrains Mono (with `SFMono-Regular, Menlo, monospace` fallback)

The type pairing is quiet and workmanlike. Geist provides a clean, technical sans skeleton for long lists and short labels. JetBrains Mono handles code blocks and file paths without theatrics.

### Hierarchy
- **Headline** (600, 1.5rem / 1.2, `-0.025em`): sign-in headings and major empty-state titles.
- **Title** (600, 1.125rem / 1.2, `-0.025em`): dialog titles, panel headers, and section labels.
- **Body** (400, 0.8125rem / 1.5, `-0.01em`): the default UI copy, file lists, button labels, and metadata.
- **Label** (500, 0.75rem / 1, `0.04em`, uppercase): keyboard shortcuts, status pills, and table headers.
- **Code / Mono** (400, 0.8125rem / 1.5): code blocks and inline paths, rendered in JetBrains Mono.

### Named Rules
**The Compact Rule.** The UI is set at 13px body. Density is a feature, so keep labels small, line heights tight, and avoid inflating type size for hierarchy when weight and color already do the work.

## 4. Elevation

Surfaces are flat at rest. Depth is created by value and border, not by ambient shadow. Shadows appear only as a response to state or elevation: a hovered primary button, an open command palette, a raised toast.

### Shadow Vocabulary
- **2xs / xs** (`0px 1px 3px 0px hsl(0 0% 0% / 0.09)`): the subtlest resting shadow, used on inputs and small buttons.
- **sm** (`0px 1px 3px 0px hsl(0 0% 0% / 0.17), 0px 1px 2px -1px hsl(0 0% 0% / 0.17)`): primary buttons, small cards, and sidebar panels.
- **md** (`0px 1px 3px 0px hsl(0 0% 0% / 0.17), 0px 2px 4px -1px hsl(0 0% 0% / 0.17)`): hover lifts and dropdown menus.
- **lg** (`0px 1px 3px 0px hsl(0 0% 0% / 0.17), 0px 4px 6px -1px hsl(0 0% 0% / 0.17)`): dialogs, sidebars, and elevated cards.
- **xl** (`0px 1px 3px 0px hsl(0 0% 0% / 0.17), 0px 8px 10px -1px hsl(0 0% 0% / 0.17)`): command palettes and modal overlays.
- **2xl** (`0px 1px 3px 0px hsl(0 0% 0% / 0.43)`): toasts and critical floating surfaces.

### Named Rules
**The State-Only Shadow Rule.** Surfaces are flat at rest. Shadow is feedback, not scenery. If a component has a shadow when no one is interacting with it, the shadow is too heavy.

## 5. Components

### Buttons
Buttons are quiet, direct, and rectangular with modest rounding.

- **Shape:** 6px radius (`rounded-md`), 36px default height, 8px 16px padding.
- **Primary:** Muted Sage background (`oklch(0.8348 0.1302 160.9080)`), dark sage-ink text, 1px solid `white/10` border, `shadow-sm`. Hover darkens to 90% opacity and gains `shadow`.
- **Secondary:** near-white (`oklch(0.9940 0 0)`) background, deep-ink text, subtle border, `shadow-sm`. Hover shifts to soft-stone.
- **Ghost:** transparent background; hover fills with soft-stone. Used for icon-only toolbar actions.
- **Link:** no background, primary text color, underline on hover.
- **Disabled:** `disabled:opacity-50`, pointer events removed.

### Inputs
Inputs sit close to the canvas with a transparent fill and a hairline border.

- **Style:** transparent background, 1px `hairline` border, 6px radius, 36px height, 12px horizontal padding.
- **Focus:** 3px Muted Sage ring at 50% opacity, border color shifts to primary.
- **Error:** destructive ring (`caution-red` at 20% opacity) and destructive border.
- **Placeholder:** `mid-ink` color.

### Command Palette / Dialog
The command palette and dialogs share the same raised card language.

- **Surface:** warm-paper background, 1px hairline border, 8px radius, `shadow-2xl`.
- **Header:** title is `text-lg` semibold, description is `text-sm` mid-ink.
- **List rows:** 8px radius, hover fills `soft-stone`, selected row uses primary background or primary text.
- **Close affordance:** top-right 16px icon button, ghost style.

### Toast
Toasts enter from the bottom-right on mobile and right on desktop.

- **Surface:** warm-paper background, 1px hairline border, 6px radius, `shadow-lg`.
- **Text:** `text-sm` deep-ink title, `text-sm` mid-ink description at 80% opacity.
- **Destructive toast:** caution-red background with caution-red foreground.
- **Motion:** short slide-in and fade-out; collapses to instant under `prefers-reduced-motion`.

### Sidebar
The sidebar is a narrow, tool-bearing rail.

- **Width:** 16rem expanded, 3rem collapsed icon-only.
- **Background:** warm-paper, separated from the main surface by a dashed hairline border (`border-dashed`) on the trailing edge.
- **Items:** 8px radius, hover fills soft-stone, active/selected uses Muted Sage.
- **Group labels:** uppercase label style, mid-ink, hidden when collapsed.
- **Resize handle:** 4px vertical strip that brightens on hover.

### Cards / Containers
Cards are understated structural frames, not decorative surfaces.

- **Corner Style:** 8px radius (`rounded-lg`).
- **Background:** transparent or `soft-stone/20` (`oklch(0.9461 0 0 / 0.2)`), depending on context.
- **Border:** 1px `hairline` at 60% opacity (`border-border/60`).
- **Shadow:** none at rest; only `shadow-sm` when raised by hover or selection.
- **Padding:** 16px–24px.

## 6. Do's and Don'ts

Concrete guardrails for anyone extending the UI.

### Do:
- **Do** use Muted Sage as the only accent for focus, selection, primary actions, and active links.
- **Do** keep the default body size at 13px (0.8125rem) and rely on weight and color for hierarchy.
- **Do** pair color with an icon or label when showing state (saving, dirty, error, selected).
- **Do** keep surfaces flat at rest and add shadow only as feedback.
- **Do** use 6px or 8px radii for controls and cards; avoid anything larger than 12px.
- **Do** honor `prefers-reduced-motion` by collapsing motion to instant or near-instant transitions.

### Don't:
- **Don't** turn the interface into a cluttered note app: dense floating toolbars, competing sidebars, and visual hierarchy that fights for attention are forbidden.
- **Don't** use over-animated SaaS dashboard patterns: orchestrated page-load choreography, bouncing entrance transitions, and motion that delays the first useful action.
- **Don't** introduce a second accent hue. If it is not Muted Sage, Caution Red, or a neutral, it does not belong.
- **Don't** use shadows as decoration. A resting card should not float.
- **Don't** rely on color alone for state. A red border without an error message is not enough.
