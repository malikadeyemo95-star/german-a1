import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const quizzes = [];

function plain(value) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function listItems(html) {
  return [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => plain(match[1]));
}

function cleanAnswer(value) {
  const withoutNumber = value.replace(/^\s*\d+[.)]\s*/, '');
  const short = withoutNumber.replace(/\(.*?\)/g, '').split('—')[0].split(/ or:/i)[0].trim();
  return short || withoutNumber.trim();
}

function parseChoices(question) {
  const matches = [...question.matchAll(/\b([a-d])\)\s*(.*?)(?=\s+\b[a-d]\)|$)/gi)];
  if (matches.length < 2) return null;
  const stem = question.slice(0, question.indexOf(matches[0][0])).trim();
  return { stem, choices: matches.map((match) => match[2].trim()) };
}

function questionType(question) {
  if (/match\b/i.test(question)) return 'matching';
  if (/put .*order|word order|correct order|reorder|rearrange|scrambled|^build/i.test(question)) return 'reorder';
  if (parseChoices(question)) return 'choice';
  return 'fill';
}

for (let day = 1; day <= 30; day += 1) {
  const file = resolve(root, 'content', `day-${String(day).padStart(2, '0')}.json`);
  const data = JSON.parse(await readFile(file, 'utf8'));
  for (const section of data.sections.filter((item) => /mini quiz/i.test(item.title))) {
    const key = /<details\b[^>]*class=["'][^"']*\bkey\b[^"']*["'][^>]*>([\s\S]*?)<\/details>/i.exec(section.html);
    const questionArea = section.html.slice(0, key?.index ?? section.html.length);
    const questionList = /<ol\b[^>]*>([\s\S]*?)<\/ol>/i.exec(questionArea);
    const keyList = key && /<ol\b[^>]*>([\s\S]*?)<\/ol>/i.exec(key[1]);
    if (!questionList || !keyList) continue;
    const prompts = listItems(questionList[1]);
    const explanations = listItems(keyList[1]);
    if (!prompts.length || prompts.length !== explanations.length) continue;
    quizzes.push({
      id: `day-${day}-mini`,
      day,
      title: section.title,
      threshold: Math.ceil(prompts.length * .7),
      questions: prompts.map((prompt, index) => {
        const parsed = parseChoices(prompt);
        const rawAnswer = cleanAnswer(explanations[index]);
        const letter = /^[a-d]$/i.test(rawAnswer) ? rawAnswer.toLowerCase().charCodeAt(0) - 97 : -1;
        const type = questionType(prompt);
        const resolvedAnswer = parsed && letter >= 0 ? parsed.choices[letter] : rawAnswer;
        const answerWords = resolvedAnswer.replace(/[.?!]/g,'').split(/\s+/).filter(Boolean);
        const scrambled = [...answerWords.slice(2), ...answerWords.slice(0, 2)];
        return {
          id: `d${day}-q${index + 1}`,
          type,
          prompt: parsed?.stem || prompt,
          choices: parsed?.choices || null,
          tokens: type === 'reorder' ? scrambled : null,
          answer: resolvedAnswer,
          explanation: explanations[index],
        };
      }),
    });
  }
}

await writeFile(resolve(root, 'content/quizzes.json'), `${JSON.stringify({ schemaVersion:1, quizzes }, null, 2)}\n`);
console.log(`Generated ${quizzes.length} mini quizzes with ${quizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0)} questions.`);
