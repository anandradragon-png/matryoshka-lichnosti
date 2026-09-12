/* ================= ОТЧЁТ: СБОР ДАННЫХ =================
   Собирает всё, что человек сделал за период, из двух источников:
   дневник эмоций (ml_diary) и журнал дня (ml_journal). Ничего не рисует —
   только считает. Вёрстка живёт в модулях section-*.js.

   Источник эмоций остаётся один — дневник. Журнал их не дублирует. */
import { ML_KEYS } from '../core.js';
import { safeParse, dayKey } from '../util.js';
import { loadEntries, computeStreak, entryNames, entryEmotions, NEG_NAMES } from '../organizer.js';
import { EVENT, loadEvents } from '../journal.js';
import { PRACTICES, EMOTION_GUIDE } from '../practices-data.js';

export const PERIODS = {
  day: { label: 'за сегодня', days: 1 },
  week: { label: 'за неделю', days: 7 },
  month: { label: 'за месяц', days: 30 },
};

const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const avg = (arr, pick) => (arr.length
  ? Math.round(10 * arr.reduce((s, x) => s + (pick(x) || 0), 0) / arr.length) / 10
  : null);
const isNegative = entry => entryNames(entry).some(n => NEG_NAMES.includes(n));

/* Имя человека для титульной страницы. Сессия и список пользователей лежат
   в localStorage — читаем через ML_KEYS, как требуют правила проекта. */
function userName() {
  const login = localStorage.getItem(ML_KEYS.session) || '';
  if (!login) return '';
  const users = safeParse(localStorage.getItem(ML_KEYS.users), []);
  const u = users.find(x => x && x.login === login);
  return (u && (u.name || u.login)) || login;
}

/* Настроение: средние по периоду, топ эмоций, доля тяжёлых состояний. */
function moodSummary(entries) {
  const freq = {};
  entries.forEach(e => entryNames(e).forEach(n => (freq[n] = (freq[n] || 0) + 1)));
  const withSleep = entries.filter(e => e.sleep != null);
  return {
    count: entries.length,
    avgIntensity: avg(entries, e => e.intensity || 5),
    avgSleep: avg(withSleep, e => e.sleep),
    avgEnergy: avg(withSleep, e => e.energy),
    top: Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5),
    negShare: entries.length
      ? Math.round(100 * entries.filter(isNegative).length / entries.length)
      : null,
  };
}

/* Инсайт про сон — тот же расчёт, что в органайзере: в дни с хорошим сном
   тяжёлых эмоций меньше на N%. Возвращает null, если разница незначима. */
function sleepInsight(entries) {
  const withSleep = entries.filter(e => e.sleep != null);
  if (withSleep.length < 3) return null;
  const share = arr => (arr.length ? Math.round(100 * arr.filter(isNegative).length / arr.length) : null);
  const good = share(withSleep.filter(e => e.sleep >= 7));
  const bad = share(withSleep.filter(e => e.sleep < 7));
  if (good == null || bad == null) return null;
  const diff = bad - good;
  return diff >= 15 ? diff : null;
}

/* Динамика по неделям (премиум): как менялись интенсивность и доля
   тяжёлых состояний. Меньше двух недель данных — тренда нет. */
function weeklyTrend(entries) {
  if (!entries.length) return [];
  const weeks = new Map();
  entries.forEach(e => {
    const d = new Date(e.date);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const key = monday.getTime();
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key).push(e);
  });
  return [...weeks.entries()].sort((a, b) => a[0] - b[0]).map(([key, list]) => ({
    label: new Date(key).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }),
    count: list.length,
    avgIntensity: avg(list, e => e.intensity || 5),
    negShare: Math.round(100 * list.filter(isNegative).length / list.length),
  }));
}

/* Отметки настроения по дням — для базового отчёта за день и для таблицы. */
function entryRows(entries) {
  return entries.map(e => ({
    date: e.date,
    names: entryEmotions(e).map(x => ({ name: x.name, color: x.color })),
    compound: e.compound || '',
    intensity: e.intensity || 5,
    sleep: e.sleep,
    energy: e.energy,
    note: e.note || '',
  }));
}

/* Разбор по дням (полный разбор): для каждого дня, когда человек отмечался,
   свои средние и свои заметки. Нужен, чтобы месячный отчёт не превращался
   в одну усреднённую цифру, за которой не видно ни одного дня. */
function byDay(entries) {
  const days = new Map();
  entries.forEach(e => {
    const k = dayKey(e.date);
    if (!days.has(k)) days.set(k, []);
    days.get(k).push(e);
  });
  return [...days.values()].sort((a, b) => a[0].date - b[0].date).map(list => {
    const freq = {};
    list.forEach(e => entryNames(e).forEach(n => (freq[n] = (freq[n] || 0) + 1)));
    const withSleep = list.filter(e => e.sleep != null);
    return {
      date: list[0].date,
      count: list.length,
      avgIntensity: avg(list, e => e.intensity || 5),
      avgSleep: avg(withSleep, e => e.sleep),
      avgEnergy: avg(withSleep, e => e.energy),
      top: Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]),
      notes: list.filter(e => e.note).map(e => ({ date: e.date, note: e.note })),
      negative: list.filter(isNegative).length,
    };
  });
}

/* Какие чувства человек отмечает вместе (полный разбор). Пара, встреченная
   один раз, — случайность, поэтому порог 2. Это самое содержательное, что
   вообще можно сказать про эмоции по отметкам: не «вы часто тревожитесь»,
   а «тревога у вас приходит вместе с усталостью». */
function emotionPairs(entries) {
  const pairs = {};
  entries.forEach(e => {
    const names = [...new Set(entryNames(e))].sort();
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const k = names[i] + ' + ' + names[j];
        pairs[k] = (pairs[k] || 0) + 1;
      }
    }
  });
  return Object.entries(pairs).filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([names, count]) => ({ names, count }));
}

/* Что делать дальше. Собирается из гида по эмоциям: у каждой эмоции есть
   поддерживающий текст и категория практик, которая с ней работает. Берём
   самые частые чувства человека за период и подбираем под них практики,
   которые он ЕЩЁ НЕ проходил: советовать то, что уже пройдено, — пустой
   совет. Кончились непройденные — предлагаем повторить лучшее.

   Практики отбираются по категории из гида, а не по названию: каталог
   меняется, категории живут дольше. */
function recommendations(top, donePractices) {
  const done = new Set(donePractices.map(p => String(p.title || '')));
  const used = new Set();
  const out = [];
  top.forEach(([name]) => {
    const guide = EMOTION_GUIDE[name];
    if (!guide) return;
    const pool = PRACTICES.filter(p => p.cat === guide.rec && !used.has(p.title));
    const fresh = pool.filter(p => !done.has(p.title));
    const pick = (fresh.length ? fresh : pool).slice(0, 2);
    if (!pick.length) return;
    pick.forEach(p => used.add(p.title));
    out.push({
      emotion: name,
      emoji: guide.emoji,
      text: guide.text,
      repeat: !fresh.length,
      practices: pick.map(p => ({
        title: p.title, icon: p.icon, desc: p.desc, time: p.time,
        when: p.when, steps: Array.isArray(p.steps) ? p.steps : [],
      })),
    });
  });
  return out.slice(0, 3);
}

/* Дар в журнале лежит снимком, и в снимке только то, что было нужно на
   момент записи. Для полного разбора нужно больше: физика поля целиком,
   слои, среды, которые человеку противопоказаны. Берём это из своей базы
   Даров по имени поля — база в приложении есть всегда, а старые снимки
   дополнить иначе нечем. Нет базы или поле переименовали — просто не будет
   глубокого блока, остальной отчёт не страдает. */
function darDetails(dar) {
  const base = typeof window !== 'undefined' && window.YupDar;
  if (!dar || !base || !base.FIELDS || !dar.fieldName) return null;
  const f = Object.values(base.FIELDS).find(x => x && x.name === dar.fieldName);
  if (!f) return null;
  return {
    physics: f.physics || null,
    risks: Array.isArray(f.risks) ? f.risks : [],
    shadow: f.shadow || null,
  };
}

export function collectReport(period = 'day') {
  const spec = PERIODS[period] || PERIODS.day;
  const to = Date.now();
  const from = period === 'day' ? startOfDay(to) : startOfDay(to - (spec.days - 1) * 864e5);

  // Журнал свои записи проверяет сам, а дневник отдаёт всё, что разобралось
  // из хранилища. Запись с датой-строкой или без даты даёт «Invalid Date»
  // прямо в печатном отчёте, поэтому отсеиваем такие здесь.
  const allEntries = loadEntries().filter(e => e && Number.isFinite(e.date));
  const allEvents = loadEvents();
  const entries = allEntries.filter(e => e.date >= from && e.date <= to);
  const events = allEvents.filter(e => e.date >= from && e.date <= to);
  const byType = type => events.filter(e => e.type === type).map(e => ({ ...e.data, date: e.date }));
  const darEvents = byType(EVENT.dar);
  const dar = darEvents.length ? darEvents[darEvents.length - 1] : null;
  const mood = moodSummary(entries);
  const practicesAllTime = allEvents.filter(e => e.type === EVENT.practice)
    .map(e => ({ ...e.data, date: e.date }));

  return {
    period,
    periodLabel: spec.label,
    from, to,
    generatedAt: to,
    dayLabel: new Date(to).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
    userName: userName(),
    entries: entryRows(entries),
    mood,
    sleepInsight: sleepInsight(entries),
    practices: byType(EVENT.practice),
    chats: byType(EVENT.chat),
    tests: byType(EVENT.test),
    dar,
    darMore: darDetails(dar),
    // История практик за всё время — блок полного разбора, берём вне периода.
    practicesAllTime,
    byDay: byDay(entries),
    pairs: emotionPairs(entries),
    advice: recommendations(mood.top, practicesAllTime),
    trend: weeklyTrend(allEntries.filter(e => e.date >= startOfDay(to - 56 * 864e5))),
    streak: computeStreak(allEntries),
    totalEntries: allEntries.length,
    layer: Math.min(5, 1 + Math.floor(allEntries.length / 3)),
    activeDays: new Set(entries.map(e => dayKey(e.date))).size,
  };
}
