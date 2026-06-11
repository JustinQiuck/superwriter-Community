# SuperWriter Design System

This file is the visual source of truth for SuperWriter UI work. Read it before designing or editing any user-facing screen.

## 1. Visual Theme & Atmosphere

SuperWriter should feel like a focused writing studio with an intelligent assistant beside the manuscript. The product is not a generic SaaS dashboard and not a decorative glass demo. It should combine:

- The calm paper warmth of a writing workspace.
- The precision and density of a serious production tool.
- The speed and command feel of an AI launcher.
- A restrained Apple-like material quality, using glass as hierarchy, not decoration.

The default mood is quiet, editorial, and high-trust. Color appears as useful signal: chapter state, story structure, AI mode, warning, success, or current focus. Avoid large decorative gradients, floating color blobs, and empty "premium" effects that do not clarify the workflow.

## 2. Product Design Principles

- Writing comes first. The editor is the primary object, with the most comfortable reading width, calmest surface, and least visual noise.
- AI is a co-pilot, not a modal interruption. AI assistance should live beside the text or appear as small contextual commands near the selection.
- Navigation supports orientation. Sidebars and headers must make the current story, chapter, and writing state obvious at a glance.
- Dense does not mean cramped. Metadata, outline, memory, and AI actions can be compact, but the manuscript needs breathing room.
- Glass is a material layer. Use it for floating command bars, assistant panels, inspector trays, and transient tools. Do not cover the entire product in equal-strength blur.
- Chinese text must be first-class. Typography, spacing, and button widths must be checked with real Chinese labels.

## 3. Reference Blend

Use these references as inspiration, not as brands to copy.

- Notion: warm neutral canvas, low-friction writing, restrained borders, document-first hierarchy.
- Linear: precise layout, dense but readable navigation, status clarity, disciplined spacing.
- Raycast: command-style AI actions, compact palettes, fast keyboard-first affordances.
- Apple: generous alignment, soft material transitions, careful contrast, calm motion.

Do not chase a single reference too literally. SuperWriter should look native to its own writing domain.

## 4. Color Palette & Roles

Prefer semantic CSS variables and OKLCH values in implementation. Hex values below are design anchors.

### Core Neutrals

| Role | Value | Use |
| --- | --- | --- |
| Studio Paper | `#fbfaf7` | Main light workspace background |
| Manuscript White | `#ffffff` | Editor page, high-readability surfaces |
| Warm Ink | `#1f1d1a` | Primary text |
| Soft Ink | `#65605a` | Secondary text and metadata |
| Faint Line | `rgba(31, 29, 26, 0.10)` | Dividers and quiet borders |
| Warm Mist | `#f2f0eb` | Sidebar rows, section alternation, disabled fills |

### Functional Accents

| Role | Value | Use |
| --- | --- | --- |
| AI Violet | `#8b5cf6` | AI assistant identity, generate actions |
| Focus Blue | `#2f80ed` | current selection, focus rings, active editor state |
| Structure Teal | `#13a59a` | worldbuilding, outline, context links |
| Character Rose | `#e2557b` | character-related surfaces |
| Timeline Amber | `#d99021` | timeline, warnings, pacing |
| Success Green | `#1e9f62` | saved, complete, healthy state |

### Dark Mode

Dark mode should feel like a writing cockpit, not a black marketing site.

| Role | Value | Use |
| --- | --- | --- |
| Night Desk | `#111318` | Main dark workspace |
| Dark Glass | `rgba(32, 35, 43, 0.72)` | Floating panels |
| Dark Paper | `#191b21` | Editor page in dark mode |
| Night Ink | `#f5f1e8` | Primary dark text |
| Night Muted | `#aaa39a` | Secondary dark text |

## 5. Typography Rules

Use the existing app font stack unless a dedicated Chinese typography decision is made. The current implementation uses Inter via `--font-inter`; keep it for now and tune hierarchy through size, weight, line-height, and spacing.

### Hierarchy

| Role | Size | Weight | Line height | Use |
| --- | --- | --- | --- | --- |
| Workspace Title | 18-22px | 650-700 | 1.2 | Story title, major workspace title |
| Panel Title | 14-16px | 600 | 1.3 | Sidebar and assistant section headings |
| UI Body | 14px | 400-500 | 1.45 | Navigation rows, metadata, settings |
| Micro Label | 11-12px | 600 | 1.25 | Status tags, counters, timestamps |
| Manuscript Body | 17-19px | 400 | 1.85-2.05 | Main Chinese writing content |
| Manuscript Heading | 24-32px | 650-700 | 1.25 | Chapter title and document headings |

### Rules

- Do not use negative letter spacing for Chinese UI text.
- Keep manuscript text more relaxed than tool text.
- Use weight, color, and spacing before adding borders.
- Micro labels may use slight positive tracking only for Latin/numeric metadata.
- Avoid marketing-scale headings inside the editor workspace.

## 6. Layout Principles

### Story Workspace

The preferred desktop layout is a three-zone workspace:

1. Left rail: story navigation, chapters, worldbuilding entry points, compact status.
2. Center: manuscript editor and writing toolbar.
3. Right tray: AI assistant, context cards, deviations, suggestions, or inspector.

The center editor owns visual priority. The side zones should feel attached to the work, not like separate dashboards.

### Density

- Header height target: 52-64px.
- Left rail width target: 240-300px.
- Right AI tray width target: 320-400px.
- Manuscript readable width target: 680-820px.
- Use 8px as the base spacing unit, with 4px for micro gaps and 12/16/24px for panel rhythm.

### Responsive Behavior

- Desktop: three-zone layout.
- Tablet: left rail may collapse to icons; right tray becomes a slide-over or bottom sheet.
- Mobile: manuscript first; AI and navigation become explicit sheets. Never squeeze all three columns side by side.
- Touch targets should be at least 44px on mobile and 36px on desktop toolbars.

## 7. Material, Depth & Glass

Use four material levels:

| Level | Treatment | Use |
| --- | --- | --- |
| Paper | solid warm/white surface, minimal shadow | editor and long reading content |
| Soft Surface | subtle fill and faint border | sidebar groups, metadata blocks |
| Glass | translucent fill, blur, inner highlight | floating bars, AI tray, popovers |
| Command Glow | soft accent glow behind active command | AI generation, active contextual menu |

Glass rules:

- Blur should support separation from content behind it; avoid blur when it reduces legibility.
- Glass panels need a real edge: faint border, inner highlight, and controlled shadow.
- Do not stack glass inside glass unless the nested element is a small control.
- Avoid equal glass intensity across every surface. Material hierarchy must be obvious.

## 8. Component Styling

### Buttons

- Primary action: filled accent or strong glass pill, 8-12px radius, clear hover and focus states.
- Secondary action: quiet surface or outline, same height as primary when grouped.
- Icon buttons: use lucide icons, square or circular touch target, visible tooltip for unclear actions.
- Destructive action: use red only for destructive outcomes, not for emphasis.

### Navigation

- Active navigation rows should combine position, subtle fill, and an accent marker.
- Chapter rows need scan-friendly metadata: order, title, status, word count/progress when available.
- Avoid oversized cards for every navigation item.

### Editor

- Manuscript surface should feel like paper, not a dashboard card.
- Toolbar controls should be compact, icon-led, and grouped by task.
- Selection AI actions should appear near the text as a small command capsule.
- Empty editor states should invite writing directly, not explain the product.

### AI Assistant

- The assistant panel should expose state clearly: idle, thinking, streaming, success, error.
- Suggested actions should be short command chips, not long cards.
- Generated text needs clear controls: insert, replace, copy, refine, discard.
- AI content should preserve reading comfort; avoid tiny streaming text in dense boxes.

### Blueprint Workflow

- Blueprint pages start with story contract and outline, not kanban.
- Kanban is a beat execution view, not the first planning surface.
- Chapter planning should expose scene cards with goal, conflict, turn, outcome, opening hook, ending hook, and payoff.
- Editor AI context should surface the current beat and active scene card before offering generation actions.

## 9. Motion & Interaction

Motion should make the workspace feel responsive and spatially clear.

- Panel open/close: 160-220ms, ease-out, translate plus opacity.
- Floating command menu: scale from 0.98 to 1, fade in, no bounce.
- Streaming AI: subtle progress shimmer or cursor pulse, not decorative animation.
- Hover states: small color/material change; avoid large scaling in dense tool surfaces.
- Respect reduced motion.

## 10. Accessibility & Quality Bar

- Maintain WCAG AA contrast for all text and controls.
- Every interactive element needs a visible keyboard focus state.
- UI text must fit in Chinese at desktop and mobile widths.
- Do not rely on color alone for status.
- Avoid nested cards and unnecessary panel chrome.
- Before declaring UI work complete, verify with at least one desktop and one narrow viewport screenshot when a browser can run.

## 11. Agent Prompt Guide

When asking an AI agent to implement UI, use language like:

> Rework this screen using the SuperWriter DESIGN.md. Keep the manuscript as the visual center, use warm paper surfaces for writing, precise Linear-like density for navigation, Raycast-like command chips for AI actions, and restrained Apple-like glass only for floating tools and assistant trays. Chinese labels must fit without truncation.

For story workspace UI:

> Build a three-zone writing studio: compact left story rail, centered manuscript paper, and right AI co-pilot tray. Use warm neutral backgrounds, faint borders, functional accent colors, and clear AI states. Avoid marketing cards, decorative gradient blobs, and glass everywhere.

## 12. References

- VoltAgent awesome-design-md: https://github.com/VoltAgent/awesome-design-md
- Notion-inspired DESIGN.md: https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/notion/DESIGN.md
- Linear-inspired DESIGN.md: https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/linear.app/DESIGN.md
- Raycast-inspired DESIGN.md: https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/raycast/DESIGN.md
- Apple-inspired DESIGN.md: https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/apple/DESIGN.md
