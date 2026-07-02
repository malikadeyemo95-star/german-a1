# 🇩🇪 German A1 in 30 Days

A complete, self-contained German A1 course — textbook, workbook, flashcard app and
mock exam in **one HTML file**. Built for studying 2–3 hours a day on a phone.

**▶ Live site:** https://malikadeyemo95-star.github.io/german-a1/

> 📱 Open it on your phone, tap **Share → Add to Home Screen**, and it installs
> like an app — icon, fullscreen, and fully offline.

![Screenshot](screenshot.png)
*(screenshot placeholder — add one from your phone)*

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

Vanilla HTML/CSS/JS in a single `index.html` (~5k lines). The only companions are
`sw.js` (offline cache), `manifest.json` and two generated PNG icons. Progress
lives in `localStorage` (`ga1done`, `ga1last`, `ga1srs`, `ga1quiz`, `ga1streak`).

Deploying an update? Bump the `CACHE` version string in `sw.js` so installed
users receive the new version.

## Run locally

Open `index.html` in any browser — that's it. (For the offline/PWA features you
need any static server, e.g. `python3 -m http.server`.)
