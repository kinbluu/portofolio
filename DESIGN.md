# Kamar Rahmat

## Committed world

A literal, cutaway studio that collects Rahmat’s work and experience. Scroll guides the visitor through one room, not a grid of unrelated cards. The room is imagined with the owner’s permission; furniture is scenery, not a claim about his actual home.

The surface is an experience, but information remains immediately useful to recruiters, clients, and developers. Objects point to evidence; they do not invent achievements.

## Material and voice

Warm plaster, oak, muted sage upholstery, terracotta ceramics, paper, and daylight. Dusk changes wall, floor, objects, window, light, UI, calendar, and fallback illustration together. Manrope and DM Sans carry information; DM Serif Display italic gives the story a quieter, human contrast. Existing factual copy is retained.

Canonical UI and room colors live in src/styles/studio.css. The original rm3 token names remain compatible with chat and calendar components. One responsive spacing unit governs the site edges; furniture dimensions are world-space measurements, not UI spacing.

## Editorial layer

The room remains the setting, while the reading layer takes cues from a personal work journal: a slogan-led introduction with the name as supporting context, ruled section labels, and prominent figures drawn from real work. The rules organize the story; they are not decoration. The room and text retain their alternating positions, with a shorter room stage on mobile to bring the introduction into view sooner.

Section labels and supporting text remain readable on small screens. Chapter links have generous targets, the mobile menu scrolls within the viewport, and the chat launcher yields to overlapping content while remaining reachable by keyboard.

## Design read

ENERGY 2 / RHYTHM 2 / MOTION 2. The warm room and prominent slogan introduce the work, while the name remains visible as supporting context. Longer experience and shorter GitHub and contact chapters vary the reading pace; movement follows the visitor and can be paused.

The copy gradients make text legible where the room passes behind it, then fade toward the illustration so the room remains visible. Arrows indicate destinations or expanded details. The registration, calendar, clipboard, document, shield, database, and check icons identify the adjacent module or practice; their labels carry the meaning independently. The room is the identity motif, not a representation of a real home. The profile data and approximate LEAP figures are recorded in PRODUCT.md and src/data/profile.ts; those project records are not independent verification.

## Story

1. The room: overview, identity, role, location, contact.
2. The workbench: move close to the LEAP monitor so its modules are legible; the camera pulls back on tablets to keep the screen clear of the work copy.
3. The collected experience: move closer to the bookshelf. Two labeled folders correspond to the real roles; the folder for the role being read slides forward. The camera stays at the shelf while both entries are read, and motion is disabled when paused or reduced.
4. The everyday tools: approach the wall board, which shows the real practices beside the full skills list. The camera stays on the board while the visitor reads and pulls back on tablets to keep it clear of the copy.
5. Small, steady steps: the camera moves right from the practice board to the contribution poster. The poster is a saved snapshot; the adjacent HTML calendar provides the current data. The composition shifts and pulls back where needed to keep both visible.
6. An open invitation: return to the room and make contact.

On the first hero view, the room assembles in stages: floor and walls, then window, furniture, artwork, and plants. The short entrance uses the existing room objects, starts only while the hero is visible, and completes immediately when the visitor scrolls away or pauses motion. Reduced motion and renderer failure retain the complete room.

The camera follows natural scroll with damping. No scroll hijacking, forced intro, pointer-following camera, or perpetual render loop. Objects can jump to corresponding sections; chapter links provide equivalent keyboard access.

## Technical choice and resilience

Use Three.js WebGPURenderer with its built-in WebGL2 fallback. HTML-in-Canvas is not a production dependency because the portfolio must work outside an experimental browser API. Load the renderer after initial HTML and illustration. Draw on demand; cap pixel ratio, cache geometry and materials, and dispose resources on navigation.

Pause motion and reduced-motion preference freeze a full-room view. Background tabs stop drawing. GPU failure preserves a coordinated day/night illustration and all HTML content. Print exposes the story without canvas. Mobile gets an upper room stage and vertical reading flow instead of shrinking desktop panels.

## Verification and handoff

Use bun check, bun lint, bun fmt --check, and bun run build. Drive tests/studio.e2e.ts through an Obscura CDP instance; no separate browser executable. Artifacts contain the verified desktop/mobile/day/night views and machine-readable results. Never interpret the saved room diagram as a reconstruction of the owner’s room.
