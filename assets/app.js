import { STATE_KEY, migrateLegacyState } from './state.js';
import { loadGermanVoice, speakGerman, stopGermanSpeech } from './audio.js';
import { buildQueue, cardStatus, hardestCards, scheduleCard } from './srs.js';

const CONTENT_ROOT = './content/';
const TEST_DAYS = new Set([7, 14, 21, 28, 30]);
const SECTION_ICONS = {
  grammar:'Aa',vocab:'W',sentences:'S',dialogue:'↔',speaking:'●',listening:'◉',
  reading:'R',writing:'✎',quiz:'✓',flashcards:'◇',homework:'⌂',revision:'↻',lesson:'·',
};

const elements = {
  home:document.querySelector('#homeView'),days:document.querySelector('#daysView'),
  day:document.querySelector('#dayView'),flashcards:document.querySelector('#flashcardsView'),quiz:document.querySelector('#quizView'),placeholder:document.querySelector('#placeholderView'),
  content:document.querySelector('#dayContent'),loading:document.querySelector('#dayLoading'),
  title:document.querySelector('#topbarTitle'),eyebrow:document.querySelector('#topbarEyebrow'),
  progress:document.querySelector('#topbarProgress'),back:document.querySelector('#backButton'),
};

let manifest;
let state = migrateLegacyState(localStorage);
let activeDay = state.lastDay || nextDay();
let touchStartX = 0;
let allCards;
let allQuizzes;
let allTests;
let reviewQueue = [];
let reviewIndex = 0;

function dateKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function saveState(activity = false) {
  if (activity) {
    const today = dateKey();
    if (!state.activityDays.includes(today)) state.activityDays.push(today);
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
  Object.values({home:elements.home,days:elements.days,day:elements.day,flashcards:elements.flashcards,quiz:elements.quiz,placeholder:elements.placeholder})
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
  if (allCards) return allCards;
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

function normalizeAnswer(value) {
  return value.toLowerCase().trim().replace(/[.,!?;:„“"']/g,'').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/\s+/g,' ');
}

function renderHardest() {
  const cards = hardestCards(allCards || [], state.srs || {});
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
  document.querySelector('#reviewStatus').textContent = cardStatus(record);
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
  await loadCards();
  state.srs ||= {};
  reviewQueue = buildQueue(allCards, state.srs, nextDay(), Date.now(), 15);
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
  state.srs[card.id] = scheduleCard(state.srs[card.id], grade);
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

function renderQuiz(quiz) {
  const body = document.querySelector('#quizBody');
  const answers = new Map();
  body.innerHTML = quiz.questions.map((question, index) => {
    const control = question.type === 'choice'
      ? `<div class="choice-grid">${question.choices.map((choice) => `<button type="button" class="choice-option" data-choice="${escapeHtml(choice)}">${escapeHtml(choice)}</button>`).join('')}</div><button type="button" class="quiz-check" data-check>Check</button>`
      : question.type === 'reorder'
      ? `<div class="word-answer" aria-label="Your sentence"></div><div class="word-bank">${question.tokens.map((token) => `<button type="button" class="word-chip">${escapeHtml(token)}</button>`).join('')}</div><button type="button" class="quiz-check" data-check>Check order</button>`
      : `<div class="quiz-input-row"><input type="text" lang="de" autocapitalize="off" aria-label="Answer question ${index + 1}"><button type="button" class="quiz-check" data-check>Check</button></div>`;
    return `<article class="quiz-question" data-question="${question.id}"><h2>${index + 1}. ${escapeHtml(question.prompt)}</h2>${control}<div class="quiz-feedback" aria-live="polite"></div></article>`;
  }).join('') + '<button type="button" class="primary-button" id="finishQuiz">Finish quiz <span>→</span></button><div id="quizResult"></div>';
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
      const normalizedValue = normalizeAnswer(value);
      const correct = normalizedValue === normalizeAnswer(question.answer) || (normalizedValue.length > 1 && normalizeAnswer(question.explanation).startsWith(normalizedValue));
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
  body.querySelector('#finishQuiz').addEventListener('click', () => {
    quiz.questions.forEach((question) => {
      if (!answers.get(question.id)?.correct) body.querySelector(`[data-question="${question.id}"] [data-check]`).click();
    });
    const score = quiz.questions.filter((question) => answers.get(question.id)?.correct).length;
    state.quizResults ||= [];
    state.quizResults.push({ quizId:quiz.id,day:quiz.day,score,total:quiz.questions.length,percent:Math.round(score / quiz.questions.length * 100),at:new Date().toISOString() });
    saveState(true);
    const passed = score >= quiz.threshold;
    body.querySelector('#quizResult').innerHTML = `<div class="quiz-result"><span class="eyebrow">${passed ? 'Lesson check passed' : 'Keep practising'}</span><strong>${score}/${quiz.questions.length}</strong><p>${passed ? 'Good work. Your result is saved.' : 'Wrong answers are now in your flashcard review queue.'}</p><button type="button" class="primary-button" data-retake>Retake quiz <span>↻</span></button></div>`;
    body.querySelector('[data-retake]').addEventListener('click', () => renderQuiz(quiz));
    body.querySelector('#quizResult').scrollIntoView({ behavior:'smooth',block:'center' });
  });
}

async function renderQuizHub() {
  await Promise.all([loadQuizzes(), loadTests()]);
  const unlocked = allQuizzes.filter((quiz) => quiz.day <= nextDay());
  const unlockedTests = allTests.filter((test) => test.day <= nextDay());
  const picker = document.querySelector('#quizPicker');
  picker.innerHTML = '<optgroup label="Lesson quizzes">'+unlocked.map((quiz) => `<option value="${quiz.id}">Day ${quiz.day} · Mini quiz</option>`).join('')+'</optgroup>'+
    (unlockedTests.length?'<optgroup label="Tests">'+unlockedTests.map((test)=>`<option value="${test.id}">Day ${test.day} · ${escapeHtml(test.title)}</option>`).join('')+'</optgroup>':'');
  const preferred = unlocked.find((quiz) => quiz.day === nextDay()) || unlocked.at(-1) || allQuizzes[0];
  picker.value = preferred.id;
  picker.onchange = () => {
    const quiz = unlocked.find((item) => item.id === picker.value);
    if (quiz) renderQuiz(quiz); else renderTest(unlockedTests.find((item) => item.id === picker.value));
  };
  elements.title.textContent = 'Quiz';
  elements.eyebrow.textContent = `${unlocked.length} unlocked`;
  setView('quiz');
  renderQuiz(preferred);
}

function renderTest(test) {
  const body = document.querySelector('#quizBody');
  body.innerHTML = `<div class="test-paper"><span class="eyebrow">Day ${test.day} · ${test.maxScore} points</span><h2>${escapeHtml(test.title)}</h2>${test.taskHtml.map(cleanSectionHtml).join('')}<button type="button" class="primary-button" data-submit-test>Finish and unlock key <span>→</span></button><div class="answer-panel" hidden><h2>Answer key</h2>${cleanSectionHtml(test.keyHtml)}<label class="test-score">My score <input type="number" min="0" max="${test.maxScore}" inputmode="numeric"> / ${test.maxScore}</label><button type="button" class="primary-button" data-save-test>Save result <span>→</span></button><div class="quiz-feedback" aria-live="polite"></div></div></div>`;
  body.querySelectorAll('.test-paper li').forEach((item, index) => {
    if (item.closest('.answer-panel')) return;
    const input = document.createElement('input');
    input.className = 'test-response';input.type = 'text';input.setAttribute('aria-label',`Response ${index + 1}`);
    item.appendChild(input);
  });
  const panel = body.querySelector('.answer-panel');
  body.querySelector('[data-submit-test]').addEventListener('click', () => { panel.hidden = false;panel.scrollIntoView({behavior:'smooth',block:'start'}); });
  body.querySelector('[data-save-test]').addEventListener('click', () => {
    const score = Number(panel.querySelector('input').value);
    if (!Number.isFinite(score) || score < 0 || score > test.maxScore) return;
    state.testResults ||= [];
    state.testResults.push({testId:test.id,day:test.day,score,total:test.maxScore,percent:Math.round(score/test.maxScore*100),at:new Date().toISOString()});
    saveState(true);
    const pass = score >= test.passScore,feedback=panel.querySelector('.quiz-feedback');
    feedback.className=`quiz-feedback ${pass?'good':'bad'}`;
    feedback.textContent=pass?`Passed — ${score}/${test.maxScore}. Result saved.`:`${score}/${test.maxScore}. Review the key, then retake when ready.`;
  });
}

function updateChrome(day = null) {
  const complete = state.completedDays.length;
  const dayInfo = day ? manifest.days[day - 1] : null;
  const dayDone = day ? Object.keys(state.sectionProgress[day] || {}).length : 0;
  const dayRatio = day && state.completedDays.includes(day) ? 1 : dayDone / Math.max(1, dayInfo?.sectionCount || 1);
  elements.progress.style.width = day ? `${dayRatio * 100}%` : `${complete / 30 * 100}%`;
  elements.eyebrow.textContent = day ? `Day ${day} of 30` : 'Deutschweg · A1';
  elements.title.textContent = day ? manifest.days[day - 1].title.replace(/^Day \d+ [—·-]\s*/, '') : 'Your 30-day journey';
}

function renderHome() {
  const day = nextDay();
  const info = manifest.days[day - 1];
  document.querySelector('#continueEyebrow').textContent = `Today · Day ${day}`;
  document.querySelector('#continueTitle').textContent = info.title.replace(/^Day \d+ [—·-]\s*/, '');
  document.querySelector('#continueGoal').textContent = info.goal.replace(/^🎯\s*/, '');
  document.querySelector('#daysComplete').textContent = state.completedDays.length;
  document.querySelector('#coursePercent').textContent = `${Math.round(state.completedDays.length / 30 * 100)}%`;
  document.querySelector('#studyDays').textContent = state.activityDays.length;
  document.querySelector('#continueButton').onclick = () => navigate(`day/${day}`);
  updateChrome();
  setView('home');
}

function renderDays() {
  const current = nextDay();
  document.querySelector('#dayGrid').innerHTML = manifest.days.map((day) => {
    const classes = ['day-tile'];
    if (state.completedDays.includes(day.day)) classes.push('complete');
    else if (Object.keys(state.sectionProgress[day.day] || {}).length) classes.push('in-progress');
    if (day.day === current) classes.push('current');
    if (TEST_DAYS.has(day.day)) classes.push('test');
    return `<button type="button" class="${classes.join(' ')}" data-day="${day.day}" aria-label="Day ${day.day}: ${escapeHtml(day.title)}">${state.completedDays.includes(day.day) ? '✓' : day.day}</button>`;
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
    const article = document.createDocumentFragment();
    const heading = document.createElement('header');
    heading.className = 'lesson-heading';
    heading.innerHTML = `<p class="eyebrow">Day ${activeDay} · ${data.sections.length} sections</p><h1>${escapeHtml(data.title.replace(/^Day \d+ [—·-]\s*/, ''))}</h1><p>${escapeHtml(data.goal.replace(/^🎯\s*/, ''))}</p>`;
    article.appendChild(heading);
    const firstIncomplete = data.sections.findIndex((section) => !state.sectionProgress[activeDay]?.[section.id]);
    data.sections.forEach((section, index) => article.appendChild(renderSection(section, activeDay, index === Math.max(0, firstIncomplete))));
    const complete = document.createElement('button');
    complete.type = 'button'; complete.className = 'primary-button complete-day';
    complete.textContent = state.completedDays.includes(activeDay) ? 'Day complete ✓' : 'Mark day complete';
    complete.addEventListener('click', () => {
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
    enhanceAudio(elements.content, activeDay);
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
  else if (route === 'stats') renderPlaceholder(route);
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
