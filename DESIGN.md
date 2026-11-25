---
name: Luminous Frosted Canvas
stitchProjectId: "17103287589792341309"
stitchScreenId: "7eca1a7a0dc34a8cbde4a820bfe00440"
stitchAssetId: "3b1a1ebdc7704a61a24dc5d86d4623bf"
colorMode: LIGHT
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e1e7ff'
  surface-container-highest: '#dae2fc'
  on-surface: '#131b2e'
  on-surface-variant: '#464554'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#767586'
  outline-variant: '#c6c5d7'
  surface-tint: '#484bd6'
  primary: '#2c2abc'
  primary-bright: '#6366f1'
  on-primary: '#ffffff'
  primary-container: '#4648d4'
  on-primary-container: '#d1d1ff'
  inverse-primary: '#c0c1ff'
  secondary: '#00668a'
  secondary-bright: '#38bdf8'
  on-secondary: '#ffffff'
  secondary-container: '#40c2fd'
  on-secondary-container: '#004d6a'
  tertiary: '#004f35'
  tertiary-bright: '#10b981'
  on-tertiary: '#ffffff'
  tertiary-container: '#006a48'
  on-tertiary-container: '#60eeb1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fc'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 3.5rem
    fontWeight: '700'
    lineHeight: 4rem
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.6rem
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.45rem
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.25rem
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.35rem
    letterSpacing: -0.01em
  label-code-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.6875rem
    fontWeight: '700'
    lineHeight: 1rem
    letterSpacing: 0.06em
rounded:
  sm: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.25rem
  2xl: 1.5rem
  full: 9999px
---

# AlgoLens — Luminous Frosted Canvas Design System

Extracted via Stitch MCP (`Luminous Frosted Canvas`) and adapted strictly to preserve AlgoLens's existing `#FAF8FF` light lavender-white palette and component architecture.

## 1. Atmospheric Depth & Elevation Layers (Light Mode Only)

- **Level 0 — Atmospheric Canvas Bed (`#FAF8FF`)**
  - Base background `#FAF8FF` with subtle fixed pastel radial gradient blooms in:
    - Iris Indigo: `rgba(99, 102, 241, 0.10)`
    - Sky Cyan: `rgba(56, 189, 248, 0.09)`
    - Mint Emerald: `rgba(16, 185, 129, 0.06)`
  - Large Gaussian softness (`blur-3xl` / `96px–120px`) ensures frosted glass cards visibly refract soft chromatic depth without muddying typography.

- **Level 1 — Structural Frosted Glass Surfaces (`.panel`, Cards & Workspaces)**
  - Background: `rgba(255, 255, 255, 0.68)` (`bg-white/70`)
  - Backdrop Filter: `blur(24px) saturate(165%)` (`backdrop-blur-2xl`)
  - Border Highlight: `1px solid rgba(255, 255, 255, 0.88)` + outer micro ring `0 0 0 1px rgba(99, 102, 241, 0.08)`
  - Shadow: `0 12px 32px -4px rgba(99, 102, 241, 0.06), 0 2px 8px -1px rgba(19, 27, 46, 0.03)`

- **Level 2 — Floating Navbars, Segmented Capsule Bars & Execution Docks (`.panel-elevated`)**
  - Background: `rgba(255, 255, 255, 0.80)` (`bg-white/80`)
  - Backdrop Filter: `blur(28px) saturate(180%)`
  - Border Highlight: `1px solid rgba(255, 255, 255, 0.95)`
  - Shadow: `0 14px 38px -6px rgba(99, 102, 241, 0.11), 0 4px 12px -2px rgba(19, 27, 46, 0.04)`

- **Level 3 — Modals, Context Menus & Popovers**
  - Backdrop Scrim: `rgba(15, 23, 42, 0.22)` with `backdrop-blur-md`
  - Surface: `rgba(255, 255, 255, 0.88)` with `backdrop-blur-2xl`, `border border-white/95`, `ring-1 ring-indigo-500/10`, and `shadow-[0_24px_60px_-12px_rgba(99,102,241,0.18)]`

## 2. Tiered Curvature Strategy (`border-radius`)

- **Floating Capsules (`rounded-full` / `9999px`)**: Sticky top navigation pill shell, segmented view/tab switcher tracks and active pills, primary/secondary action buttons, status chips, complexity tags, search inputs, and floating playback dock.
- **Primary Viewport Containers (`rounded-3xl` / `1.5rem`)**: Main workspace panes, hero showcase card, algorithm cards, filter shells, race lanes, auth cards, and modals.
- **Nested Sub-Panels & Cards (`rounded-2xl` / `1rem`)**: Stat cards, empty states, floating context overlays, edge-case drawers, zoomed canvas controls, and category icon medallions.
- **Glazed Wells, Trace Cells & Stack Frames (`rounded-xl` / `0.75rem`)**: Inputs, 6-digit OTP cells, variable inspection tiles, stack frame cards, and small icon tiles.

## 3. Component Patterns

### Floating Capsule Navbar
- Outer sticky wrapper keeps `56px` (`h-14`) vertical flow compatibility with `calc(100vh - 56px)` visualizer layouts.
- Inner bar floats as a rounded capsule (`h-11`, `rounded-full`, `bg-white/75`, `backdrop-blur-2xl`, `border-white/90`, soft indigo shadow).

### Segmented Capsule Switcher (`.glass-capsule-track` + `.glass-capsule-pill`)
- Track: `rounded-full p-1 bg-slate-100/65 border border-white/85 backdrop-blur-md`
- Active Pill: `bg-white text-[#4648D4] font-semibold rounded-full shadow-[0_2px_8px_rgba(70,72,212,0.12)]`
- Inactive Pill: `text-slate-600 hover:text-slate-900 rounded-full`

### Glazed Input Fields (`.glass-input`)
- Background: `rgba(255, 255, 255, 0.62)` with inner border `1px solid rgba(203, 213, 225, 0.75)`
- Focus state: `border-[#6366F1]`, `bg-white/90`, focus ring `0 0 0 3px rgba(99, 102, 241, 0.16)`
