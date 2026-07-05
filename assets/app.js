import { STATE_KEY, migrateLegacyState } from './state.js';

const CONTENT_ROOT = './content/';
const TEST_DAYS = new Set([7, 14, 21, 28, 30]);
const SECTION_ICONS = {
  grammar:'Aa',vocab:'W',sentences:'S',dialogue:'↔',speaking:'●',listening:'◉',
  reading:'R',writing:'✎',quiz:'✓',flashcards:'◇',homework:'⌂',revision:'↻',lesson:'·',
};

const elements = {
  home:document.querySelector('#homeView'),days:document.querySelector('#daysView'),
  day:document.querySelector('#dayView'),placeholder:document.querySelector('#placeholderView'),
  content:document.querySelector('#dayContent'),loading:document.querySelector('#dayLoading'),
  title:document.querySelector('#topbarTitle'),eyebrow:document.querySelector('#topbarEyebrow'),
  progress:document.querySelector('#topbarProgress'),back:document.querySelector('#backButton'),
};

let manifest;
let state = migrateLegacyState(localStorage);
let activeDay = state.lastDay || nextDay();
let touchStartX = 0;

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
  Object.values({home:elements.home,days:elements.days,day:elements.day,placeholder:elements.placeholder})
    .forEach((view) => { view.hidden = true; });
  elements[name].hidden = false;
  elements.back.hidden = name === 'home';
  document.querySelectorAll('.bottom-nav button').forEach((button) => {
    const selected = button.dataset.route === name || (name === 'day' && button.dataset.route === 'days');
    if (selected) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}

function updateChrome(day = null) {
  const complete = state.completedDays.length;
  elements.progress.style.width = `${complete / 30 * 100}%`;
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

function renderSection(section, day) {
  const done = Boolean(state.sectionProgress[day]?.[section.id]);
  const wrapper = document.createElement('details');
  wrapper.className = 'section-card';
  wrapper.dataset.type = section.type;
  wrapper.open = !done;
  wrapper.innerHTML = `<summary><span class="section-icon" aria-hidden="true">${SECTION_ICONS[section.type] || '·'}</span><span class="section-title">${escapeHtml(section.title)}</span><span class="section-status">${done ? '✓' : ''}</span></summary><div class="section-body">${cleanSectionHtml(section.html)}</div>`;
  wrapper.addEventListener('toggle', () => {
    if (!wrapper.open) {
      state.sectionProgress[day] ||= {};
      state.sectionProgress[day][section.id] = true;
      wrapper.querySelector('.section-status').textContent = '✓';
      saveState(true);
    }
  });
  return wrapper;
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
    data.sections.forEach((section) => article.appendChild(renderSection(section, activeDay)));
    const complete = document.createElement('button');
    complete.type = 'button'; complete.className = 'primary-button complete-day';
    complete.textContent = state.completedDays.includes(activeDay) ? 'Day complete ✓' : 'Mark day complete';
    complete.addEventListener('click', () => {
      if (!state.completedDays.includes(activeDay)) state.completedDays.push(activeDay);
      state.lastDay = activeDay < 30 ? activeDay + 1 : 30;
      saveState(true);
      complete.textContent = 'Day complete ✓';
      updateChrome(activeDay);
    });
    article.appendChild(complete);
    elements.content.appendChild(article);
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
  else if (['flashcards','quiz','stats'].includes(route)) renderPlaceholder(route);
  else renderHome();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}

document.querySelectorAll('[data-route]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.route)));
elements.back.addEventListener('click', () => navigate('home'));
document.querySelector('#themeButton').addEventListener('click', () => setTheme(state.theme === 'dark' ? 'light' : 'dark'));
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
