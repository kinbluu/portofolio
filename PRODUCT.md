# Rahmat’s portfolio

A personal portfolio for Mochammad Rahmat Muttaqin, a full-stack developer in Surabaya. It presents real work, experience, skills, GitHub activity, and ways to make contact. This document describes the agreed redesign; the current website may still reflect the previous design until implementation is complete.

## People and outcome

Recruiters, prospective clients, and developers all belong here. The first viewport identifies Rahmat and his role. Visitors can read experience, jump directly to an area, inspect technical details, or make contact without navigating a 3D tour.

## Content authority

- `src/data/profile.ts` owns biographical facts, work, experience, skills, contacts, and chat copy.
- LEAP: approximately 50 staff, approximately 1,000 students, four modules. Preserve approximation markers and the distinction between work impact and personal awards.
- The GitHub server island owns the live calendar and its cached fallback. Present contributions in their own section after experience.
- No invented awards, certifications, projects, screenshots, testimonials, or personal interests.
- Main portfolio copy is in Indonesian; preserve the assistant's existing Indonesian behavior.

## Platform and boundaries

Astro on Cloudflare, Tailwind, React for the existing TanStack AI chat. Preserve all existing section anchors, social/contact destinations, server-island failure behavior, and chat protections. Never require a GPU or JavaScript to read the portfolio.

The owner chooses a minimal editorial portfolio without 3D or a profile photo in the introduction. Use centered typography, generous but purposeful whitespace, monochrome with a restrained blue accent, and light and dark themes that follow the device. Experience is concise and centered like a CV. The GitHub contributions and AI assistant remain available; the assistant has its own section, with its exact position still open. Adapt the layout for mobile without requiring a tour or hiding essential information.
