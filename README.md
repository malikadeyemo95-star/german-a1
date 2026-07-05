# 🇩🇪 German A1 in 30 Days

A complete, self-contained German A1 course — textbook, workbook, flashcard app and
mock exam in **one HTML file**. Built for studying 2–3 hours a day on a phone.

**▶ Live site:** https://malikadeyemo95-star.github.io/german-a1/

> 📱 Open it on your phone, tap **Share → Add to Home Screen**, and it installs
> like an app — icon, fullscreen, and fully offline.

![Screenshot](screenshot.png)
*(screenshot placeholder — add one from your phone)*

## The trainer

This is no longer just a textbook — it's an interactive A1 trainer:

- **🧭 Guided learning journey** — a calm Learn / Review / Practice / Progress shell,
  one clear next action, a visual 30-day path, and lessons organized into
  Learn → Listen → Speak → Practice → Review without removing the original content.
- **🏠 Dashboard** — today's mission, study-mode picker (Light 30 min / Normal 75 min /
  Beast 2.5 h), due reviews, skill bars for vocabulary, grammar, listening, speaking,
  reading, writing, pronunciation and exam readiness.
- **🚀 Daily missions** — every day starts with "By the end of today, I can…", a real-life
  use case, mode-filtered tasks and a *German in the wild* real-world challenge.
- **🃏 Real spaced repetition** — Again / Hard / Good / Easy scheduling (today / 1 / 3 / 7
  days) across EN→DE, article, plural, cloze, audio-recognition and sentence cards.
  Nouns always come with article + plural + example sentence.
- **📕 Weak-list error notebook** — every wrong answer (quizzes, drills, builder,
  listening, exam) is captured by category and reviewed until you get it right twice.
- **⌨️ Typed active recall** — quizzes and drills demand typed answers with
  umlaut-tolerant checking (ae/oe/ue/ss accepted).
- **🧩 Sentence builder** — tap scrambled words into verb-second order, with explanations.
- **🎧 Listening trainer** — built-in German TTS, transcripts locked until you answer.
- **🎤 Lesson-integrated speaking coach** — every daily Speaking section now contains
  lesson-scoped Repeat, Answer, Build and Roleplay tasks with live German transcription,
  corrections, grammar/clarity scoring, content checklists, saved best attempts and
  Weak List integration. A small Speaking Review area revisits completed lesson topics.
- **👄 Pronunciation trainer** — the 11 sounds that give English speakers away.
- **🇩🇪 Everyday German + 🆘 Survival panel** — work, gym, REWE/Lidl, Bürgeramt,
  transport phrases with audio, one tap away.
- **🎓 Timed exam mode** — Hören/Lesen auto-scored, Schreiben/Sprechen self-scored,
  locked keys, pass/fail verdict, weakest-area report, plus official Goethe/telc links.
- **🏕 Weekly survival checks** on Days 7/14/21/28 with Ready / Almost / Repeat verdicts.
- **🔥 Streaks with recovery mode**, challenge mode (blur English, tap to peek),
  light/dark theme, font-size control, search, bookmarks, bottom navigation.

## What's inside

- **30-day curriculum** — every day has 13 sections: grammar lesson, vocabulary
  with English meanings, example sentences, a dialogue, speaking/listening/reading
  practice, a writing task, a quiz, flashcards, homework and revision.
- **Weekly tests** after Days 7, 14, 21 and 28, plus a **full A1 mock exam**
  (Hören · Lesen · Schreiben · Sprechen) on Day 30 — all with answer keys.
- **🔊 German text-to-speech** — tap the speaker on any flashcard, vocab entry or
  dialogue line to hear it in a native German voice (Web Speech API, rate 0.9 for
  learners). Hides itself automatically if the device has no German voice.
- **🃏 Spaced-repetition flashcards** — ~208 tap-to-flip cards, per-day shuffle,
  and a global "Review All" deck: *Again* requeues a card, *Got it* retires it,
  and cards you miss surface first in future sessions.
- **✅ Interactive quizzes** — tappable multiple choice with instant green/red
  feedback, running score, and per-day best scores. Original answer keys remain
  as a fallback.
- **📈 Progress & streak** — header progress bar (N/30 days) and a 🔥 daily study
  streak, all stored locally on your device.
- **📴 Offline PWA** — a small service worker caches everything; after the first
  visit the course works with no internet at all.
- **Zero dependencies** — no framework, no build step, no CDN, no tracking.

## Tech

The new app shell is dependency-free vanilla HTML/CSS/JS. The exact original
course is preserved in `course-source.html`; `scripts/build-content.mjs` extracts
all 30 days into typed, hash-verified files under `content/`. The browser loads
only the active day and preloads the next day during idle time.

Progress now lives under the versioned `ga1:v2` localStorage key. On first load,
the app migrates completed days and preferences from the original `ga1done` and
`ga1x` keys without deleting the legacy data.

Architecture:

- `index.html` — lightweight static app shell.
- `assets/app.js` — routing, lazy lesson loading and client interactions.
- `assets/state.js` — versioned state and legacy migration.
- `assets/app.css` — mobile-first design system.
- `content/day-01.json` … `day-30.json` — typed lesson payloads.
- `course-source.html` — canonical preserved course source.
- `scripts/build-content.mjs` — repeatable content extraction.
- `scripts/verify-content.mjs` — content hash/integrity verification.

Deploying an update? Bump the `CACHE` version string in `sw.js` so installed
users receive the new version.

## Run locally

Run a static server from the repository root:

```sh
python3 -m http.server 8765
```

Then open `http://localhost:8765/`.

Rebuild and verify lesson data after editing `course-source.html`:

```sh
node scripts/build-content.mjs
node scripts/build-cards.mjs
node scripts/build-quizzes.mjs
node scripts/build-tests.mjs
node scripts/verify-content.mjs
node scripts/test-state.mjs
node scripts/test-srs.mjs
node scripts/test-quizzes.mjs
node scripts/test-pwa.mjs
```

### Performance baseline

Mobile Lighthouse (2026-07-05):

| Version | Performance | Accessibility | Best Practices | SEO | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: |
| Deployed monolith | 99 | 100 | 100 | 90 | 131 KiB |
| Lazy-loading shell | 100 | 100 | 100 | 100 | 39 KiB |
