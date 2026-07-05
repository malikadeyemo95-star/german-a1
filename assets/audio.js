let voices = [];
let voicePromise;

function rankVoice(voice) {
  let score = 0;
  if (voice.lang.toLowerCase() === 'de-de') score += 8;
  else if (voice.lang.toLowerCase().startsWith('de')) score += 4;
  if (voice.localService) score += 2;
  if (/anna|petra|markus|vicki|google deutsch/i.test(voice.name)) score += 1;
  return score;
}

export function loadGermanVoice() {
  if (!('speechSynthesis' in window)) return Promise.resolve(null);
  if (voicePromise) return voicePromise;
  voicePromise = new Promise((resolve) => {
    let attempts = 0;
    const read = () => {
      voices = speechSynthesis.getVoices();
      const german = voices.filter((voice) => voice.lang.toLowerCase().startsWith('de')).sort((a, b) => rankVoice(b) - rankVoice(a));
      if (german.length || attempts >= 8) resolve(german[0] || null);
      else { attempts += 1; setTimeout(read, 150); }
    };
    speechSynthesis.addEventListener?.('voiceschanged', read, { once: true });
    read();
  });
  return voicePromise;
}

export async function speakGerman(text, rate = 1) {
  if (!('speechSynthesis' in window) || !text.trim()) return false;
  const voice = await loadGermanVoice();
  speechSynthesis.cancel();
  // iOS can leave synthesis paused after backgrounding the installed PWA.
  speechSynthesis.resume();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text.replace(/🔊/g, '').trim());
    utterance.lang = 'de-DE';
    utterance.rate = rate;
    utterance.pitch = 1;
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);
    speechSynthesis.speak(utterance);
  });
}

export function stopGermanSpeech() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
