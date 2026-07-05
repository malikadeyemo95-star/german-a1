# Delivery audit

Verified on 2026-07-05 against the requested nine workstreams.

## Hard constraints

| Requirement | Evidence | Status |
| --- | --- | --- |
| Static GitHub Pages output | Plain HTML, CSS, JavaScript, JSON, manifest, and service worker; no server runtime | Pass |
| No paid APIs | Audio uses browser `speechSynthesis`; microphone uses browser Speech Recognition when available | Pass |
| Mobile-first and one-handed | Fixed five-item bottom navigation, thumb-sized controls, 390 px QA | Pass |
| Existing progress preserved | `assets/state.js` migrates `ga1done` and `ga1x`; migration tests pass | Pass |
| Lightweight JavaScript | All JavaScript is 21,903 bytes gzipped; limit is 200,000 bytes | Pass |
| Original course preserved | Canonical source hashes match all 30 generated day files and 327 section payloads | Pass |

## Workstream 1 — Architecture and performance

- All 30 days are independent JSON files with typed sections.
- Only the active day is rendered; the next day preloads during idle time.
- Audio, SRS, and speaking modules are dynamically imported.
- Mobile Lighthouse: 100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO.

## Workstream 2 — UI/UX redesign

- Token-based dark/light design system with persisted theme.
- Sticky progress top bar and exact Home / Days / Flashcards / Quiz / Stats mobile navigation.
- 30-day status grid, test-day styling, swipe navigation, per-section checks, responsive tables, card transitions, and reduced-motion support.
- Browser QA found no horizontal overflow at 390 px, 768 px, or 1280 px.

## Workstream 3 — Audio

- German TTS controls on vocabulary, example sentences, dialogues, and flashcards.
- Best available `de-DE` voice selection, delayed voice loading, cancellation, and iOS-safe synthesis handling.
- Line-by-line dialogue playback with highlighting and 0.7× / 1× speed.
- Typed listening drills use lesson vocabulary and targeted number practice.

## Workstream 4 — Spaced repetition

- 416 bidirectional cards generated from unlocked lessons.
- FSRS-lite scheduling with Again / Hard / Good / Easy, due queue, stats, and hardest cards.
- Typed mode accepts common diacritic substitutions and provides ä, ö, ü, ß keys.

## Workstream 5 — Quizzes and tests

- 25 mini quizzes and 125 explained questions.
- Typed, multiple-choice, tap-to-order, and matching-pair interactions.
- Four weekly tests and the Day 30 mock retain their original tasks, keys, pass thresholds, scores, and retake flow.
- Wrong mini-quiz and speaking answers create persistent review cards.

## Workstream 6 — Progress and motivation

- Day and section completion, cards reviewed, scores over time, weak topics, and total study days.
- Shift-friendly study-day calculation uses a 4 a.m. rollover.
- Validated JSON export/import covers the complete local state.

## Workstream 7 — PWA and offline

- Standalone manifest, 192 px and 512 px icons, install prompt, and offline indicator.
- Service worker pre-caches the shell, all 30 lessons, reference data, quiz/test data, and every lazy JavaScript module.
- Automated Chromium offline test reloads the shell and opens Day 30 plus its speaking coach with the network disabled.

## Workstream 8 — Search and reference

- 371-entry global search index opens the matching lesson section.
- 345-row glossary filters by text, article, and day and sorts by course, German, or English order.
- Gender colors follow the requested der blue / die red / das green convention.
- Grammar reference aggregates all 26 original grammar sections.

## Workstream 9 — Accessibility and QA

- Semantic landmarks, skip link, labels, live regions, keyboard controls, visible focus, and reduced motion.
- Both themes pass Lighthouse accessibility at 100.
- Automated and visual checks cover phone, tablet, desktop, Android Chromium, iPhone WebKit, offline use, content integrity, state migration, SRS, speaking rules, quizzes, reference data, PWA cache, and static accessibility contracts.

## Lesson-integrated speaking correction

- Every day has a lesson-scoped coach with Repeat, Answer, Build, and Roleplay.
- Each coach includes a goal, model, microphone action, live transcript, correction, grammar and clarity feedback, checklist, retry, best-attempt save, and Weak List action.
- Saving an attempt marks the lesson’s speaking section complete.
- Day 3 explicitly catches “Ich bin Hunger” and corrects it to “Ich habe Hunger.”
- Unsupported speech-recognition browsers receive a typed transcript fallback while model audio remains available.
- There is no disconnected Speaking Studio.
