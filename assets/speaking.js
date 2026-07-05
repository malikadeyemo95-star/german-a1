const LESSONS = {
  1:{goal:'Use greetings and give your name.',prompt:'Say hello and introduce yourself.',model:'Hallo, ich heiße Malik.',checks:[['Greeting','hallo|guten morgen|guten tag|guten abend'],['Name','ich heiße|mein name ist']]},
  2:{goal:'Introduce yourself and ask another person’s name.',prompt:'Greet someone, say your name, and ask their name.',model:'Guten Tag, ich heiße Malik. Wie heißen Sie?',checks:[['Greeting','guten tag|hallo'],['Your name','ich heiße|mein name ist'],['Question','wie heißen sie|wie heißt du']]},
  3:{goal:'Use haben for age, hunger, and thirst.',prompt:'Say your age, then say that you are hungry and thirsty.',model:'Ich bin dreißig Jahre alt. Ich habe Hunger und Durst.',checks:[['Age','jahre alt'],['Hunger with haben','ich habe hunger'],['Thirst with haben','ich habe durst']]},
  4:{goal:'Say where you come from, live, and which languages you speak.',prompt:'Introduce your country, city, and languages.',model:'Ich komme aus Nigeria. Ich wohne in Berlin. Ich spreche Englisch und ein bisschen Deutsch.',checks:[['Country','ich komme aus'],['City','ich wohne in'],['Language','ich spreche']]},
  5:{goal:'Talk about your job and ask a yes/no question.',prompt:'Say what you do for work and ask if the other person works in Berlin.',model:'Ich arbeite als Techniker. Arbeiten Sie in Berlin?',checks:[['Job','ich arbeite als|ich bin'],['Work question','arbeiten sie|arbeitest du']]},
  6:{goal:'Describe family with possessives.',prompt:'Introduce two family members.',model:'Meine Mutter heißt Amina. Mein Bruder ist zwanzig Jahre alt.',checks:[['Possessive','meine mutter|mein vater|mein bruder|meine schwester'],['Name or age','heißt|jahre alt']]},
  7:{goal:'Review your Week 1 introduction.',prompt:'Give a short self-introduction with your name, country, city, and language.',model:'Hallo, ich heiße Malik. Ich komme aus Nigeria. Ich wohne in Berlin und spreche Englisch.',checks:[['Greeting','hallo|guten tag'],['Name','ich heiße|mein name ist'],['Country','ich komme aus'],['City or language','ich wohne|ich spreche']]},
  8:{goal:'Name objects with der, die, and das.',prompt:'Name three things around you with their articles.',model:'Das ist der Tisch, die Lampe und das Bett.',checks:[['der noun','der '],['die noun','die '],['das noun','das ']]},
  9:{goal:'Use singular and plural forms.',prompt:'Say that you have one chair and two tables.',model:'Ich habe einen Stuhl und zwei Tische.',checks:[['One item','einen stuhl|ein stuhl'],['Plural','zwei tische']]},
  10:{goal:'Use the accusative for things you need.',prompt:'Say that you need an appointment, a bag, and a book.',model:'Ich brauche einen Termin, eine Tasche und ein Buch.',checks:[['Masculine einen','einen termin'],['Feminine eine','eine tasche'],['Neuter ein','ein buch']]},
  11:{goal:'Talk about food with essen, trinken, kein, and nicht.',prompt:'Say what you eat, drink, and do not eat.',model:'Ich esse Brot und trinke Wasser. Ich esse kein Fleisch.',checks:[['Food','ich esse'],['Drink','ich trinke'],['Negation','kein|keine|nicht']]},
  12:{goal:'Order food and drinks politely.',prompt:'You are at a café. Order one coffee and one sandwich.',model:'Ich möchte einen Kaffee und ein Sandwich, bitte.',checks:[['Polite order','ich möchte|ich hätte gern'],['Drink','kaffee'],['Food','sandwich|brötchen'],['Politeness','bitte']]},
  13:{goal:'Ask prices and speak in a shop.',prompt:'Ask how much the apples cost and say you will take one kilo.',model:'Was kosten die Äpfel? Ich nehme ein Kilo, bitte.',checks:[['Price question','was kosten|wie viel kostet'],['Quantity','ein kilo'],['Shop phrase','ich nehme']]},
  14:{goal:'Review food, shopping, and polite ordering.',prompt:'Introduce yourself, then describe what you eat and order one drink.',model:'Ich heiße Malik. Ich esse gern Brot und ich möchte einen Kaffee, bitte.',checks:[['Introduction','ich heiße|mein name ist'],['Food','ich esse'],['Polite order','ich möchte|ich hätte gern'],['Politeness','bitte']]},
  15:{goal:'Say the day, date, and time.',prompt:'Say that your appointment is on Monday at half past two.',model:'Mein Termin ist am Montag um halb drei.',checks:[['Day with am','am montag'],['Time with um','um halb drei'],['Appointment','termin']]},
  16:{goal:'Describe a daily routine with separable verbs.',prompt:'Describe your morning in three steps.',model:'Ich stehe um sechs Uhr auf. Dann frühstücke ich. Um sieben Uhr fahre ich zur Arbeit.',checks:[['Separable verb','stehe|auf'],['Sequence','dann'],['Time','uhr']]},
  17:{goal:'Use modal verbs with the infinitive at the end.',prompt:'Say what you must do and what you want to do tomorrow.',model:'Ich muss morgen arbeiten. Ich will am Abend Deutsch lernen.',checks:[['Must','ich muss'],['Want','ich will|ich möchte'],['Final infinitive','arbeiten|lernen']]},
  18:{goal:'Make a formal appointment.',prompt:'Call and ask for an appointment on Friday at nine.',model:'Guten Tag, ich möchte einen Termin machen. Geht es am Freitag um neun Uhr?',checks:[['Formal opening','guten tag'],['Appointment request','ich möchte einen termin'],['Day','am freitag'],['Time','um neun uhr']]},
  19:{goal:'Ask for and give directions.',prompt:'Ask where the station is and give one direction.',model:'Entschuldigung, wo ist der Bahnhof? Gehen Sie geradeaus und dann links.',checks:[['Polite opening','entschuldigung'],['Place question','wo ist der bahnhof'],['Direction','geradeaus|links|rechts']]},
  20:{goal:'Use practical preposition chunks.',prompt:'Say how you travel to work and who you travel with.',model:'Ich fahre mit dem Bus zur Arbeit. Ich fahre mit meiner Kollegin.',checks:[['Transport chunk','mit dem bus|mit der bahn'],['Destination','zur arbeit|zum kurs'],['Person chunk','mit meiner|mit meinem']]},
  21:{goal:'Review time, routines, appointments, and directions.',prompt:'Say when you work, then ask for an appointment.',model:'Ich arbeite am Montag um acht Uhr. Ich möchte einen Termin machen.',checks:[['Day and time','am montag|am dienstag|um acht'],['Routine','ich arbeite|ich stehe'],['Appointment','ich möchte einen termin']]},
  22:{goal:'Talk about hobbies with verb-second word order.',prompt:'Say what you do on Sunday and in the evening.',model:'Am Sonntag spiele ich Fußball. Abends höre ich Musik.',checks:[['Time first','am sonntag|abends'],['Verb second','spiele ich|höre ich|lese ich|gehe ich']]},
  23:{goal:'Describe your home.',prompt:'Describe your flat and name two rooms.',model:'Meine Wohnung ist klein und hell. Sie hat ein Wohnzimmer und eine Küche.',checks:[['Description','meine wohnung ist'],['First room','wohnzimmer'],['Second room','küche|schlafzimmer|bad']]},
  24:{goal:'Talk about weather and seasons.',prompt:'Say today’s weather and your favourite season.',model:'Heute ist es kalt, aber sonnig. Im Sommer ist es warm.',checks:[['Today’s weather','heute ist es'],['Weather word','kalt|warm|sonnig|regnerisch|windig'],['Season','im sommer|im winter|im frühling|im herbst']]},
  25:{goal:'Explain symptoms at the doctor.',prompt:'Tell the doctor that you have a headache and fever.',model:'Guten Tag. Ich habe Kopfschmerzen und Fieber.',checks:[['Greeting','guten tag|hallo'],['Pain with haben','ich habe kopfschmerzen'],['Second symptom','fieber']]},
  26:{goal:'Talk about the past with war and hatte.',prompt:'Say how your weekend was and what you had.',model:'Mein Wochenende war schön. Ich hatte viel Zeit, aber ich war müde.',checks:[['war','war schön|war gut|war stressig'],['hatte','ich hatte'],['Past state','ich war']]},
  27:{goal:'Use the perfect tense with haben.',prompt:'Say two things you did yesterday.',model:'Gestern habe ich gearbeitet und am Abend habe ich gekocht.',checks:[['Past time','gestern'],['Perfect helper','habe ich|ich habe'],['Participle','gearbeitet|gekocht|gelernt|gesehen']]},
  28:{goal:'Review the perfect tense with haben and sein.',prompt:'Say where you went and what you did yesterday.',model:'Gestern bin ich nach Berlin gefahren und habe einen Freund besucht.',checks:[['Past time','gestern'],['Perfect with sein','bin ich|ich bin'],['Perfect with haben','habe ich|ich habe'],['Participle','gefahren|gegangen|besucht|gemacht']]},
  29:{goal:'Use formal German for an office or course.',prompt:'Formally ask when the German course starts and what it costs.',model:'Guten Tag. Wann beginnt der Deutschkurs und was kostet er? Vielen Dank.',checks:[['Formal greeting','guten tag|sehr geehrte'],['When question','wann beginnt'],['Cost question','was kostet'],['Polite close','vielen dank']]},
  30:{goal:'Practise the A1 speaking exam format.',prompt:'Introduce yourself with name, country, city, job, and languages.',model:'Ich heiße Malik. Ich komme aus Nigeria. Ich wohne in Berlin. Ich arbeite als Techniker. Ich spreche Englisch und Deutsch.',checks:[['Name','ich heiße|mein name ist'],['Country','ich komme aus'],['City','ich wohne in'],['Job','ich arbeite als|ich bin'],['Languages','ich spreche']]},
};

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[.,!?;:„“"']/g, ' ').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
}

function includesPattern(text, pattern) {
  const value = normalize(text);
  return pattern.split('|').some((part) => value.includes(normalize(part)));
}

function grammarRules(text) {
  const value = normalize(text);
  const rules = [];
  const add = (when, message, fix) => { if (when) rules.push({ message, fix }); };
  add(value.includes('ich bin hunger'), 'Say “Ich habe Hunger,” not “Ich bin Hunger.” Hunger uses haben.', 'Ich habe Hunger.');
  add(value.includes('ich bin durst'), 'Say “Ich habe Durst,” not “Ich bin Durst.” Thirst uses haben.', 'Ich habe Durst.');
  add(value.includes('ich bin kopfschmerzen'), 'Symptoms use haben: “Ich habe Kopfschmerzen.”', 'Ich habe Kopfschmerzen.');
  add(/\bich wohnen\b/.test(value), 'Use “wohne” with ich, not “wohnen.”', 'Ich wohne …');
  add(/\bich (kommen|sprechen|arbeiten|heissen)\b/.test(value), 'After ich, the verb normally ends in -e.', 'ich komme / spreche / arbeite / heiße');
  add(value.includes('ich brauche ein termin'), 'Termin is masculine in the accusative: use “einen Termin.”', 'Ich brauche einen Termin.');
  return rules;
}

function taskFor(lesson, type) {
  if (type === 0) return { label:'1 · Repeat', prompt:'Repeat the model sentence clearly.', model:lesson.model, checks:lesson.checks };
  if (type === 1) return { label:'2 · Answer', prompt:lesson.prompt, model:lesson.model, checks:lesson.checks };
  if (type === 2) return { label:'3 · Build', prompt:'Build your own answer using today’s grammar and vocabulary. Include every checklist item.', model:lesson.model, checks:lesson.checks };
  return { label:'4 · Roleplay', prompt:`Mini roleplay: ${lesson.prompt} Respond naturally as if this were a real conversation.`, model:lesson.model, checks:lesson.checks };
}

function scoreAttempt(text, confidence, task) {
  const checklist = task.checks.map(([label, pattern]) => ({ label, complete:includesPattern(text, pattern) }));
  const taskScore = Math.round(checklist.filter((item) => item.complete).length / checklist.length * 100);
  const rules = grammarRules(text);
  const clarity = confidence > 0 ? Math.round(confidence * 100) : Math.min(90, 45 + normalize(text).split(' ').length * 3);
  const grammar = Math.max(20, 100 - rules.length * 25);
  return { checklist, rules, taskScore, grammar, clarity, overall:Math.round((taskScore * 2 + grammar + clarity) / 4) };
}

export const speakingLessonDays = Object.freeze(Object.keys(LESSONS).map(Number));

export function evaluateSpeakingAttempt(day, type, text, confidence = 0) {
  const lesson = LESSONS[day];
  if (!lesson) throw new Error(`No speaking lesson for Day ${day}`);
  return scoreAttempt(text, confidence, taskFor(lesson, type));
}

function addWeakItems(state, day, task, result) {
  state.speakingWeakList ||= [];
  const additions = [
    ...result.rules.map((rule) => ({ category:'Grammar speaking mistake', issue:rule.message, correction:rule.fix })),
    ...result.checklist.filter((item) => !item.complete).map((item) => ({ category:'Speaking task', issue:`Day ${day}: missing ${item.label}`, correction:task.model })),
  ];
  if (result.clarity < 65) additions.push({ category:'Pronunciation', issue:'Practise the soft ich-Laut and speak more slowly.', correction:'ich, nicht, sprechen, möchte' });
  if (!additions.length) additions.push({ category:'Pronunciation', issue:`Day ${day}: improve speaking clarity`, correction:task.model });
  additions.forEach((item) => {
    const id = `speaking-${day}-${normalize(item.issue).slice(0, 36)}`;
    const existing = state.speakingWeakList.find((entry) => entry.id === id);
    if (existing) {
      existing.at = new Date().toISOString();
      delete existing.resolvedAt;
    } else state.speakingWeakList.push({ id, day, ...item, at:new Date().toISOString() });
    state.customCards ||= [];
    if (!state.customCards.some((card) => card.id === id)) {
      state.customCards.push({ id, sourceId:id, day, direction:'mistake', prompt:item.issue, answer:item.correction, german:item.correction, english:item.issue });
    }
  });
}

function renderResult(card, text, confidence, context) {
  const { day, lesson, state, saveState, markSectionComplete } = context;
  const task = taskFor(lesson, Number(card.dataset.task));
  const result = scoreAttempt(text, confidence, task);
  const results = card.querySelector('.speaking-results');
  results.innerHTML = `
    <div class="speaking-scores" aria-label="Speaking scores">
      <div><strong>${result.taskScore}%</strong><span>Task</span></div>
      <div><strong>${result.grammar}%</strong><span>Grammar</span></div>
      <div><strong>${result.clarity}%</strong><span>Clarity</span></div>
    </div>
    <div class="speaking-result"><strong>Correction / stronger answer</strong><p lang="de">${task.model}</p></div>
    <div class="speaking-result"><strong>Feedback</strong>
      ${result.rules.length ? result.rules.map((rule) => `<p class="feedback-warning">${rule.message}</p>`).join('') : '<p class="feedback-good">Good target grammar.</p>'}
      <p>${result.clarity < 65 ? 'Speak a little more slowly and separate each word clearly.' : 'Your speech was clear enough for the recognizer.'}</p>
    </div>
    <div class="speaking-result"><strong>Missing content checklist</strong>
      ${result.checklist.map((item) => `<p class="${item.complete ? 'feedback-good' : ''}">${item.complete ? '✓' : '○'} ${item.label}</p>`).join('')}
    </div>
    <div class="speaking-actions">
      <button type="button" class="secondary-button" data-try>Try again</button>
      <button type="button" class="primary-button" data-save>Save best attempt</button>
      <button type="button" class="secondary-button" data-weak>Add mistakes to Weak List</button>
    </div>`;
  card._latest = { text, result, task };
  results.querySelector('[data-try]').addEventListener('click', () => startRecognition(card, context));
  results.querySelector('[data-save]').addEventListener('click', (event) => {
    state.speakingLessons ||= {};
    const lessonState = state.speakingLessons[day] ||= { tasks:{} };
    const index = card.dataset.task;
    const previous = lessonState.tasks[index];
    if (!previous || result.overall > previous.score) lessonState.tasks[index] = { score:result.overall, text, at:new Date().toISOString() };
    lessonState.complete = true;
    markSectionComplete(card.closest('.section-card').id);
    saveState(true);
    card.querySelector('.speaking-status').textContent = `Speaking completed · best score ${lessonState.tasks[index].score}%`;
    event.currentTarget.textContent = 'Best attempt saved ✓';
  });
  results.querySelector('[data-weak]').addEventListener('click', (event) => {
    addWeakItems(state, day, task, result);
    saveState(true);
    event.currentTarget.textContent = 'Added to Weak List ✓';
  });
}

function startRecognition(card, context) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const live = card.querySelector('.speaking-live');
  const start = card.querySelector('[data-start]');
  const manual = card.querySelector('.speaking-manual');
  if (!Recognition) {
    live.textContent = 'Automatic transcription is unavailable in this browser. Practise with the model audio, then type what you said below for lesson-aware feedback.';
    manual.hidden = false;
    manual.querySelector('textarea').focus();
    return;
  }
  let recognition;
  try { recognition = new Recognition(); } catch {
    live.textContent = 'The microphone is unavailable. Check browser permissions.';
    return;
  }
  recognition.lang = 'de-DE';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 3;
  let finalText = '';
  let confidence = 0;
  card._recognition = recognition;
  start.disabled = false;
  start.classList.add('listening');
  start.setAttribute('aria-pressed','true');
  start.textContent = 'Stop and check';
  live.textContent = 'Speak now…';
  recognition.onresult = (event) => {
    let interim = '';
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (result.isFinal) {
        finalText += `${finalText ? ' ' : ''}${result[0].transcript}`;
        confidence = Math.max(confidence, result[0].confidence || 0);
      } else interim += result[0].transcript;
    }
    live.innerHTML = `<strong>What I heard:</strong> <span lang="de">${escapeHtml(finalText || interim)}</span>`;
  };
  recognition.onerror = (event) => {
    live.textContent = event.error === 'not-allowed'
      ? 'Microphone blocked. Allow microphone access in browser settings.'
      : `Speech recognition error: ${event.error}.`;
  };
  recognition.onend = () => {
    card._recognition = null;
    start.disabled = false;
    start.classList.remove('listening');
    start.setAttribute('aria-pressed','false');
    start.textContent = 'Start speaking';
    if (finalText) renderResult(card, finalText, confidence, context);
  };
  try { recognition.start(); } catch {
    card._recognition = null;
    start.classList.remove('listening');
    start.setAttribute('aria-pressed','false');
    start.textContent = 'Start speaking';
    live.textContent = 'The microphone is already listening.';
  }
}

function createSpeakingSection(root, day) {
  const section = document.createElement('details');
  section.className = 'section-card';
  section.id = `d${day}-speaking-coach`;
  section.dataset.type = 'speaking';
  section.innerHTML = '<summary><span class="section-icon" aria-hidden="true">●</span><span class="section-title">Speaking Practice</span><span class="section-status"></span></summary><div class="section-body"><button type="button" class="section-complete">Mark section complete</button></div>';
  root.querySelector('.complete-day')?.before(section);
  return section;
}

export function mountSpeakingCoach(context) {
  const lesson = LESSONS[context.day];
  if (!lesson) return;
  const section = context.root.querySelector('.section-card[data-type="speaking"]') || createSpeakingSection(context.root, context.day);
  const body = section.querySelector('.section-body');
  const card = document.createElement('div');
  card.className = 'speaking-coach';
  card.dataset.task = '0';
  const complete = Boolean(context.state.speakingLessons?.[context.day]?.complete);
  card.innerHTML = `
    <p class="eyebrow">Lesson-integrated coach</p>
    <h3>Speaking Practice</h3>
    <p><strong>Goal:</strong> ${lesson.goal}</p>
    <div class="speaking-tasks" role="tablist" aria-label="Speaking task type">
      <button type="button" role="tab" class="active" data-task="0">Repeat</button>
      <button type="button" role="tab" data-task="1">Answer</button>
      <button type="button" role="tab" data-task="2">Build</button>
      <button type="button" role="tab" data-task="3">Roleplay</button>
    </div>
    <div class="speaking-prompt" role="tabpanel"></div>
    <div class="speaking-model"><strong>Model:</strong> <span lang="de"></span><button type="button" class="speak-button" data-model aria-label="Hear model answer">▶</button></div>
    <button type="button" class="primary-button microphone-button" data-start aria-pressed="false">Start speaking</button>
    <div class="speaking-live" aria-live="polite">Your live transcript will appear here.</div>
    <p class="speaking-privacy">Your audio is handled by your browser’s speech service. Deutschweg stores only a transcript you explicitly save.</p>
    <div class="speaking-manual" hidden><label>What you said<textarea lang="de" rows="3"></textarea></label><button type="button" class="secondary-button" data-manual-check>Check transcript</button></div>
    <div class="speaking-results" aria-live="polite"></div>
    <p class="speaking-status">${complete ? 'Speaking practice completed ✓' : 'Speaking practice not completed yet.'}</p>`;
  body.prepend(card);

  const selectTask = (type) => {
    const task = taskFor(lesson, type);
    card.dataset.task = type;
    card.querySelectorAll('[data-task]').forEach((button) => {
      const active = Number(button.dataset.task) === type;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    card.querySelector('.speaking-prompt').textContent = task.prompt;
    card.querySelector('.speaking-model span').textContent = task.model;
    card.querySelector('.speaking-live').textContent = 'Your live transcript will appear here.';
    card.querySelector('.speaking-results').replaceChildren();
  };
  card.querySelectorAll('[data-task]').forEach((button) => button.addEventListener('click', () => selectTask(Number(button.dataset.task))));
  card.querySelector('[data-model]').addEventListener('click', () => context.speakGerman(taskFor(lesson, Number(card.dataset.task)).model, .85));
  card.querySelector('[data-start]').addEventListener('click', () => {
    if (card._recognition) card._recognition.stop();
    else startRecognition(card, { ...context, lesson });
  });
  card.querySelector('[data-manual-check]').addEventListener('click', () => {
    const value = card.querySelector('textarea').value.trim();
    if (value) renderResult(card, value, 0, { ...context, lesson });
  });
  selectTask(0);
}
