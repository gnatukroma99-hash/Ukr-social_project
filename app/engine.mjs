import { packs } from './data.mjs';

export const DAILY_LIMIT = 5;
const MS_DAY = 86_400_000;
export const kyiv = 'Europe/Kyiv';
const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: kyiv, year: 'numeric', month: '2-digit', day: '2-digit' });
export function dayAt(time = Date.now()) {
  const parts = Object.fromEntries(dateParts.formatToParts(time).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export const shiftDay = (date, offset) => new Date(Date.parse(`${date}T00:00:00Z`) + offset * MS_DAY).toISOString().slice(0, 10);
export function shiftMonth(month, offset) {
  const [year, index] = month.split('-').map(Number);
  return new Date(Date.UTC(year, index - 1 + offset, 1)).toISOString().slice(0, 7);
}

export const validMonth = (month) => typeof month === 'string' && /^20\d\d-(0[1-9]|1[0-2])$/.test(month);
export const dayLabel = (day) => new Intl.DateTimeFormat('uk', { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
export const monthLabel = (month) => new Intl.DateTimeFormat('uk', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-02T12:00:00Z`));

function hash(seed) {
  let result = 2166136261;
  for (const char of seed) result = Math.imul(result ^ char.codePointAt(0), 16777619);
  return result >>> 0;
}

export function deckFor(date) {
  const distance = Math.floor((Date.parse(`${date}T00:00:00Z`) - Date.UTC(2026, 0, 1)) / MS_DAY);
  const wrap = (n, len) => ((n % len) + len) % len;
  const bank = packs.flatMap((p, i) => p.map((question, j) => ({ ...question, id: `p${i + 1}-${j + 1}` })));
  const groups = Object.fromEntries(['translate','context','riddle'].map(kind => [kind, bank.filter(q => q.kind === kind)]));
  const cycle = Math.floor(distance / packs.length);
  function pick(kind, stride, offset) { const group = groups[kind]; return group[wrap(distance * stride + offset, group.length)]; }
  // Revisit vocabulary without replaying the same five-card pack every week.
  const daily = [pick('translate',2,0), pick('context',1,cycle), pick('riddle',2,cycle*3), pick('translate',2,1), pick('riddle',2,cycle*3+1)];
  return daily.map(({ distractors, id, ...question }) => {
    const choices = [question.correct, ...distractors].sort((a, b) => hash(`${date}/${id}/${a}`) - hash(`${date}/${id}/${b}`));
    return { ...question, id, choices };
  });
}

export function publicQuestion({ correct: _correct, explanation: _explanation, ...question }) { return question; }

export function scoreAnswer(question, choice, elapsed, bonus = 0) {
  const correct = choice === question.correct;
  const speed = correct && question.kind === 'riddle' ? elapsed <= 8000 ? 5 : elapsed <= 15000 ? 3 : 0 : 0;
  return { id: question.id, choice, correct, speed, bonus, points: (correct ? 20 : 0) + speed + bonus, expected: question.correct, explanation: question.explanation };
}

export function streakEnding(date, completed) {
  const days = completed instanceof Set ? completed : new Set(completed);
  let count = 0;
  for (let current = date; days.has(current); current = shiftDay(current, -1)) count += 1;
  return count;
}

export const streakBonus = (streak) => Math.min(streak, 7) * 5;
export const totalPoints = (answers) => answers.reduce((sum, row) => sum + row.points, 0);

export function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function apiOrigin(value) {
  try {
    const url = new URL(value.trim());
    const localHttp = url.protocol === 'http:' && isLocalAddress(url.hostname);
    if ((!localHttp && url.protocol !== 'https:') || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return '';
    return url.origin;
  } catch { return ''; }
}

export function isLocalAddress(host) {
  return host === 'localhost' || host === '127.0.0.1' || /^(?:192\.168\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host) && /^\d+(\.\d+){3}$/.test(host) && host.split('.').every(n => Number(n) < 256);
}
