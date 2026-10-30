# Design — Rahmat Portfolio V3 (Quiet portfolio)

## Source of truth
- Status: Final for implementation handoff.
- Last refreshed: 2026-10-15.
- Canvas: [Porto.pen](./Porto.pen)
  - Pages frame `h0Wjfo` "Rahmat Porofolio V3": Desktop `oPEZ4` (1440), Mobile `qRT8i` (390), Mobile / Menu open `sOyGe` (390×844).
  - Foundations frame `l3HN4v` "Rahmat V3 / Design system foundations".
- Tokens: 33 `rm3-*` variables. Components: 11 `RM3 / *`.
- Content history and verification log: [RAHMAT_VARIATION_03.md](./RAHMAT_VARIATION_03.md). GitHub data: [RAHMAT_GITHUB_ACTIVITY.json](./RAHMAT_GITHUB_ACTIVITY.json).
- Legacy: `xai-*` variables and [design-system.json](./design-system.json) belong to the earlier x.ai extraction. Not used by V3.

## Brand
- Calm, personal, engineering-minded. Paper-white sheet on a warm grey canvas.
- Neutrals do the work; one olive accent for icons, current-state markers and highlights.
- Hairlines over boxes. Whitespace separates sections.
- Avoid: gradients, extra shadows, new colors outside `rm3-*`, invented metrics or testimonials.

## Information architecture
Section order and anchors (desktop and mobile identical):

| Section | Anchor | Desktop | Mobile |
|---|---|---|---|
| Navigation (sticky) | — | `bf2nv` | `g268G` |
| Personal introduction | — | `YITzy` | `GgrZW` |
| Featured role / LEAP | `#work` | `MuPNK` | `K1oIWd` |
| Experience | `#experience` | `BtoRo` | `ffYnK` |
| About and skills | `#about` | `HrcJs` | `mq0Nl` |
| GitHub activity | `#github` | `EILPd` | `OcNnw` |
| Contact | `#contact` | `s3MEoG` | `YR6kL` |
| Footer | — | `H3HEYn` | `G1sBrK` |
| Chat launcher + panel | — | `nfQaF`, `boSj2` | `G3hLtE`, `XUq79` |

Nav labels: Work · Experience · About · GitHub · Contact.

## Color
| Token | Value | Use |
|---|---|---|
| `rm3-canvas` | `#ECECE8` | Page backdrop |
| `rm3-paper` | `#FFFFFF` | Main sheet, cards, text on ink |
| `rm3-soft` | `#F5F6F1` | Feature panels, icon tiles, inputs |
| `rm3-tint` | `#E8EDDF` | Accent badge background |
| `rm3-ink` | `#26291F` | Headings, body, primary button |
| `rm3-muted` | `#62665D` | Meta, labels, dates |
| `rm3-line` | `#DCDDD5` | Dividers, outlines (decorative only) |
| `rm3-accent` | `#50623D` | Icons, badges, highlights |
| `rm3-online` | `#7FB24E` | Presence dot |
| `rm3-on-ink-muted` | `#C9CCC2` | Secondary text on ink |
| `rm3-shadow` | `#26291F26` | Floating panel shadow |
| `rm3-shadow-strong` | `#26291F33` | Chat launcher shadow |
| `rm3-gh-0` … `rm3-gh-4` | `#DFE3DA` `#CBD9B8` `#9CB779` `#6E8B50` `#3E5D2C` | GitHub activity scale, less → more |

## Typography
- Families: Manrope 600 (`rm3-heading`) for display and headings; DM Sans 400/500 (`rm3-body`) for everything readable.
- Headings use negative tracking; body uses natural tracking.

| Style | Font | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|---|
| Display | Manrope | 48 / 1.2 | 600 | −1.6 | Hero name |
| Feature title | Manrope | 44 / 1.15 | 600 | −1.2 | Current work title |
| Figure | Manrope | 40 / 1.15 | 600 | −1 | `RM3 / Figure` value |
| Headline | Manrope | 38 / 1.3 | 400 | −1 | Hero statement |
| H2 / Section | Manrope | 32 / 1.25 | 600 | −0.6 | Section titles |
| H3 / Entry | Manrope | 21 / 1.25 | 600 | −0.6 | Role, card titles |
| Body L | DM Sans | 16 / 1.55 | 400 | 0 | Descriptions |
| Body | DM Sans | 14 / 1.55 | 400 / 500 | 0 | Nav, meta, buttons (500) |
| Caption | DM Sans | 13 / 1.55 | 400 | 0 | Stacks, labels |
| Micro | DM Sans | 12 / 1.55 | 500 | 0 | Badges, timestamps |

Mobile steps down: name 26, feature title 30, menu links 24, figures 26.

## Space and geometry
- Spacing scale (4 base): `rm3-space-4` 4 · 8 · 12 · 16 · 24 · 32 · 40 · 64.
  - 4: label ↔ value. 8: badge, title stack. 12: icon ↔ text, button row. 16: list rows.
  - 24: block gap. 32: card gap, nav items. 40–48: card padding. 64: section rhythm.
- Radius: `rm3-radius-xs` 2 (activity cells) · `sm` 12 (icon tiles) · `md` 20 (chat panel, mobile cards) · `lg` 24 (feature panels) · `xl` 40 (desktop sheet) · `pill` 100 (buttons, badges, launcher).
  - Raw exceptions: mobile sheet 28, mobile chat panel 16.
- Elevation: hairline 1px `rm3-line`; flat panel `rm3-soft` with no shadow; floating `0 16 48 rm3-shadow` (chat only).

## Iconography
- Lucide, stroke style, 18–20px (14px inside text links, 16px in check items).
- Accent on content icons; muted for meta; paper on ink buttons. Always paired with a text label or an accessible name.
- In use: map-pin, arrow-up-right, arrow-down-right, graduation-cap, server, panels-top-left, code-xml, database, sprout, github, git-commit-horizontal, user-plus, calendar-days, clipboard-check, file-check, check, menu, x, message-circle, send.

## Components
| Component | ID | Notes |
|---|---|---|
| `RM3 / Button / Primary` | `efpdO` | Ink pill, 52 high, pad 14/22, label + arrow. Mobile override 48, pad 12/16 |
| `RM3 / Button / Secondary` | `BY9zC` | Paper pill, line stroke |
| `RM3 / Badge / Current` | `sPtfo` | Tint pill, 6px accent dot |
| `RM3 / Text link` | `OIYCa` | Label + 14px arrow |
| `RM3 / Skill row` | `SoEbx` | Icon tile + label/value, bottom hairline |
| `RM3 / Module row` | `LcUTY` | Icon tile + name/detail, top hairline |
| `RM3 / Figure` | `dFWL8` | Big number + caption |
| `RM3 / Stack chip` | `rReAG` | Paper pill with line stroke, 13/500 |
| `RM3 / Check item` | `OP6oD` | Accent check + label |
| `RM3 / Icon button` | `x6lDQ` | 44×44 pill; menu (line stroke) and close (ink fill) |
| `RM3 / Chat launcher` | `p8ZQu` | 60 ink circle, online dot, strong shadow. Mobile 56 |

Chat panel (`boSj2` / `XUq79`) is a page-level pattern, not a component: header on ink, soft message area, quick replies, composer.

## Responsive behavior
- Mobile < 768: 390 reference, sheet inset 12, content pad 20. Single column; Current work stacks story → figures → modules → stack → practices (2×2).
- Desktop ≥ 1024: 1440 reference, sheet inset 40, content pad 72, max content 1216. Current work two columns (story + "What I built" card, 440).
- Tablet 768–1023: not designed. Use the mobile layout with wider padding until a design exists.
- GitHub calendar: desktop shows the full year (1,619 contributions); mobile shows the last 90 days (474).

## Interaction
- Navigation: sticky top, paper background.
  - Desktop: inline anchor links.
  - Mobile: `RM3 / Icon button` opens full-screen Menu (`sOyGe`) with numbered links, a Let's talk CTA, LinkedIn/GitHub links and location. Selecting a link closes the menu.
- Chat: launcher fixed bottom-right (desktop offset 64/72, mobile 24/16). Panel closed by default; canvas shows the open state for reference. Panel is `role=dialog`.
- Links: whole-row/button hit areas; external links open the real destinations (email, LinkedIn, phone, GitHub).
- Canvas is static. No hover, pressed or loading states are drawn; implement hover as subtle opacity/underline only.

## Accessibility
- Contrast (measured):
  - ink/paper 14.80:1; muted/paper 5.87:1; muted/soft 5.40:1.
  - accent/paper 6.65:1; accent/tint 5.58:1; accent/soft 6.13:1.
  - on-ink-muted/ink 9.09:1; online/ink 5.90:1.
- `rm3-line` on paper is 1.37:1. Decorative only; never the sole boundary of an essential control.
- Targets ≥ 44×44px. Visible focus ring: 2px `rm3-accent`, offset 2.
- Icon-only buttons need `aria-label` ("Open menu", "Close menu", "Open chat"). Menu button exposes `aria-expanded`.
- Respect `prefers-reduced-motion`. Logical tab order follows section order; Escape closes the menu and the chat.

## Content voice
- First person, concise, sentence case. Verb + object for actions ("Let's talk", "View experience").
- Figures describe platform scope (about 50 staff, about 1,000 students), not personal performance.
- "4 modules" and the module details are derived from the platform description. Confirm before launch.

## Implementation
- Export `rm3-*` 1:1 as CSS custom properties (`--rm3-ink`, `--rm3-radius-pill`, …).
- Fonts: Google Fonts, Manrope 600 and DM Sans 400/500. Icons: lucide (same names as the canvas).
- Section anchors and handoff notes are stored in each node's `context` field on the canvas.
- Foundations board section "06 Build notes" mirrors this file.

## Open questions
- [ ] Owner: confirm the "4 modules" figure and module descriptions for LEAP.
- [ ] Owner: decide the chat backend (live agent, AI assistant, or a mailto fallback). Canvas copy is a sample.
- [ ] Designer: tablet layout (768–1023) if required.
