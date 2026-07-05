# Deutschweg — German A1 in 30 Days

A mobile-first, offline-capable German A1 learning PWA with a complete 30-day curriculum.

**Live site:** https://malikadeyemo95-star.github.io/german-a1/

The app is static and deploys directly to GitHub Pages. There is no account, backend, paid API, framework, CDN, or tracking.

## Learning experience

- A focused Home → Lesson → Review flow with a 30-day status grid.
- The home card distinguishes Start from Continue, summarizes the two remaining lesson gates, and resumes the first unfinished section.
- All original lessons, tables, dialogues, quizzes, flashcards, tests, answer keys, and the Day 30 mock exam preserved.
- Typed, collapsible lesson sections with independent completion tracking.
- Lesson-integrated speaking coaches for all 30 days. Each coach offers Repeat, Answer, Build, and Roleplay tasks using only that lesson or earlier material.
- Microphone transcription where the browser supports German speech recognition, plus lesson-aware corrections, grammar and clarity scores, content checklists, saved best attempts, and Weak List cards.
- Speaking and the day’s assessment are real completion gates: the app guides the learner to whichever step is still missing instead of silently marking a skipped lesson complete.
- An actionable Speaking Mistakes review in Stats lets learners reveal and hear corrections, reopen the source lesson, and archive resolved mistakes.
- A typed fallback for browsers without speech recognition; model-answer audio remains available through German text-to-speech.
- German TTS on vocabulary, examples, dialogue lines, and flashcards, with line-by-line dialogue playback and 0.7× / 1× speed.
- Listening drills, including confusing number pairs such as 24 and 42.
- A bidirectional FSRS-lite flashcard deck with Again / Hard / Good / Easy grading, typed answers, special-character keys, due counts, and hardest-card history.
- Interactive mini quizzes with typed answers, multiple choice, tap-to-order sentences, matching pairs, explanations, saved results, and automatic mistake cards.
- Four weekly tests and the Day 30 mock exam with locked answer keys, scoring, and retakes.
- Every lesson surfaces its exact quiz or test inside the daily journey; passing updates the lesson checklist and offers a one-tap return to that day.
- Stats for streaks, section and day completion, cards reviewed, scores, study days, and weak topics.
- JSON progress export/import and automatic migration from the original `ga1done` and `ga1x` localStorage keys.
- Global course search, a 345-entry glossary, and a 26-section grammar reference.
- Dark and light themes, keyboard support, reduced-motion support, responsive tables, swipe lesson navigation, and no horizontal page overflow.
- Installable PWA with all 30 lessons cached for offline study.
- Safe in-app update prompts let installed learners choose when to reload a newly cached release without risking their local progress.

## Architecture

- `index.html` — semantic, lightweight application shell.
- `assets/app.js` — routing, lazy lesson loading, quiz interactions, and view orchestration.
- `assets/state.js` — versioned local progress, migration, streak, and import validation.
- `assets/audio.js` — lazy-loaded German Web Speech synthesis.
- `assets/srs.js` — lazy-loaded FSRS-lite scheduling.
- `assets/speaking.js` — lazy-loaded lesson-scoped microphone coach and correction rules.
- `assets/app.css` — mobile-first design tokens and responsive components.
- `content/day-01.json` … `day-30.json` — typed day payloads loaded on demand.
- `content/cards.json`, `quizzes.json`, `tests.json`, `reference.json` — generated interactive learning data.
- `course-source.html` — canonical preserved source of the original course.
- `sw.js` and `manifest.json` — complete offline cache and install metadata.
- `scripts/` — deterministic content builders, integrity checks, unit tests, and browser QA.

The home shell loads first. A lesson fetches only its own JSON file and preloads the next day during idle time. Audio, SRS, and speaking code use dynamic imports and load only when needed.

## Run locally

```sh
python3 -m http.server 8765
```

Open `http://localhost:8765/`.

## Rebuild generated course data

Run these after editing `course-source.html`:

```sh
node scripts/build-content.mjs
node scripts/build-cards.mjs
node scripts/build-quizzes.mjs
node scripts/build-tests.mjs
node scripts/build-reference.mjs
```

## Verify

```sh
node scripts/verify-content.mjs
node scripts/test-state.mjs
node scripts/test-srs.mjs
node scripts/test-speaking.mjs
node scripts/test-quizzes.mjs
node scripts/test-pwa.mjs
node scripts/test-reference.mjs
node scripts/test-static.mjs
```

Optional end-to-end checks require Playwright:

```sh
npm install --no-save @playwright/test playwright
npx playwright test scripts/offline.spec.js --workers=1
npx playwright test scripts/journey.spec.js --workers=1
node scripts/device-qa.cjs
```

## Performance and QA

Mobile Lighthouse, measured locally on 2026-07-05:

| Version | Performance | Accessibility | Best Practices | SEO | Initial transfer |
| --- | ---: | ---: | ---: | ---: | ---: |
| Original deployed monolith | 99 | 100 | 100 | 90 | 131 KiB |
| Rebuilt PWA | 100 | 100 | 100 | 100 | 96 KiB |

The complete JavaScript payload is 21.9 KB gzipped, well below the 200 KB limit. Browser QA covers 390 px phone, tablet, and desktop widths; Android Chromium installability; iPhone WebKit audio/speaking fallback; fresh and migrated progress; and a fully offline reload that opens Day 30 and its speaking coach.

## Deployment

GitHub Pages serves the repository root from `main`. Pushing a static update deploys it automatically. Bump the cache name in `sw.js` whenever cached production assets change.
