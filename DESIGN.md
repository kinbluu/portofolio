# Kamar Rahmat

## Committed world

A literal, cutaway studio that collects Rahmat’s work and experience. Scroll guides the visitor through one room, not a grid of unrelated cards. The room is imagined with the owner’s permission; furniture is scenery, not a claim about his actual home.

The surface is an experience, but information remains immediately useful to recruiters, clients, and developers. Objects point to evidence; they do not invent achievements.

## Material and voice

Warm plaster, oak, muted sage upholstery, terracotta ceramics, paper, and daylight. Dusk changes wall, floor, objects, window, light, UI, calendar, and fallback illustration together. Manrope and DM Sans carry information; DM Serif Display italic gives the story a quieter, human contrast. Existing factual copy is retained.

Canonical UI and room colors live in src/styles/studio.css. The original rm3 token names remain compatible with chat and calendar components. One responsive spacing unit governs the site edges; furniture dimensions are world-space measurements, not UI spacing.

## Story

1. The room: overview, identity, role, location, contact.
2. The workbench: approach the LEAP screen; impact and optional module details.
3. The collected experience: move toward the bookshelf; real roles and responsibilities.
4. The everyday tools: studio objects accompany practices and the full skills list.
5. Small, steady steps: the contribution poster accompanies the real GitHub calendar.
6. An open invitation: return to the room and make contact.

The camera follows natural scroll with damping. No scroll hijacking, forced intro, pointer-following camera, or perpetual render loop. Objects can jump to corresponding sections; chapter links provide equivalent keyboard access.

## Technical choice and resilience

Use Three.js WebGPURenderer with its built-in WebGL2 fallback. HTML-in-Canvas is not a production dependency because the portfolio must work outside an experimental browser API. Load the renderer after initial HTML and illustration. Draw on demand; cap pixel ratio, cache geometry and materials, and dispose resources on navigation.

Pause motion and reduced-motion preference freeze a full-room view. Background tabs stop drawing. GPU failure preserves a coordinated day/night illustration and all HTML content. Print exposes the story without canvas. Mobile gets an upper room stage and vertical reading flow instead of shrinking desktop panels.

## Verification and handoff

Use bun check, bun lint, bun fmt --check, and bun run build. Drive tests/studio.e2e.ts through an Obscura CDP instance; no separate browser executable. Artifacts contain the verified desktop/mobile/day/night views and machine-readable results. Never interpret the saved room diagram as a reconstruction of the owner’s room.
