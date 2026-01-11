# Caliber Design Direction

A design reference inspired by luxury houses like Hermès and Loewe — refined, understated, and timeless.

---

## Core Principles

### 1. Quiet Confidence
- No flashy gradients or loud colors
- Let the content breathe; the design should feel effortless
- Sophistication through restraint, not decoration

### 2. Precision & Craft
- Every pixel intentional
- Consistent spacing rhythm (8px base grid)
- Subtle details that reward close attention

### 3. Timelessness Over Trends
- Avoid trendy UI patterns that will age
- Classic typography choices
- Neutral palette that won't feel dated

---

## Color Palette

### Primary Tones
| Name | Hex | Usage |
|------|-----|-------|
| Ink | `#1a1a1a` | Primary text |
| Stone | `#6b6b6b` | Secondary text |
| Parchment | `#f7f6f3` | Background |
| Cream | `#ffffff` | Cards |

### Accents (use sparingly)
| Name | Hex | Usage |
|------|-----|-------|
| Terracotta | `#c4a484` | Positive indicators, warmth |
| Sage | `#7d8c7a` | Success states |
| Brick | `#9a6458` | Negative indicators |
| Gold | `#b8a88a` | Premium accents, highlights |

### Guidelines
- Accent colors at 10-15% of visual weight maximum
- Prefer opacity variations over multiple colors
- Dark text on light backgrounds (never pure black `#000`)

---

## Typography

### Font Pairing
```
Headings: "Cormorant Garamond" or "Playfair Display" (serif)
Body: "Inter" or "DM Sans" (clean sans-serif)
Numbers: "Tabular figures" enabled for data alignment
```

### Scale
```
xs:   0.75rem  (12px) — labels, captions
sm:   0.875rem (14px) — secondary text
base: 1rem    (16px) — body text
lg:   1.25rem (20px) — card values
xl:   1.5rem  (24px) — section headers
2xl:  2rem    (32px) — primary metrics
3xl:  2.5rem  (40px) — hero numbers
```

### Principles
- Generous line height (1.5–1.6 for body)
- Letter-spacing: slightly open for uppercase labels (+0.05em)
- Never all-caps for long text; reserve for short labels only

---

## Spacing & Layout

### Whitespace Philosophy
> "Luxury is space." — More whitespace signals premium quality.

### Spacing Scale (8px base)
```
4px   — tight, within components
8px   — compact spacing
16px  — standard gap
24px  — section padding
32px  — between sections
48px  — major section breaks
64px+ — hero/breathing room
```

### Card Design
- Subtle shadows: `0 1px 3px rgba(0,0,0,0.04)`
- Or no shadow, just a fine border: `1px solid #e8e6e3`
- Generous internal padding (24px minimum)
- Rounded corners: 8–12px (not too rounded)

---

## Visual Elements

### Borders & Dividers
- Hairline weight: 1px
- Color: `#e8e6e3` (warm gray, not cold)
- Use sparingly — whitespace often suffices

### Icons
- Line style, not filled
- 1.5px stroke weight
- Minimal set — only where truly helpful
- Consider: no icons at all, just typography

### Data Visualization
- Muted line colors, not vibrant
- Thin lines (1.5–2px)
- Subtle grid, or no grid
- Let data points breathe

### Micro-interactions
- Transitions: 200–300ms ease
- Subtle opacity shifts on hover (0.7 → 1.0)
- No bouncy or playful animations
- Everything should feel smooth and intentional

---

## Component Patterns

### Metric Cards (Current Design → Elevated)
```
Current:
┌─────────────────────┐
│ WEIGHT              │  ← small, uppercase
│ 73.3 kg             │  ← large, bold
│ ▼ 0.9               │  ← change indicator
└─────────────────────┘

Elevated:
┌─────────────────────────────┐
│                             │
│  Weight                     │  ← serif, title case
│                             │
│  73.3                       │  ← large, light weight
│  kg                         │  ← small, spaced below
│                             │
│  −0.9 from last             │  ← subtle, muted
│                             │
└─────────────────────────────┘
```

### Form Inputs
- Clean, minimal borders (bottom border only, or very subtle full border)
- No heavy outlines on focus — use subtle color shift
- Labels above inputs, not floating
- Generous click/tap targets

### Buttons
- Primary: Filled with `Ink` color, white text
- Secondary: Outlined or text-only
- No heavy shadows or gradients
- Slight letter-spacing in button text

---

## Photography & Imagery Direction

If imagery is ever added:
- Muted, desaturated tones
- Natural lighting
- Lifestyle context (not clinical/medical)
- High negative space in compositions

---

## Anti-Patterns (What to Avoid)

- Vibrant/saturated colors
- Heavy drop shadows
- Rounded pill buttons (too playful)
- Emoji in UI (except where truly personal)
- Dense, cluttered layouts
- Animated gradients or glows
- Tech-startup aesthetic (blues, purples, neons)

---

## Reference Brands

### Hermès
- Orange as accent against cream/neutrals
- Typography is refined and unhurried
- Illustrations over photography
- Every detail considered

### Loewe
- Earthy, muted palette
- Bold but quiet typography
- Generous whitespace
- Tactile, material quality

### Aesop
- Dark text on cream
- Serif typography
- Clinical precision with warmth
- Information hierarchy through scale, not color

### Apple (Fitness/Health)
- Clean data visualization
- Rings and subtle gradients
- SF Pro typography
- Purposeful animation

---

## Implementation Priority

1. **Typography** — Switch to refined font pairing
2. **Color palette** — Shift to warmer, muted tones
3. **Spacing** — Increase whitespace throughout
4. **Cards** — Soften shadows, refine borders
5. **Details** — Micro-interactions, subtle refinements

---

*"Elegance is refusal." — Coco Chanel*
