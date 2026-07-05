import { RECOVERY_KEY, STATE_KEY, calculateStreak, migrateLegacyState, normalizeImportedState, shiftedDateKey, validateImportedState } from './state.js';

const CONTENT_ROOT = './content/';
const TEST_DAYS = new Set([7, 14, 21, 28, 30]);
const SECTION_ICONS = {
  grammar:'Aa',vocab:'W',sentences:'S',dialogue:'↔',speaking:'●',listening:'◉',
  reading:'R',writing:'✎',quiz:'✓',flashcards:'◇',homework:'⌂',revision:'↻',lesson:'·',
};

const elements = {
  home:document.querySelector('#homeView'),days:document.querySelector('#daysView'),
  day:document.querySelector('#dayView'),flashcards:document.querySelector('#flashcardsView'),quiz:document.querySelector('#quizView'),stats:document.querySelector('#statsView'),reference:document.querySelector('#referenceView'),placeholder:document.querySelector('#placeholderView'),
  content:document.querySelector('#dayContent'),loading:document.querySelector('#dayLoading'),
  title:document.querySelector('#topbarTitle'),eyebrow:document.querySelector('#topbarEyebrow'),
  progress:document.querySelector('#topbarProgress'),back:document.querySelector('#backButton'),
};

let manifest;
let state = migrateLegacyState(localStorage);
state.activityDays ||= [];
state.sectionProgress ||= {};
state.completedDays ||= [];
let activeDay = state.lastDay || nextDay();
let touchStartX = 0;
let allCards;
let allQuizzes;
let allTests;
let referenceData;
let referenceTab = 'glossary';
let pendingSectionId;
let pendingAssessmentDay;
let reviewQueue = [];
let reviewIndex = 0;
let installPrompt;
let audioApi;
let srsApi;
let speakingApi;
let refreshingForUpdate = false;
let pendingImportState;

async function loadAudioApi() {
  audioApi ||= await import('./audio.js');
  return audioApi;
}

async function loadSrsApi() {
  srsApi ||= await import('./srs.js');
  return srsApi;
}

async function speakGerman(text, rate = 1) {
  return (await loadAudioApi()).speakGerman(text, rate);
}

async function loadGermanVoice() {
  return (await loadAudioApi()).loadGermanVoice();
}

function stopGermanSpeech() {
  audioApi?.stopGermanSpeech();
}

function saveState(activity = false) {
  if (activity) {
    const today = shiftedDateKey();
    if (!state.activityDays.includes(today)) state.activityDays.push(today);
    state.activityLog = [...(state.activityLog || []), new Date().toISOString()].slice(-1000);
  }
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function nextDay() {
  for (let day = 1; day <= 30; day += 1) if (!state.completedDays.includes(day)) return day;
  return 30;
}

async function loadManifest() {
  const response = await fetch(`${CONTENT_ROOT}manifest.json`);
  if (!response.ok) throw new Error('Course manifest unavailable');
  manifest = await response.json();
}

async function loadDay(day) {
  const file = `day-${String(day).padStart(2, '0')}.json`;
  const response = await fetch(`${CONTENT_ROOT}${file}`);
  if (!response.ok) throw new Error(`Day ${day} unavailable`);
  return response.json();
}

function preloadDay(day) {
  if (day > 30) return;
  const href = `${CONTENT_ROOT}day-${String(day).padStart(2, '0')}.json`;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preload'; link.as = 'fetch'; link.crossOrigin = 'anonymous'; link.href = href;
  document.head.appendChild(link);
  const idle = window.requestIdleCallback || ((callback) => setTimeout(callback, 300));
  idle(() => fetch(href).catch(() => {}));
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  document.querySelector('#themeButton').textContent = theme === 'dark' ? '☼' : '☾';
  document.querySelector('#themeButton').setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  saveState();
}

function setView(name) {
  Object.values({home:elements.home,days:elements.days,day:elements.day,flashcards:elements.flashcards,quiz:elements.quiz,stats:elements.stats,reference:elements.reference,placeholder:elements.placeholder})
    .forEach((view) => { view.hidden = true; });
  elements[name].hidden = false;
  elements.back.hidden = name === 'home';
  document.querySelectorAll('.bottom-nav button').forEach((button) => {
    const selected = button.dataset.route === name || (name === 'day' && button.dataset.route === 'days');
    if (selected) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}

async function loadCards() {
  if (allCards) {
    (state.customCards || []).forEach((card) => {
      if (!allCards.some((item) => item.id === card.id)) allCards.push(card);
    });
    return allCards;
  }
  const response = await fetch(`${CONTENT_ROOT}cards.json`);
  if (!response.ok) throw new Error('Flashcard deck unavailable');
  allCards = [...(await response.json()).cards, ...(state.customCards || [])];
  return allCards;
}

async function loadQuizzes() {
  if (allQuizzes) return allQuizzes;
  const response = await fetch(`${CONTENT_ROOT}quizzes.json`);
  if (!response.ok) throw new Error('Quiz data unavailable');
  allQuizzes = (await response.json()).quizzes;
  return allQuizzes;
}

async function loadTests() {
  if (allTests) return allTests;
  const response = await fetch(`${CONTENT_ROOT}tests.json`);
  if (!response.ok) throw new Error('Test data unavailable');
  allTests = (await response.json()).tests;
  return allTests;
}

async function loadReference() {
  if (referenceData) return referenceData;
  const response = await fetch(`${CONTENT_ROOT}reference.json`);
  if (!response.ok) throw new Error('Reference data unavailable');
  referenceData = await response.json();
  return referenceData;
}

function normalizeAnswer(value) {
  return value.toLowerCase().trim().replace(/[.,!?;:„“"'()[\]]/g,'').replace(/[=/–—-]/g,' ').replace(/ä|ae/g,'a').replace(/ö|oe/g,'o').replace(/ü|ue/g,'u').replace(/ß/g,'ss').replace(/\s+/g,' ');
}

function preferredScrollBehavior() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function quizAnswerVariants(question) {
  const variants = [question.answer, question.answer.replace(/\([^)]*\)/g,'').trim()];
  if (!/two|difference|what are|three|four|4 parts/i.test(question.prompt) && /\s\/\s/.test(question.answer)) {
    variants.push(...question.answer.split(/\s\/\s/));
  }
  const inline = /^(.*)\b([^/\s]+)\/([^/\s]+)(.*)$/.exec(question.answer);
  if (inline) variants.push(`${inline[1]}${inline[2]}${inline[4]}`,`${inline[1]}${inline[3]}${inline[4]}`);
  return [...new Set(variants.map(normalizeAnswer).filter(Boolean))];
}

function quizAnswerCorrect(value, question) {
  return quizAnswerVariants(question).includes(normalizeAnswer(value));
}

function acceptedAnswerCorrect(value, acceptedAnswers) {
  const normalized = normalizeAnswer(value);
  if (!normalized) return false;
  return acceptedAnswers.some((answer) => {
    const expected = normalizeAnswer(answer);
    if (normalized === expected) return true;
    if (expected.length < 12 || normalized.length < expected.length * .65) return false;
    const tokens = expected.split(' ').filter((token) => token.length > 1);
    return tokens.length > 1 && tokens.filter((token) => normalized.includes(token)).length / tokens.length >= .8;
  });
}

function renderHardest() {
  const cards = srsApi.hardestCards(allCards || [], state.srs || {});
  document.querySelector('#hardestCards').innerHTML = cards.length
    ? cards.map((card) => `<div class="hard-card"><strong>${escapeHtml(card.german)}</strong><span>${state.srs[card.id].lapses || 0} misses</span></div>`).join('')
    : '<p class="lede">No difficult cards yet.</p>';
}

function paintReviewCard() {
  const session = document.querySelector('#reviewSession'),empty = document.querySelector('#reviewEmpty');
  if (reviewIndex >= reviewQueue.length) {
    session.hidden = true; empty.hidden = false; renderHardest(); return;
  }
  session.hidden = false; empty.hidden = true;
  const card = reviewQueue[reviewIndex],record = state.srs[card.id] || {};
  const reviewCard = document.querySelector('#reviewCard');
  reviewCard.classList.remove('revealed');
  document.querySelector('#reviewPrompt').textContent = card.prompt;
  document.querySelector('#reviewAnswer').textContent = card.answer;
  document.querySelector('#reviewAnswer').hidden = true;
  document.querySelector('#reviewStatus').textContent = srsApi.cardStatus(record);
  document.querySelector('#gradeButtons').hidden = true;
  document.querySelector('#revealAnswer').hidden = document.querySelector('#typeMode').checked;
  document.querySelector('#typeAnswerArea').hidden = !document.querySelector('#typeMode').checked;
  document.querySelector('#typedAnswer').value = '';
  document.querySelector('#cardStats').textContent = record.reps ? `${record.reps} reviews · ${record.lapses || 0} misses · stability ${Math.round(record.stability || 0)} days` : 'First review';
  document.querySelector('#flashcardsMeta').textContent = `${reviewIndex + 1} of ${reviewQueue.length} · Day ${card.day} · ${card.direction === 'en-de' ? 'English → German' : 'German → English'}`;
}

function revealReviewCard() {
  if (reviewIndex >= reviewQueue.length) return;
  const card = reviewQueue[reviewIndex];
  document.querySelector('#reviewCard').classList.add('revealed');
  document.querySelector('#reviewAnswer').hidden = false;
  document.querySelector('#gradeButtons').hidden = false;
  document.querySelector('#revealAnswer').hidden = true;
  speakGerman(card.german, 1);
}

async function renderFlashcards() {
  await Promise.all([loadCards(), loadSrsApi()]);
  state.srs ||= {};
  reviewQueue = srsApi.buildQueue(allCards, state.srs, nextDay(), Date.now(), 15);
  reviewIndex = 0;
  elements.title.textContent = 'Flashcards';
  elements.eyebrow.textContent = `${reviewQueue.length} due today`;
  setView('flashcards');
  renderHardest();
  paintReviewCard();
}

function gradeCurrent(grade) {
  const card = reviewQueue[reviewIndex];
  if (!card) return;
  state.srs[card.id] = srsApi.scheduleCard(state.srs[card.id], grade);
  state.cardsReviewed = (state.cardsReviewed || 0) + 1;
  if (grade === 'again') reviewQueue.push(card);
  reviewIndex += 1;
  saveState(true);
  paintReviewCard();
}

function addQuizMistakeCard(quiz, question) {
  state.customCards ||= [];
  const id = `mistake-${quiz.id}-${question.id}`;
  if (state.customCards.some((card) => card.id === id)) return;
  const card = { id,sourceId:id,day:quiz.day,direction:'mistake',prompt:question.prompt,answer:question.answer,german:question.answer,english:question.prompt };
  state.customCards.push(card);
  if (allCards) allCards.push(card);
}

function addTestMistakeCard(test, question) {
  state.customCards ||= [];
  const id = `test-mistake-${test.id}-${question.id}`;
  if (state.customCards.some((card) => card.id === id)) return;
  const answer = question.answers.join(' / ');
  const card = { id,sourceId:id,day:test.day,direction:'mistake',prompt:question.prompt,answer,german:answer,english:question.prompt };
  state.customCards.push(card);
  if (allCards) allCards.push(card);
}

function assessmentPassed(day) {
  if (state.completedDays.includes(day) || state.assessmentComplete?.[day]) return true;
  const quizPass = (state.quizResults || []).some((result) =>
    result.day === day && (result.passed === true || (result.passed == null && result.percent >= 80)));
  const testPass = (state.testResults || []).some((result) => {
    const fallbackThreshold = day === 30 ? 60 : 75;
    return result.day === day && (result.passed === true || (result.passed == null && result.percent >= fallbackThreshold));
  });
  return quizPass || testPass;
}

function markAssessmentPassed(day) {
  state.assessmentComplete ||= {};
  state.assessmentComplete[day] = true;
}

function bestAssessmentResult(day) {
  return [...(state.quizResults || []), ...(state.testResults || [])]
    .filter((result) => result.day === day)
    .sort((a, b) => b.percent - a.percent)[0];
}

function assessmentReturnButton(day) {
  return `<button type="button" class="secondary-button return-to-lesson" data-return-day="${day}">Return to Day ${day}</button>`;
}

function wireAssessmentReturn(body) {
  body.querySelector('[data-return-day]')?.addEventListener('click', (event) => {
    pendingSectionId = 'assessment';
    navigate(`day/${event.currentTarget.dataset.returnDay}`);
  });
}

function renderQuiz(quiz) {
  const body = document.querySelector('#quizBody');
  const answers = new Map();
  body.dataset.day = quiz.day;
  body.innerHTML = renderMatchingWarmup(quiz) + quiz.questions.map((question, index) => {
    const control = question.type === 'choice'
      ? `<div class="choice-grid">${question.choices.map((choice) => `<button type="button" class="choice-option" data-choice="${escapeHtml(choice)}">${escapeHtml(choice)}</button>`).join('')}</div><button type="button" class="quiz-check" data-check>Check</button>`
      : question.type === 'reorder'
      ? `<div class="word-answer" aria-label="Your sentence"></div><div class="word-bank">${question.tokens.map((token) => `<button type="button" class="word-chip">${escapeHtml(token)}</button>`).join('')}</div><button type="button" class="quiz-check" data-check>Check order</button>`
      : `<div class="quiz-input-row"><input type="text" lang="de" autocapitalize="off" aria-label="Answer question ${index + 1}"><button type="button" class="quiz-check" data-check>Check</button></div>`;
    return `<article class="quiz-question" data-question="${question.id}"><h2>${index + 1}. ${escapeHtml(question.prompt)}</h2>${control}<div class="quiz-feedback" aria-live="polite"></div></article>`;
  }).join('') + '<button type="button" class="primary-button" id="finishQuiz">Finish quiz <span>→</span></button><div id="quizResult"></div>';
  wireMatchingWarmup(body);
  quiz.questions.forEach((question) => {
    const card = body.querySelector(`[data-question="${question.id}"]`);
    card.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => {
      card.querySelectorAll('[data-choice]').forEach((item) => item.classList.toggle('selected', item === button));
      answers.set(question.id, button.dataset.choice);
    }));
    card.querySelectorAll('.word-chip').forEach((button) => button.addEventListener('click', () => {
      const answer = card.querySelector('.word-answer'),bank=card.querySelector('.word-bank');
      (button.parentElement === bank ? answer : bank).appendChild(button);
    }));
    const check = () => {
      const selected = answers.get(question.id);
      const value = question.type === 'choice' ? (typeof selected === 'string' ? selected : selected?.value || '')
        : question.type === 'reorder' ? [...card.querySelectorAll('.word-answer .word-chip')].map((chip) => chip.textContent).join(' ')
        : card.querySelector('input').value;
      const correct = quizAnswerCorrect(value, question);
      answers.set(question.id, { value, correct });
      const feedback = card.querySelector('.quiz-feedback');
      feedback.className = `quiz-feedback ${correct ? 'good' : 'bad'}`;
      feedback.innerHTML = `${correct ? 'Correct.' : `Correct answer: <b>${escapeHtml(question.answer)}</b>`}<span class="quiz-explanation">${escapeHtml(question.explanation)}</span>`;
      if (!correct) addQuizMistakeCard(quiz, question);
      saveState(true);
    };
    card.querySelector('[data-check]').addEventListener('click', check);
    card.querySelector('input')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') check(); });
  });
  body.querySelector('#finishQuiz').addEventListener('click', (event) => {
    quiz.questions.forEach((question) => {
      if (!answers.get(question.id)?.correct) body.querySelector(`[data-question="${question.id}"] [data-check]`).click();
    });
    const score = quiz.questions.filter((question) => answers.get(question.id)?.correct).length;
    event.currentTarget.disabled = true;
    state.quizResults ||= [];
    const passed = score >= quiz.threshold;
    state.quizResults.push({ quizId:quiz.id,day:quiz.day,score,total:quiz.questions.length,percent:Math.round(score / quiz.questions.length * 100),passed,at:new Date().toISOString() });
    if (passed) markAssessmentPassed(quiz.day);
    saveState(true);
    body.querySelector('#quizResult').innerHTML = `<div class="quiz-result"><span class="eyebrow">${passed ? 'Lesson check passed' : 'Keep practising'}</span><strong>${score}/${quiz.questions.length}</strong><p>${passed ? `Good work. Day ${quiz.day} progress is updated.` : 'Wrong answers are now in your flashcard review queue.'}</p><button type="button" class="primary-button" data-retake>Retake quiz <span>↻</span></button>${assessmentReturnButton(quiz.day)}</div>`;
    body.querySelector('[data-retake]').addEventListener('click', () => renderQuiz(quiz));
    wireAssessmentReturn(body);
    body.querySelector('#quizResult').scrollIntoView({ behavior:preferredScrollBehavior(),block:'center' });
  });
}

function matchingCardsForDay(day) {
  return (allCards || [])
    .filter((card) => card.day === day && card.direction === 'en-de')
    .filter((card, index, cards) => cards.findIndex((item) => item.sourceId === card.sourceId) === index)
    .slice(0, 4);
}

function renderMatchingWarmup(quiz) {
  const cards = matchingCardsForDay(quiz.day);
  if (cards.length < 2) return '';
  const right = [...cards.slice(1), cards[0]];
  return `<article class="quiz-question matching-question" data-matching>
    <p class="eyebrow">Vocabulary warm-up</p>
    <h2>Match the German and English</h2>
    <div class="matching-grid">
      <div class="matching-column" aria-label="German words">${cards.map((card) => `<button type="button" class="match-option" data-match-side="left" data-pair="${card.sourceId}">${escapeHtml(card.german)}</button>`).join('')}</div>
      <div class="matching-column" aria-label="English meanings">${right.map((card) => `<button type="button" class="match-option" data-match-side="right" data-pair="${card.sourceId}">${escapeHtml(card.english)}</button>`).join('')}</div>
    </div>
    <div class="quiz-feedback" aria-live="polite">Choose one item from each column.</div>
  </article>`;
}

function wireMatchingWarmup(body) {
  const warmup = body.querySelector('[data-matching]');
  if (!warmup) return;
  let left;
  let right;
  const feedback = warmup.querySelector('.quiz-feedback');
  const totalPairs = matchingCardsForDay(Number(body.dataset.day)).length;
  warmup.querySelectorAll('.match-option').forEach((button) => button.addEventListener('click', () => {
    const side = button.dataset.matchSide;
    warmup.querySelectorAll(`[data-match-side="${side}"]:not(.matched)`).forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
    if (side === 'left') left = button; else right = button;
    if (!left || !right) return;
    if (left.dataset.pair === right.dataset.pair) {
      left.classList.add('matched'); right.classList.add('matched');
      left.disabled = true; right.disabled = true;
      feedback.className = 'quiz-feedback good';
      feedback.textContent = warmup.querySelectorAll('.matched').length === totalPairs * 2 ? 'All pairs matched.' : 'Correct pair.';
    } else {
      feedback.className = 'quiz-feedback bad';
      feedback.textContent = 'Not a match. Try those two again.';
    }
    left.classList.remove('selected'); right.classList.remove('selected');
    left = undefined; right = undefined;
  }));
}

async function renderQuizHub() {
  await Promise.all([loadQuizzes(), loadTests(), loadCards()]);
  const unlocked = allQuizzes.filter((quiz) => quiz.day <= nextDay());
  const unlockedTests = allTests.filter((test) => test.day <= nextDay());
  const picker = document.querySelector('#quizPicker');
  picker.innerHTML = '<optgroup label="Lesson quizzes">'+unlocked.map((quiz) => `<option value="${quiz.id}">Day ${quiz.day} · Mini quiz</option>`).join('')+'</optgroup>'+
    (unlockedTests.length?'<optgroup label="Tests">'+unlockedTests.map((test)=>`<option value="${test.id}">Day ${test.day} · ${escapeHtml(test.title)}</option>`).join('')+'</optgroup>':'');
  const requestedQuiz = unlocked.find((quiz) => quiz.day === pendingAssessmentDay);
  const requestedTest = unlockedTests.find((test) => test.day === pendingAssessmentDay);
  const preferred = requestedQuiz || requestedTest || unlocked.find((quiz) => quiz.day === nextDay()) || unlocked.at(-1) || allQuizzes[0];
  picker.value = preferred.id;
  picker.onchange = () => {
    const quiz = unlocked.find((item) => item.id === picker.value);
    if (quiz) renderQuiz(quiz); else renderTest(unlockedTests.find((item) => item.id === picker.value));
  };
  elements.title.textContent = 'Quiz';
  elements.eyebrow.textContent = `${unlocked.length} unlocked`;
  setView('quiz');
  if (requestedTest) renderTest(requestedTest); else renderQuiz(preferred);
  pendingAssessmentDay = undefined;
}

function renderTest(test) {
  const body = document.querySelector('#quizBody');
  const objectiveHtml = test.objectiveSections.map((section) => `<section class="auto-test-section"><h3>${escapeHtml(section.title)}</h3>${section.questions.map((question) => `<div class="auto-test-question" data-auto-question="${question.id}"><label><span>${escapeHtml(question.prompt)}</span><small>${question.points} ${question.points === 1 ? 'point' : 'points'}</small><input type="text" autocomplete="off" aria-label="${escapeHtml(question.prompt)}"></label><div class="quiz-feedback" aria-live="polite"></div></div>`).join('')}</section>`).join('');
  const selfHtml = test.selfSections.map((section, index) => `<section class="self-test-section"><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.guide)}</p><label>Draft or notes<textarea rows="5" data-self-work="${index}" placeholder="Write your response or review notes here…"></textarea></label><label class="self-score">Self-score <input type="number" min="0" max="${section.maxScore}" value="0" inputmode="numeric" data-self-score="${index}"> / ${section.maxScore}</label></section>`).join('');
  body.innerHTML = `<div class="test-paper"><span class="eyebrow">Day ${test.day} · ${test.maxScore} points</span><h2>${escapeHtml(test.title)}</h2><div class="test-score-split"><span>${test.objectiveMax} auto-scored</span><span>${test.selfMax} honestly self-scored</span></div><details class="original-test-paper"><summary>View the original test brief</summary>${test.taskHtml.map(cleanSectionHtml).join('')}</details><div class="auto-test"><h2>Auto-scored section</h2><p>Answer every objective item. Small punctuation and umlaut substitutions are accepted; fragments are not.</p>${objectiveHtml}<button type="button" class="primary-button" data-grade-objective>Check objective answers <span>→</span></button></div><div class="answer-panel" hidden><h2>Original answer key</h2>${cleanSectionHtml(test.keyHtml)}<div class="objective-result" aria-live="polite"></div><div class="self-test"><h2>Production tasks</h2><p>Only writing and speaking require your judgment. Use the original rubric, then enter an honest score.</p>${selfHtml}</div><div class="test-total" aria-live="polite"></div><button type="button" class="primary-button" data-save-test>Save final result <span>→</span></button><div class="quiz-feedback final-test-feedback" aria-live="polite"></div></div></div>`;
  const panel = body.querySelector('.answer-panel');
  let objectiveScore = 0;
  const selfScore = () => [...panel.querySelectorAll('[data-self-score]')].reduce((sum, input) => {
    const value = Math.max(0, Math.min(Number(input.max), Number(input.value) || 0));
    input.value = value;
    return sum + value;
  }, 0);
  const updateTestTotal = () => {
    const total = objectiveScore + selfScore();
    panel.querySelector('.test-total').innerHTML = `<span>Current total</span><strong>${total}/${test.maxScore}</strong><small>Pass mark: ${test.passScore}</small>`;
  };
  body.querySelector('[data-grade-objective]').addEventListener('click', (event) => {
    objectiveScore = 0;
    test.objectiveSections.flatMap((section) => section.questions).forEach((question) => {
      const row = body.querySelector(`[data-auto-question="${question.id}"]`);
      const correct = acceptedAnswerCorrect(row.querySelector('input').value, question.answers);
      if (correct) objectiveScore += question.points;
      else addTestMistakeCard(test, question);
      const feedback = row.querySelector('.quiz-feedback');
      feedback.className = `quiz-feedback ${correct ? 'good' : 'bad'}`;
      feedback.textContent = correct ? `Correct · +${question.points}` : `Answer: ${question.answers.join(' / ')}`;
    });
    event.currentTarget.disabled = true;
    panel.hidden = false;
    panel.querySelector('.objective-result').innerHTML = `<strong>${objectiveScore}/${test.objectiveMax}</strong><span>objective points</span>`;
    updateTestTotal();
    saveState(true);
    panel.scrollIntoView({behavior:preferredScrollBehavior(),block:'start'});
  });
  panel.querySelectorAll('[data-self-score]').forEach((input) => input.addEventListener('input', updateTestTotal));
  body.querySelector('[data-save-test]').addEventListener('click', (event) => {
    const score = objectiveScore + selfScore();
    state.testResults ||= [];
    const pass = score >= test.passScore,feedback=panel.querySelector('.final-test-feedback');
    event.currentTarget.disabled = true;
    state.testResults.push({testId:test.id,day:test.day,score,total:test.maxScore,objectiveScore,selfScore:selfScore(),percent:Math.round(score/test.maxScore*100),passed:pass,at:new Date().toISOString()});
    if (pass) markAssessmentPassed(test.day);
    saveState(true);
    feedback.className=`quiz-feedback ${pass?'good':'bad'}`;
    feedback.innerHTML=pass
      ? `Passed — ${score}/${test.maxScore}. Day ${test.day} progress is updated.${assessmentReturnButton(test.day)}`
      : `${score}/${test.maxScore}. Review the corrections and retry the objective section.${assessmentReturnButton(test.day)}<button type="button" class="secondary-button" data-retest>Retake test</button>`;
    wireAssessmentReturn(body);
    body.querySelector('[data-retest]')?.addEventListener('click', () => renderTest(test));
  });
}

function updateChrome(day = null) {
  const complete = state.completedDays.length;
  const dayInfo = day ? manifest.days[day - 1] : null;
  const dayDone = day ? Object.keys(state.sectionProgress[day] || {}).length : 0;
  const sectionTotal = dayInfo ? dayInfo.sectionCount + (dayInfo.types.includes('speaking') ? 0 : 1) : 1;
  const dayRatio = day && state.completedDays.includes(day) ? 1 : Math.min(1, dayDone / Math.max(1, sectionTotal));
  elements.progress.style.width = day ? `${dayRatio * 100}%` : `${complete / 30 * 100}%`;
  elements.eyebrow.textContent = day ? `Day ${day} of 30` : 'Deutschweg · A1';
  elements.title.textContent = day ? manifest.days[day - 1].title.replace(/^Day \d+ [—·-]\s*/, '') : 'Your 30-day journey';
  if (day) refreshLessonProgress(day);
}

function refreshLessonProgress(day) {
  const dayInfo = manifest.days[day - 1];
  const total = dayInfo.sectionCount + (dayInfo.types.includes('speaking') ? 0 : 1);
  const completed = Math.min(total, Object.keys(state.sectionProgress[day] || {}).length);
  const progressCopy = document.querySelector('#lessonProgressCopy');
  const speakingCopy = document.querySelector('#lessonSpeakingCopy');
  const assessmentCopy = document.querySelector('#lessonAssessmentCopy');
  if (progressCopy) progressCopy.textContent = `${completed} of ${total} sections complete`;
  if (speakingCopy) {
    const speakingDone = Boolean(state.speakingLessons?.[day]?.complete);
    speakingCopy.textContent = speakingDone ? 'Speaking complete ✓' : 'Speaking still to do';
    speakingCopy.classList.toggle('complete', speakingDone);
  }
  if (assessmentCopy) {
    const assessmentDone = assessmentPassed(day);
    assessmentCopy.textContent = assessmentDone ? 'Quiz complete ✓' : 'Quiz still to do';
    assessmentCopy.classList.toggle('complete', assessmentDone);
  }
  refreshDayCompletionButton(day);
}

function refreshDayCompletionButton(day) {
  const button = document.querySelector('.complete-day');
  if (!button || activeDay !== day) return;
  if (state.completedDays.includes(day)) {
    button.textContent = 'Day complete ✓';
    button.classList.remove('needs-requirements');
    return;
  }
  const speakingDone = Boolean(state.speakingLessons?.[day]?.complete);
  const assessmentDone = assessmentPassed(day);
  if (speakingDone && assessmentDone) button.textContent = 'Finish this day →';
  else if (!speakingDone && !assessmentDone) button.textContent = 'Complete speaking and quiz to finish';
  else if (!speakingDone) button.textContent = 'Complete speaking to finish';
  else button.textContent = 'Pass the lesson quiz to finish';
  button.classList.toggle('needs-requirements', !speakingDone || !assessmentDone);
}

function renderHome() {
  const day = nextDay();
  const info = manifest.days[day - 1];
  const total = info.sectionCount + (info.types.includes('speaking') ? 0 : 1);
  const completed = Math.min(total, Object.keys(state.sectionProgress[day] || {}).length);
  const started = completed > 0 || Boolean(state.speakingLessons?.[day]) || Boolean(bestAssessmentResult(day));
  document.querySelector('#continueEyebrow').textContent = `${started ? 'Continue' : 'Today'} · Day ${day}`;
  document.querySelector('#continueTitle').textContent = info.title.replace(/^Day \d+ [—·-]\s*/, '');
  document.querySelector('#continueGoal').textContent = info.goal.replace(/^🎯\s*/, '');
  document.querySelector('#continueProgress').textContent = started
    ? `${completed}/${total} sections · ${state.speakingLessons?.[day]?.complete ? 'speaking done' : 'speaking due'} · ${assessmentPassed(day) ? 'quiz done' : 'quiz due'}`
    : 'A fresh lesson is ready when you are.';
  document.querySelector('#daysComplete').textContent = state.completedDays.length;
  document.querySelector('#coursePercent').textContent = `${Math.round(state.completedDays.length / 30 * 100)}%`;
  document.querySelector('#studyDays').textContent = state.activityDays.length;
  document.querySelector('#dueToday').textContent = '…';
  Promise.all([loadCards(), loadSrsApi()]).then(([cards, srs]) => {
    document.querySelector('#dueToday').textContent = srs.buildQueue(cards, state.srs || {}, day, Date.now(), 15).length;
  }).catch(() => { document.querySelector('#dueToday').textContent = '—'; });
  document.querySelector('#continueButton').innerHTML = `${started ? 'Continue' : 'Start'} lesson <span>→</span>`;
  document.querySelector('#continueButton').onclick = () => navigate(`day/${day}`);
  updateChrome();
  setView('home');
}

function scoreEntries() {
  return [...(state.quizResults || []).map((result) => ({...result,label:`Day ${result.day} quiz`})),
    ...(state.testResults || []).map((result) => ({...result,label:result.day === 30 ? 'A1 mock' : `Day ${result.day} test`}))].sort((a,b) => new Date(a.at) - new Date(b.at));
}

function weakTopicEntries() {
  const counts = new Map();
  const add = (topic, amount = 1) => counts.set(topic, (counts.get(topic) || 0) + amount);
  (state.listeningMistakes || []).forEach((mistake) => add(`Day ${mistake.day} listening`));
  (state.customCards || []).forEach((card) => {
    if (!String(card.id).startsWith('speaking-')) add(`Day ${card.day} quiz`);
  });
  (state.speakingWeakList || []).filter((item) => !item.resolvedAt).forEach((item) => add(`${item.category} · Day ${item.day}`));
  Object.entries(state.srs || {}).forEach(([id, record]) => {
    if (!(record.lapses > 0)) return;
    const card = allCards?.find((item) => item.id === id);
    add(card ? `Day ${card.day} flashcards` : 'Flashcards', record.lapses);
  });
  return [...counts].sort((a,b) => b[1] - a[1]).slice(0,8);
}

function speakingReviewItems() {
  return (state.speakingWeakList || [])
    .filter((item) => state.speakingLessons?.[item.day]?.complete || state.completedDays.includes(item.day))
    .sort((a, b) => Number(Boolean(a.resolvedAt)) - Number(Boolean(b.resolvedAt)) || new Date(b.at) - new Date(a.at));
}

function speakingMistakeCard(item, resolved = false) {
  return `<article class="speaking-mistake ${resolved ? 'resolved' : ''}" data-speaking-mistake="${escapeHtml(item.id)}">
    <div class="mistake-meta"><span>${escapeHtml(item.category)}</span><span>Day ${item.day}</span></div>
    <strong>${escapeHtml(item.issue)}</strong>
    <div class="mistake-correction" data-correction ${resolved ? '' : 'hidden'}>
      <span>Correction</span><p lang="de">${escapeHtml(item.correction)}</p>
    </div>
    ${resolved ? '<span class="resolved-label">Resolved ✓</span>' : `<div class="mistake-actions">
      <button type="button" data-reveal aria-label="Show correction for ${escapeHtml(item.issue)}">Show correction</button>
      <button type="button" data-hear aria-label="Hear correction for ${escapeHtml(item.issue)}">Hear</button>
      <button type="button" data-practise aria-label="Open Day ${item.day} speaking lesson">Open lesson</button>
      <button type="button" data-resolve aria-label="Mark this speaking mistake resolved">Mark resolved</button>
    </div>`}
  </article>`;
}

function renderSpeakingMistakes() {
  const items = speakingReviewItems();
  const active = items.filter((item) => !item.resolvedAt);
  const resolved = items.filter((item) => item.resolvedAt);
  document.querySelector('#speakingMistakeCount').textContent = `${active.length} active`;
  document.querySelector('#speakingMistakes').innerHTML = active.length
    ? active.map((item) => speakingMistakeCard(item)).join('') +
      (resolved.length ? `<details class="resolved-mistakes"><summary>${resolved.length} resolved</summary>${resolved.map((item) => speakingMistakeCard(item, true)).join('')}</details>` : '')
    : `<div class="empty-review"><strong>${resolved.length ? 'No active speaking mistakes.' : 'Your Speaking Review is clear.'}</strong><p>${resolved.length ? 'Resolved items remain below as a record.' : 'Lesson mistakes you save will appear here for focused review.'}</p></div>${resolved.length ? `<details class="resolved-mistakes"><summary>${resolved.length} resolved</summary>${resolved.map((item) => speakingMistakeCard(item, true)).join('')}</details>` : ''}`;
  document.querySelectorAll('[data-speaking-mistake]').forEach((card) => {
    const item = items.find((entry) => entry.id === card.dataset.speakingMistake);
    if (!item || item.resolvedAt) return;
    card.querySelector('[data-reveal]').addEventListener('click', (event) => {
      const correction = card.querySelector('[data-correction]');
      correction.hidden = !correction.hidden;
      event.currentTarget.textContent = correction.hidden ? 'Show correction' : 'Hide correction';
    });
    card.querySelector('[data-hear]').addEventListener('click', () => speakGerman(item.correction, .85));
    card.querySelector('[data-practise]').addEventListener('click', () => {
      pendingSectionId = 'speaking';
      navigate(`day/${item.day}`);
    });
    card.querySelector('[data-resolve]').addEventListener('click', () => {
      item.resolvedAt = new Date().toISOString();
      saveState(true);
      renderStats();
    });
  });
}

async function renderStats() {
  await loadCards();
  const scores = scoreEntries();
  const sectionTotal = Object.values(state.sectionProgress).reduce((sum, sections) => sum + Object.keys(sections || {}).length, 0);
  const stats = [
    [calculateStreak(state.activityDays),'day streak'],
    [state.completedDays.length,'days complete'],
    [sectionTotal,'sections complete'],
    [state.cardsReviewed || 0,'cards reviewed'],
    [scores.length,'quiz/test attempts'],
    [state.activityDays.length,'total study days'],
  ];
  document.querySelector('#statGrid').innerHTML = stats.map(([value,label]) => `<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`).join('');
  document.querySelector('#scoreTimeline').innerHTML = scores.length
    ? scores.slice(-12).map((score) => `<div class="score-row"><span>${escapeHtml(score.label)}</span><div class="score-track"><i style="width:${score.percent}%"></i></div><strong>${score.percent}%</strong></div>`).join('')
    : '<p class="lede">Complete a quiz to start your score history.</p>';
  const weak = weakTopicEntries();
  document.querySelector('#weakTopics').innerHTML = weak.length
    ? weak.map(([topic,count]) => `<div class="weak-row"><strong>${escapeHtml(topic)}</strong><span>${count} misses</span></div>`).join('')
    : '<p class="lede">No weak topics recorded yet.</p>';
  renderSpeakingMistakes();
  renderRecoveryOption();
  elements.title.textContent = 'Stats';
  elements.eyebrow.textContent = `${calculateStreak(state.activityDays)} day streak`;
  setView('stats');
}

function paintGlossary() {
  const query = normalizeAnswer(document.querySelector('#glossaryQuery').value);
  const article = document.querySelector('#articleFilter').value;
  const day = Number(document.querySelector('#dayFilter').value) || 0;
  const sort = document.querySelector('#glossarySort').value;
  let rows = referenceData.glossary.filter((entry) =>
    (!query || normalizeAnswer(`${entry.german} ${entry.english}`).includes(query)) &&
    (!article || entry.article === article) && (!day || entry.day === day));
  rows = rows.sort((a,b) => sort === 'german' ? a.german.localeCompare(b.german,'de') : sort === 'english' ? a.english.localeCompare(b.english) : a.day - b.day);
  document.querySelector('#referenceBody').innerHTML = rows.map((entry) => `<div class="glossary-row" data-article="${entry.article}"><strong lang="de">${escapeHtml(entry.german)}</strong><span>${escapeHtml(entry.english)}</span><small>Day ${entry.day} <button type="button" class="speak-button" data-say="${escapeHtml(entry.german)}" aria-label="Hear ${escapeHtml(entry.german)}">▶</button></small></div>`).join('') || '<p class="lede">No matching words.</p>';
  document.querySelectorAll('#referenceBody [data-say]').forEach((button) => button.addEventListener('click', () => speakGerman(button.dataset.say,1)));
}

function paintGrammarReference() {
  document.querySelector('#referenceBody').innerHTML = referenceData.grammar.map((entry) => `<details class="grammar-ref"><summary>Day ${entry.day} · ${escapeHtml(entry.title.replace(/^[^A-Za-zÄÖÜ]+/,''))}</summary><div class="grammar-ref-body">${cleanSectionHtml(entry.html)}</div></details>`).join('');
}

function setReferenceTab(tab) {
  referenceTab = tab;
  document.querySelector('#referenceTitle').textContent = tab === 'glossary' ? 'Glossary' : 'Grammar';
  document.querySelector('#glossaryControls').hidden = tab !== 'glossary';
  document.querySelectorAll('[data-reference-tab]').forEach((button) => button.classList.toggle('active',button.dataset.referenceTab===tab));
  if (tab === 'glossary') paintGlossary(); else paintGrammarReference();
}

async function renderReference(tab = 'glossary') {
  await loadReference();
  const dayFilter = document.querySelector('#dayFilter');
  if (dayFilter.options.length === 1) dayFilter.innerHTML += Array.from({length:30},(_,index)=>`<option value="${index+1}">Day ${index+1}</option>`).join('');
  elements.title.textContent = tab === 'grammar' ? 'Grammar reference' : 'Glossary';
  elements.eyebrow.textContent = `${referenceData.glossary.length} words`;
  setView('reference');
  setReferenceTab(tab);
}

async function openGlobalSearch() {
  await loadReference();
  const overlay = document.querySelector('#searchOverlay');
  overlay.hidden = false;
  const input = document.querySelector('#globalSearch');
  input.value = '';
  document.querySelector('#searchResults').innerHTML = '<p class="lede">Search vocabulary and grammar from all 30 days.</p>';
  input.focus();
}

function runGlobalSearch(value) {
  const query = normalizeAnswer(value);
  const results = query.length < 2 ? [] : referenceData.search.filter((entry) => normalizeAnswer(`${entry.title} ${entry.text}`).includes(query)).slice(0,30);
  document.querySelector('#searchResults').innerHTML = results.length
    ? results.map((entry) => `<button type="button" class="search-result" data-day="${entry.day}" data-section="${entry.sectionId}"><span>${escapeHtml(entry.title)}</span><small>${entry.kind} · Day ${entry.day} · ${escapeHtml(entry.text.slice(0,100))}</small></button>`).join('')
    : '<p class="lede">No matches yet.</p>';
  document.querySelectorAll('.search-result').forEach((button) => button.addEventListener('click', () => {
    pendingSectionId = button.dataset.section;
    document.querySelector('#searchOverlay').hidden = true;
    navigate(`day/${button.dataset.day}`);
  }));
}

function exportProgress() {
  const payload = { app:'Deutschweg A1',schemaVersion:2,exportedAt:new Date().toISOString(),state };
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;link.download = `deutschweg-progress-${shiftedDateKey()}.json`;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}

function progressSummary(value) {
  const sections = Object.values(value.sectionProgress || {}).reduce((sum, items) => sum + Object.keys(items || {}).length, 0);
  const attempts = (value.quizResults || []).length + (value.testResults || []).length;
  return `${value.completedDays.length} days · ${sections} sections · ${attempts} assessment attempts`;
}

function readRecovery() {
  try {
    const payload = JSON.parse(localStorage.getItem(RECOVERY_KEY) || 'null');
    return payload?.state && validateImportedState(payload.state) ? payload : null;
  } catch {
    return null;
  }
}

function renderRecoveryOption() {
  const payload = readRecovery();
  const button = document.querySelector('#recoverImport');
  const info = document.querySelector('#recoveryInfo');
  button.hidden = !payload;
  info.textContent = payload ? `Recovery point: ${progressSummary(payload.state)}` : '';
}

async function importProgress(file) {
  const feedback = document.querySelector('#importFeedback');
  const preview = document.querySelector('#importPreview');
  try {
    if (file.size > 5_000_000) throw new Error('This backup is too large to be a Deutschweg progress file.');
    const payload = JSON.parse(await file.text());
    const imported = payload.state || payload;
    if (!validateImportedState(imported)) throw new Error('This is not a valid Deutschweg progress file.');
    pendingImportState = normalizeImportedState(imported);
    document.querySelector('#importSummary').textContent = `${file.name} · ${progressSummary(pendingImportState)}`;
    preview.hidden = false;
    feedback.className = 'quiz-feedback';
    feedback.textContent = 'Nothing has changed yet. Check the summary, then confirm the restore.';
  } catch (error) {
    pendingImportState = undefined;
    preview.hidden = true;
    feedback.className = 'quiz-feedback bad';
    feedback.textContent = error.message;
  }
}

function confirmImport() {
  if (!pendingImportState) return;
  const feedback = document.querySelector('#importFeedback');
  try {
    localStorage.setItem(RECOVERY_KEY, JSON.stringify({ savedAt:new Date().toISOString(),state }));
    localStorage.setItem(STATE_KEY, JSON.stringify(pendingImportState));
    state = pendingImportState;
    pendingImportState = undefined;
    feedback.className = 'quiz-feedback good';
    feedback.textContent = 'Progress restored. A recovery copy of your previous progress was saved.';
    setTimeout(() => location.reload(),500);
  } catch {
    feedback.className = 'quiz-feedback bad';
    feedback.textContent = 'The browser could not save this restore. Your current progress was not changed.';
  }
}

function recoverPreviousProgress() {
  const payload = readRecovery();
  if (!payload) return;
  const feedback = document.querySelector('#importFeedback');
  try {
    const current = state;
    const recovered = normalizeImportedState(payload.state);
    localStorage.setItem(RECOVERY_KEY, JSON.stringify({ savedAt:new Date().toISOString(),state:current }));
    localStorage.setItem(STATE_KEY, JSON.stringify(recovered));
    state = recovered;
    feedback.className = 'quiz-feedback good';
    feedback.textContent = 'Previous progress recovered. Reloading…';
    setTimeout(() => location.reload(),500);
  } catch {
    feedback.className = 'quiz-feedback bad';
    feedback.textContent = 'The recovery copy could not be restored. Your current progress is unchanged.';
  }
}

function renderDays() {
  const current = nextDay();
  document.querySelector('#dayGrid').innerHTML = manifest.days.map((day) => {
    const classes = ['day-tile'];
    const complete = state.completedDays.includes(day.day);
    const inProgress = !complete && (Object.keys(state.sectionProgress[day.day] || {}).length || state.speakingLessons?.[day.day] || bestAssessmentResult(day.day));
    if (complete) classes.push('complete');
    else if (inProgress) classes.push('in-progress');
    if (day.day === current) classes.push('current');
    if (TEST_DAYS.has(day.day)) classes.push('test');
    const status = complete ? 'Complete' : inProgress ? 'In progress' : 'Not started';
    return `<button type="button" class="${classes.join(' ')}" data-day="${day.day}" aria-label="Day ${day.day}: ${escapeHtml(day.title)}. ${status}${TEST_DAYS.has(day.day) ? '. Test day' : ''}">${complete ? '✓' : day.day}</button>`;
  }).join('');
  document.querySelectorAll('.day-tile').forEach((button) => button.addEventListener('click', () => navigate(`day/${button.dataset.day}`)));
  elements.title.textContent = 'Your 30 days';
  elements.eyebrow.textContent = `${state.completedDays.length} complete`;
  setView('days');
}

function cleanSectionHtml(html) {
  return html.replace(/^<details\b[^>]*>/i, '').replace(/<\/details>\s*$/i, '').replace(/^<summary[^>]*>[\s\S]*?<\/summary>/i, '');
}

function renderSection(section, day, open = false) {
  const done = Boolean(state.sectionProgress[day]?.[section.id]);
  const wrapper = document.createElement('details');
  wrapper.className = 'section-card';
  wrapper.id = section.id;
  wrapper.dataset.type = section.type;
  wrapper.open = open;
  wrapper.innerHTML = `<summary><span class="section-icon" aria-hidden="true">${SECTION_ICONS[section.type] || '·'}</span><span class="section-title">${escapeHtml(section.title)}</span><span class="section-status">${done ? '✓' : ''}</span></summary><div class="section-body">${cleanSectionHtml(section.html)}<button type="button" class="section-complete ${done ? 'done' : ''}">${done ? 'Completed ✓' : 'Mark section complete'}</button></div>`;
  const complete = wrapper.querySelector('.section-complete');
  complete.addEventListener('click', () => {
    state.sectionProgress[day] ||= {};
    state.sectionProgress[day][section.id] = true;
    wrapper.querySelector('.section-status').textContent = '✓';
    complete.textContent = 'Completed ✓';
    complete.classList.add('done');
    saveState(true);
    updateChrome(day);
  });
  wrapper.querySelectorAll('.fc').forEach((card) => {
    card.tabIndex = 0;
    card.setAttribute('role','button');
    card.setAttribute('aria-label','Flip flashcard');
    const flip = () => card.classList.toggle('flip');
    card.addEventListener('click', flip);
    card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flip(); } });
  });
  return wrapper;
}

function addSpeechButtons(root) {
  root.querySelectorAll('.section-card[data-type="vocab"] .de,.section-card[data-type="sentences"] .de,.section-card[data-type="dialogue"] .de,.section-card[data-type="flashcards"] .de,.section-card[data-type="flashcards"] .fc .a').forEach((target) => {
    if (target.querySelector('.speak-button')) return;
    const spoken = target.textContent.replace(/🔊/g, '').trim();
    if (!spoken) return;
    target.dataset.spoken = spoken;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'speak-button';
    button.setAttribute('aria-label', `Hear German: ${spoken.slice(0, 70)}`);
    button.textContent = '▶';
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      document.querySelectorAll('.speak-button.playing').forEach((item) => item.classList.remove('playing'));
      button.classList.add('playing');
      await speakGerman(spoken, 1);
      button.classList.remove('playing');
    });
    target.appendChild(button);
  });
}

function addDialoguePlayers(root) {
  root.querySelectorAll('.section-card[data-type="dialogue"]').forEach((card) => {
    const body = card.querySelector('.section-body');
    const lines = [...body.querySelectorAll('.dlg p')].filter((line) => line.querySelector('.de'));
    if (!lines.length) return;
    const toolbar = document.createElement('div');
    toolbar.className = 'audio-toolbar';
    toolbar.innerHTML = '<button type="button" data-play>▶ Play dialogue</button><button type="button" data-stop>Stop</button><label>Speed <select aria-label="Dialogue speed"><option value="0.7">0.7×</option><option value="1" selected>1×</option></select></label>';
    body.prepend(toolbar);
    let stopped = false;
    toolbar.querySelector('[data-play]').addEventListener('click', async () => {
      stopped = false;
      const rate = Number(toolbar.querySelector('select').value);
      for (const line of lines) {
        if (stopped) break;
        lines.forEach((item) => item.classList.remove('dialogue-line-playing'));
        line.classList.add('dialogue-line-playing');
        const german = line.querySelector('.de');
        await speakGerman(german.dataset.spoken || german.textContent.replace('▶',''), rate);
      }
      lines.forEach((item) => item.classList.remove('dialogue-line-playing'));
    });
    toolbar.querySelector('[data-stop]').addEventListener('click', () => { stopped = true; stopGermanSpeech(); lines.forEach((item) => item.classList.remove('dialogue-line-playing')); });
  });
}

function normalizeGerman(value) {
  return value.toLowerCase().trim().replace(/[.,!?;:„“"']/g, '').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/\s+/g,' ');
}

function collectListeningItems(root, day) {
  const items = [...root.querySelectorAll('.section-card[data-type="vocab"] .de')]
    .map((node) => node.dataset.spoken || node.textContent.replace(/[🔊▶]/g,'').trim())
    .filter((value) => value && value.length < 70);
  if (day === 3 || day === 15) [14,17,24,42,48,67,76,89,98].forEach((number) => items.push(String(number)));
  return [...new Set(items)];
}

function addListeningDrills(root, day) {
  const items = collectListeningItems(root, day);
  if (!items.length) return;
  root.querySelectorAll('.section-card[data-type="listening"]').forEach((card) => {
    const body = card.querySelector('.section-body');
    const drill = document.createElement('div');
    drill.className = 'listening-drill';
    drill.innerHTML = '<h3>Listen and type</h3><p>Play one word from today, then type exactly what you hear.</p><div class="audio-toolbar"><button type="button" data-hear>▶ Hear a word</button><button type="button" data-slow>Slow 0.7×</button></div><div class="listen-row"><input type="text" lang="de" autocapitalize="off" aria-label="Type what you heard" placeholder="Type what you heard…"><button type="button" class="secondary-button" data-check>Check</button></div><div class="listen-feedback" aria-live="polite"></div>';
    body.prepend(drill);
    let current = items[0];
    const choose = () => { current = items[Math.floor(Math.random() * items.length)]; };
    drill.querySelector('[data-hear]').addEventListener('click', () => { choose(); speakGerman(current, 1); });
    drill.querySelector('[data-slow]').addEventListener('click', () => speakGerman(current, .7));
    const check = () => {
      const input = drill.querySelector('input'),feedback = drill.querySelector('.listen-feedback');
      const correct = normalizeGerman(input.value) === normalizeGerman(current);
      feedback.className = `listen-feedback ${correct ? 'good' : 'bad'}`;
      feedback.textContent = correct ? 'Correct — gut gehört.' : `Not quite. The answer was: ${current}`;
      if (!correct) state.listeningMistakes = [...(state.listeningMistakes || []), { day, expected:current, said:input.value, at:new Date().toISOString() }].slice(-100);
      saveState(true);
    };
    drill.querySelector('[data-check]').addEventListener('click', check);
    drill.querySelector('input').addEventListener('keydown', (event) => { if (event.key === 'Enter') check(); });
  });
}

async function enhanceAudio(root, day) {
  const voice = await loadGermanVoice();
  addSpeechButtons(root);
  addDialoguePlayers(root);
  addListeningDrills(root, day);
  if (!voice && !('speechSynthesis' in window)) root.querySelectorAll('.speak-button,.audio-toolbar').forEach((control) => { control.hidden = true; });
}

async function enhanceSpeaking(root, day) {
  speakingApi ||= await import('./speaking.js');
  speakingApi.mountSpeakingCoach({
    root,
    day,
    state,
    saveState,
    speakGerman,
    markSectionComplete(sectionId) {
      state.sectionProgress[day] ||= {};
      state.sectionProgress[day][sectionId] = true;
      const section = document.getElementById(sectionId);
      if (section) {
        section.querySelector('.section-status').textContent = '✓';
        const complete = section.querySelector('.section-complete');
        complete.textContent = 'Completed ✓';
        complete.classList.add('done');
      }
      updateChrome(day);
    },
  });
}

function findAssessmentSection(data) {
  if (data.day === 30) return data.sections.find((section) => /how to run your mock exam/i.test(section.title));
  return data.sections.find((section) =>
    section.type === 'quiz' &&
    !/answer key/i.test(section.title) &&
    (/mini quiz/i.test(section.title) || /\btest\s*\d/i.test(section.title)));
}

async function enhanceAssessment(root, data) {
  await Promise.all([loadQuizzes(), loadTests()]);
  const sectionData = findAssessmentSection(data);
  const section = sectionData ? document.getElementById(sectionData.id) : null;
  if (!section) return;
  const test = allTests.find((item) => item.day === data.day);
  const quiz = allQuizzes.find((item) => item.day === data.day);
  const assessment = test || quiz;
  if (!assessment) return;
  const passed = assessmentPassed(data.day);
  const result = bestAssessmentResult(data.day);
  const unlocked = data.day <= nextDay() || passed || state.completedDays.includes(data.day);
  const required = test ? `${test.passScore}/${test.maxScore} to pass` : `${quiz.threshold}/${quiz.questions.length} to pass`;
  const card = document.createElement('div');
  card.className = `lesson-assessment-card ${passed ? 'complete' : ''}`;
  card.innerHTML = `<div class="assessment-copy"><span class="eyebrow">${test ? 'Weekly assessment' : 'Lesson check'}</span><strong>${passed ? 'Assessment passed ✓' : test ? test.title : 'Ready to check what you learned?'}</strong><p>${result ? `Best result: ${result.percent}% · ` : ''}${passed ? 'This lesson requirement is complete.' : required}</p></div><button type="button" class="${passed ? 'secondary-button' : 'primary-button'}" data-open-assessment ${unlocked ? '' : 'disabled'}>${unlocked ? (passed ? 'Review assessment' : test ? 'Start test' : 'Take interactive quiz') : 'Complete earlier days first'}</button>`;
  section.querySelector('.section-body').prepend(card);
  card.querySelector('[data-open-assessment]').addEventListener('click', () => {
    pendingAssessmentDay = data.day;
    navigate('quiz');
  });
}

function showCelebration(day, goal) {
  const overlay = document.querySelector('#celebration');
  document.querySelector('#celebrationCopy').textContent = goal.replace(/^🎯\s*/, '') || `Day ${day} is complete.`;
  document.querySelector('#celebrationNext').onclick = () => { overlay.hidden = true; navigate(day < 30 ? `day/${day + 1}` : 'stats'); };
  document.querySelector('#celebrationHome').onclick = () => { overlay.hidden = true; navigate('home'); };
  overlay.hidden = false;
}

async function renderDay(day) {
  activeDay = Math.max(1, Math.min(30, Number(day)));
  setView('day');
  elements.loading.hidden = false;
  elements.content.replaceChildren();
  updateChrome(activeDay);
  try {
    const data = await loadDay(activeDay);
    const assessmentSection = findAssessmentSection(data);
    if (assessmentSection && assessmentPassed(activeDay)) {
      state.sectionProgress[activeDay] ||= {};
      state.sectionProgress[activeDay][assessmentSection.id] = true;
    }
    const article = document.createDocumentFragment();
    const heading = document.createElement('header');
    heading.className = 'lesson-heading';
    const sectionTotal = data.sections.length + (data.sections.some((section) => section.type === 'speaking') ? 0 : 1);
    heading.innerHTML = `<p class="eyebrow">Day ${activeDay} · ${sectionTotal} sections</p><h1>${escapeHtml(data.title.replace(/^Day \d+ [—·-]\s*/, ''))}</h1><p>${escapeHtml(data.goal.replace(/^🎯\s*/, ''))}</p><div class="lesson-progress-summary"><span id="lessonProgressCopy">0 of ${sectionTotal} sections complete</span><span id="lessonSpeakingCopy">Speaking still to do</span><span id="lessonAssessmentCopy">Quiz still to do</span></div>`;
    article.appendChild(heading);
    const firstIncomplete = data.sections.findIndex((section) => !state.sectionProgress[activeDay]?.[section.id]);
    data.sections.forEach((section, index) => article.appendChild(renderSection(section, activeDay, index === Math.max(0, firstIncomplete))));
    const complete = document.createElement('button');
    complete.type = 'button'; complete.className = 'primary-button complete-day';
    complete.textContent = state.completedDays.includes(activeDay) ? 'Day complete ✓' : 'Complete speaking and quiz to finish';
    complete.addEventListener('click', () => {
      if (state.completedDays.includes(activeDay)) return;
      if (!state.speakingLessons?.[activeDay]?.complete) {
        const speaking = elements.content.querySelector('.section-card[data-type="speaking"]');
        if (speaking) {
          speaking.open = true;
          const status = speaking.querySelector('.speaking-status');
          if (status) status.textContent = 'Make one speaking attempt and save it before finishing this day.';
          speaking.scrollIntoView({ behavior:preferredScrollBehavior(), block:'start' });
          speaking.querySelector('[data-start]')?.focus({ preventScroll:true });
        }
        return;
      }
      if (!assessmentPassed(activeDay)) {
        const assessment = elements.content.querySelector('.lesson-assessment-card');
        if (assessment) {
          assessment.closest('.section-card').open = true;
          assessment.scrollIntoView({ behavior:preferredScrollBehavior(), block:'center' });
          assessment.querySelector('[data-open-assessment]')?.focus({ preventScroll:true });
        }
        return;
      }
      if (!state.completedDays.includes(activeDay)) state.completedDays.push(activeDay);
      state.lastDay = activeDay < 30 ? activeDay + 1 : 30;
      saveState(true);
      complete.textContent = 'Day complete ✓';
      updateChrome(activeDay);
      showCelebration(activeDay, data.goal);
    });
    article.appendChild(complete);
    const dayNav = document.createElement('div');
    dayNav.className = 'lesson-nav';
    dayNav.innerHTML = `<button type="button" class="secondary-button" data-previous ${activeDay === 1 ? 'disabled' : ''}>← Previous</button><button type="button" class="secondary-button" data-next ${activeDay === 30 ? 'disabled' : ''}>Next →</button>`;
    dayNav.querySelector('[data-previous]').addEventListener('click', () => navigate(`day/${activeDay - 1}`));
    dayNav.querySelector('[data-next]').addEventListener('click', () => navigate(`day/${activeDay + 1}`));
    article.appendChild(dayNav);
    elements.content.appendChild(article);
    await Promise.all([enhanceAudio(elements.content, activeDay), enhanceSpeaking(elements.content, activeDay), enhanceAssessment(elements.content, data)]);
    refreshLessonProgress(activeDay);
    if (pendingSectionId) {
      const target = pendingSectionId === 'speaking'
        ? elements.content.querySelector('.section-card[data-type="speaking"]')
        : pendingSectionId === 'assessment'
        ? elements.content.querySelector('.lesson-assessment-card')
        : document.getElementById(pendingSectionId);
      if (target) {
        const disclosure = target.matches('.section-card') ? target : target.closest('.section-card');
        if (disclosure) disclosure.open = true;
        target.scrollIntoView({behavior:preferredScrollBehavior(),block:'start'});
      }
      pendingSectionId = null;
    }
    elements.loading.hidden = true;
    state.lastDay = activeDay;
    saveState();
    preloadDay(activeDay + 1);
  } catch (error) {
    elements.loading.hidden = false;
    elements.loading.textContent = `${error.message}. Check your connection and try again.`;
  }
}

function renderPlaceholder(route) {
  const copy = {
    flashcards:['Flashcards','The new global SRS deck will use only cards from completed lessons.'],
    quiz:['Quiz','Interactive quizzes and saved test scores are being migrated next.'],
    stats:['Stats','Detailed streaks, scores and weak-topic analytics are being migrated next.'],
  };
  const [title, description] = copy[route];
  document.querySelector('#placeholderTitle').textContent = title;
  document.querySelector('#placeholderCopy').textContent = description;
  elements.title.textContent = title;
  elements.eyebrow.textContent = 'Deutschweg · A1';
  setView('placeholder');
  document.querySelectorAll('.bottom-nav button').forEach((button) => {
    if (button.dataset.route === route) button.setAttribute('aria-current','page');
  });
}

function navigate(route) {
  const target = route === 'home' ? '' : `#${route}`;
  if (location.hash === target) routeFromHash();
  else location.hash = target;
}

function routeFromHash() {
  const route = location.hash.slice(1) || 'home';
  if (route === 'home') renderHome();
  else if (route === 'days') renderDays();
  else if (/^day\/\d+$/.test(route)) renderDay(route.split('/')[1]);
  else if (route === 'flashcards') renderFlashcards();
  else if (route === 'quiz') renderQuizHub();
  else if (route === 'stats') renderStats();
  else if (/^reference\/(glossary|grammar)$/.test(route)) renderReference(route.split('/')[1]);
  else renderHome();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}

document.querySelectorAll('[data-route]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.route)));
elements.back.addEventListener('click', () => navigate('home'));
document.querySelector('#themeButton').addEventListener('click', () => setTheme(state.theme === 'dark' ? 'light' : 'dark'));
document.querySelector('#revealAnswer').addEventListener('click', revealReviewCard);
document.querySelector('#reviewCard').addEventListener('click', revealReviewCard);
document.querySelector('#reviewCard').addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); revealReviewCard(); } });
document.querySelector('#typeMode').addEventListener('change', paintReviewCard);
document.querySelectorAll('.special-keys button').forEach((button) => button.addEventListener('click', () => {
  const input = document.querySelector('#typedAnswer');
  input.setRangeText(button.textContent, input.selectionStart, input.selectionEnd, 'end');
  input.focus();
}));
document.querySelector('#checkTypedAnswer').addEventListener('click', () => {
  const card = reviewQueue[reviewIndex];if (!card) return;
  const input = document.querySelector('#typedAnswer');
  input.setAttribute('aria-invalid', String(normalizeAnswer(input.value) !== normalizeAnswer(card.answer)));
  revealReviewCard();
});
document.querySelectorAll('#gradeButtons [data-grade]').forEach((button) => button.addEventListener('click', () => gradeCurrent(button.dataset.grade)));
document.querySelector('#exportProgress').addEventListener('click', exportProgress);
document.querySelector('#importProgress').addEventListener('change', (event) => { const [file] = event.target.files;if (file) importProgress(file); });
document.querySelector('#confirmImport').addEventListener('click', confirmImport);
document.querySelector('#cancelImport').addEventListener('click', () => {
  pendingImportState = undefined;
  document.querySelector('#importPreview').hidden = true;
  document.querySelector('#importProgress').value = '';
  document.querySelector('#importFeedback').className = 'quiz-feedback';
  document.querySelector('#importFeedback').textContent = 'Import cancelled. Your progress was not changed.';
});
document.querySelector('#recoverImport').addEventListener('click', recoverPreviousProgress);
document.querySelector('#searchButton').addEventListener('click', openGlobalSearch);
document.querySelector('#closeSearch').addEventListener('click', () => { document.querySelector('#searchOverlay').hidden = true; });
document.querySelector('#searchOverlay').addEventListener('click', (event) => { if (event.target.id === 'searchOverlay') event.currentTarget.hidden = true; });
document.querySelector('#globalSearch').addEventListener('input', (event) => runGlobalSearch(event.target.value));
document.querySelectorAll('[data-reference]').forEach((button) => button.addEventListener('click', () => navigate(`reference/${button.dataset.reference}`)));
document.querySelectorAll('[data-reference-tab]').forEach((button) => button.addEventListener('click', () => setReferenceTab(button.dataset.referenceTab)));
['glossaryQuery','articleFilter','dayFilter','glossarySort'].forEach((id) => document.querySelector(`#${id}`).addEventListener(id==='glossaryQuery'?'input':'change',paintGlossary));
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  document.querySelector('#installButton').hidden = false;
});
document.querySelector('#installButton').addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  document.querySelector('#installButton').hidden = true;
});
function updateConnection() {
  document.querySelector('#connectionStatus').hidden = navigator.onLine;
}
window.addEventListener('online', updateConnection);
window.addEventListener('offline', updateConnection);
updateConnection();
function offerAppUpdate(worker) {
  if (!navigator.serviceWorker.controller || !worker) return;
  const toast = document.querySelector('#updateToast');
  toast.hidden = false;
  document.querySelector('#applyUpdate').onclick = () => {
    refreshingForUpdate = true;
    worker.postMessage({ type:'SKIP_WAITING' });
  };
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshingForUpdate) location.reload();
  });
  navigator.serviceWorker.register('./sw.js').then((registration) => {
    offerAppUpdate(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') offerAppUpdate(worker);
      });
    });
  }).catch(() => {});
}
document.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive:true });
document.addEventListener('touchend', (event) => {
  if (elements.day.hidden) return;
  const delta = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(delta) < 70) return;
  if (delta < 0 && activeDay < 30) navigate(`day/${activeDay + 1}`);
  if (delta > 0 && activeDay > 1) navigate(`day/${activeDay - 1}`);
}, { passive:true });
window.addEventListener('hashchange', routeFromHash);

setTheme(state.theme || 'dark');
await loadManifest();
routeFromHash();
