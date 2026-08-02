import { ML_KEYS } from './core.js';
import { escapeHtml, safeParse } from './util.js';

/* ================= ОРГАНАЙЗЕР ЭМОЦИЙ ================= */
/* Колесо эмоций Роберта Плутчика: 8 спектров, в каждом 3 эмоции по возрастанию
   интенсивности (край → центр). Смешение соседних спектров даёт сложные эмоции. */
const PLUTCHIK = [
  { spectrum: 'Радость',    color: '#FBBF24', levels: ['Безмятежность', 'Радость', 'Восторг'] },
  { spectrum: 'Доверие',    color: '#84CC16', levels: ['Принятие', 'Доверие', 'Восхищение'] },
  { spectrum: 'Страх',      color: '#22C55E', levels: ['Опасение', 'Страх', 'Ужас'] },
  { spectrum: 'Удивление',  color: '#22D3EE', levels: ['Отвлечение', 'Удивление', 'Изумление'] },
  { spectrum: 'Грусть',     color: '#6366F1', levels: ['Задумчивость', 'Грусть', 'Горе'] },
  { spectrum: 'Отвращение', color: '#A855F7', levels: ['Скука', 'Отвращение', 'Омерзение'] },
  { spectrum: 'Гнев',       color: '#EF4444', levels: ['Досада', 'Гнев', 'Ярость'] },
  { spectrum: 'Ожидание',   color: '#F97316', levels: ['Интерес', 'Ожидание', 'Настороженность'] },
];
// Сложные эмоции (диады) — смешение соседних спектров
const PLUTCHIK_DYADS = [
  ['Радость', 'Доверие', 'Любовь'],
  ['Доверие', 'Страх', 'Покорность'],
  ['Страх', 'Удивление', 'Трепет'],
  ['Удивление', 'Грусть', 'Неодобрение'],
  ['Грусть', 'Отвращение', 'Раскаяние'],
  ['Отвращение', 'Гнев', 'Презрение'],
  ['Гнев', 'Ожидание', 'Агрессия'],
  ['Ожидание', 'Радость', 'Оптимизм'],
];
// Плоский список эмоций для органайзера (средняя интенсивность выделена)
const EMOTIONS = PLUTCHIK.flatMap(sp =>
  sp.levels.map((name, i) => ({ name, color: sp.color, spectrum: sp.spectrum, level: i + 1 }))
);
export const emotionColor = name => (EMOTIONS.find(e => e.name === name) || {}).color || '#8B5CF6';

// Индекс спектра эмоции в круге Плутчика (0..7)
const spectrumIndex = name => PLUTCHIK.findIndex(sp => sp.spectrum === name);
/* Полная таблица составных эмоций (диад) Плутчика по паре спектров.
   Ключ — «min-max» индексов спектров. Соседние (дистанция 1) — первичные диады,
   через один (2) — вторичные, через два (3) — третичные. Противоположные
   (дистанция 4) единой эмоции не образуют → в таблице отсутствуют (конфликт). */
const DYAD_MAP = {
  '0-1': 'Любовь', '1-2': 'Покорность', '2-3': 'Трепет', '3-4': 'Неодобрение',
  '4-5': 'Раскаяние', '5-6': 'Презрение', '6-7': 'Агрессия', '0-7': 'Оптимизм',
  '0-2': 'Вина', '1-3': 'Любопытство', '2-4': 'Отчаяние', '3-5': 'Неверие',
  '4-6': 'Зависть', '5-7': 'Цинизм', '0-6': 'Гордость', '1-7': 'Надежда',
  '0-3': 'Ликование', '1-4': 'Сентиментальность', '2-5': 'Стыд', '3-6': 'Возмущение',
  '4-7': 'Пессимизм', '0-5': 'Болезненность', '1-6': 'Доминирование', '2-7': 'Тревога',
};
// По двум выбранным эмоциям возвращает единую составную эмоцию (диаду) или null.
function compoundEmotion(sel) {
  if (sel.length !== 2) return null;
  const i = spectrumIndex(sel[0].spectrum), j = spectrumIndex(sel[1].spectrum);
  if (i < 0 || j < 0 || i === j) return null;   // одна группа — диады нет
  return DYAD_MAP[Math.min(i, j) + '-' + Math.max(i, j)] || null;  // противоположные → null
}

const emotionsWrap = document.getElementById('emotions');
const emotionResult = document.getElementById('emotionResult');
const MAX_EMOTIONS = 2;      // не более двух эмоций за раз → одна составная (как у Плутчика)
let selectedEmotions = [];   // выбор «настроение дня»
PLUTCHIK.forEach(sp => {
  const group = document.createElement('div');
  group.className = 'emotion-group';
  group.innerHTML = `<span class="emotion-group-title" style="--e:${sp.color}">${sp.spectrum}</span>`;
  sp.levels.forEach((name, i) => {
    const b = document.createElement('button');
    b.className = 'emotion lvl' + (i + 1);
    b.type = 'button';
    b.style.setProperty('--e', sp.color);
    b.innerHTML = `<span class="dot"></span>${name}`;
    b.onclick = () => {
      const idx = selectedEmotions.findIndex(x => x.name === name);
      if (idx >= 0) { selectedEmotions.splice(idx, 1); b.classList.remove('sel'); }
      else {
        if (selectedEmotions.length >= MAX_EMOTIONS) {
          alert('Можно выбрать не более двух эмоций за раз — из них рождается одна составная эмоция, как у Плутчика.');
          return;
        }
        selectedEmotions.push({ name, color: sp.color, spectrum: sp.spectrum }); b.classList.add('sel');
      }
      renderEmotionResult();
    };
    group.appendChild(b);
  });
  emotionsWrap.appendChild(group);
});

// Живой вывод рождающейся составной эмоции под списком выбора
function renderEmotionResult() {
  if (!emotionResult) return;
  if (selectedEmotions.length < 2) { emotionResult.hidden = true; emotionResult.innerHTML = ''; return; }
  const [a, b] = selectedEmotions;
  const comp = compoundEmotion(selectedEmotions);
  emotionResult.hidden = false;
  if (comp) {
    emotionResult.className = 'emotion-result has-compound';
    emotionResult.innerHTML = `Рождается новая эмоция: <b>${comp}</b> <span class="er-src">(${a.name} + ${b.name})</span>`;
  } else if (a.spectrum === b.spectrum) {
    emotionResult.className = 'emotion-result';
    emotionResult.innerHTML = `<span class="er-src">${a.name} и ${b.name} — одна группа эмоций, разной интенсивности.</span>`;
  } else {
    emotionResult.className = 'emotion-result';
    emotionResult.innerHTML = `<span class="er-src">${a.name} и ${b.name} — противоположные эмоции: в одну не сливаются.</span>`;
  }
}

// Легенда колеса Плутчика (справочный блок)
(function renderPlutchik() {
  const legend = document.getElementById('plutchikLegend');
  const dyadsBox = document.getElementById('plutchikDyads');
  if (legend) {
    legend.innerHTML = '<div class="pl-title">8 спектров эмоций</div>' + PLUTCHIK.map(sp => `
      <div class="pl-row" style="--e:${sp.color}">
        <span class="pl-name">${sp.spectrum}</span>
        <span class="pl-levels">
          <i class="pl-lvl pl-l1">${sp.levels[0]}</i>
          <i class="pl-lvl pl-l2">${sp.levels[1]}</i>
          <i class="pl-lvl pl-l3">${sp.levels[2]}</i>
        </span>
      </div>`).join('');
  }
  if (dyadsBox) {
    dyadsBox.innerHTML = PLUTCHIK_DYADS.map(([a, b, res]) =>
      `<span class="dyad"><b style="--e:${emotionColor(a)}">${a}</b> + <b style="--e:${emotionColor(b)}">${b}</b> = <em>${res}</em></span>`
    ).join('');
  }
})();

const intensity = document.getElementById('intensity');
const intensityVal = document.getElementById('intensityVal');
const sleep = document.getElementById('sleep');
const sleepVal = document.getElementById('sleepVal');
const energy = document.getElementById('energy');
const energyVal = document.getElementById('energyVal');
intensity.addEventListener('input', () => intensityVal.textContent = intensity.value);
sleep.addEventListener('input', () => sleepVal.textContent = sleep.value);
energy.addEventListener('input', () => energyVal.textContent = energy.value);

const STORE_KEY = ML_KEYS.diary;
export const loadEntries = () => safeParse(localStorage.getItem(STORE_KEY), []);
const saveEntries = e => localStorage.setItem(STORE_KEY, JSON.stringify(e));
// Список эмоций записи (совместимость: старый формат — одна эмоция, новый — массив)
const entryEmotions = e => (Array.isArray(e.emotions) && e.emotions.length)
  ? e.emotions
  : (e.emotion ? [{ name: e.emotion, color: e.color }] : []);
export const entryNames = e => entryEmotions(e).map(x => x.name);
// Период аналитики: 'week' | 'month' | 'all'
let statsPeriod = 'week';
function periodEntries(entries) {
  if (statsPeriod === 'all') return entries;
  const days = statsPeriod === 'week' ? 7 : 30;
  const from = Date.now() - days * 864e5;
  return entries.filter(e => e.date >= from);
}

const MAX_ENTRIES_PER_DAY = 3;   // до 3 отметок настроения в день
document.getElementById('saveEntry').addEventListener('click', () => {
  if (!selectedEmotions.length) { alert('Выберите хотя бы одну эмоцию, чтобы сохранить настроение дня.'); return; }
  const entries = loadEntries();
  const today = dayKey(Date.now());
  if (entries.filter(e => dayKey(e.date) === today).length >= MAX_ENTRIES_PER_DAY) {
    alert('Сегодня уже сохранено 3 отметки настроения — это максимум за день. Вернитесь к отметке завтра.');
    return;
  }
  entries.push({
    emotions: selectedEmotions.map(e => ({ name: e.name, color: e.color, spectrum: e.spectrum })),
    compound: compoundEmotion(selectedEmotions),   // единая составная эмоция (диада) или null
    emotion: selectedEmotions[0].name,   // для совместимости со старым форматом
    color: selectedEmotions[0].color,
    intensity: +intensity.value,
    sleep: +sleep.value,
    energy: +energy.value,
    note: document.getElementById('diaryNote').value.trim(),
    date: Date.now()
  });
  saveEntries(entries);
  document.getElementById('diaryNote').value = '';
  document.querySelectorAll('.emotion').forEach(x => x.classList.remove('sel'));
  selectedEmotions = [];
  renderEmotionResult();
  intensity.value = 5; intensityVal.textContent = '5';
  renderDiary();
  celebrate();
});

/* ---- Стрик и прогресс по слоям матрёшки (движок удержания) ---- */
const dayKey = ts => { const d = new Date(ts); return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate(); };
export function computeStreak(entries) {
  if (!entries.length) return 0;
  const days = new Set(entries.map(e => dayKey(e.date)));
  let streak = 0;
  const cur = new Date();
  // если сегодня нет отметки — считаем от вчера
  if (!days.has(dayKey(cur.getTime()))) cur.setDate(cur.getDate() - 1);
  while (days.has(dayKey(cur.getTime()))) { streak++; cur.setDate(cur.getDate() - 1); }
  return streak;
}
function renderStreak(entries) {
  const streak = computeStreak(entries);
  document.getElementById('streakDays').textContent = streak;
  document.getElementById('totalEntries').textContent = entries.length;
  // слой матрёшки открывается за прогресс: 1..5
  const level = Math.min(5, 1 + Math.floor(entries.length / 3));
  document.getElementById('layerLevel').textContent = level;
  // неделя-трекер
  const days = new Set(entries.map(e => dayKey(e.date)));
  const wk = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  let html = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(today.getDate() - mondayOffset + i);
    const done = days.has(dayKey(d.getTime()));
    const isFuture = d > today;
    html += `<span class="wk-day ${done?'done':''} ${isFuture?'future':''}">${wk[i]}</span>`;
  }
  document.getElementById('streakWeek').innerHTML = html;
}
function celebrate() {
  const el = document.getElementById('streakDays');
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
}

/* ---- Инсайты: связь настроения со сном и энергией ---- */
const NEG_NAMES = ['Тревога','Гнев','Грусть','Обида','Усталость','Страх','Ужас','Опасение','Горе','Задумчивость','Отвращение','Омерзение','Скука','Ярость','Досада'];
function renderInsights(entries) {
  const box = document.getElementById('insights');
  if (entries.length < 3) {
    box.innerHTML = `<div class="insight hint">📈 Отмечайтесь ${3 - entries.length} дн., чтобы открыть персональные инсайты о связи сна, энергии и настроения.</div>`;
    return;
  }
  const withSleep = entries.filter(e => e.sleep != null);
  const insights = [];
  const isNeg = e => entryNames(e).some(n => NEG_NAMES.includes(n));
  // корреляция сон → доля негатива (грубая эвристика для демо)
  const goodSleep = withSleep.filter(e => e.sleep >= 7);
  const badSleep = withSleep.filter(e => e.sleep < 7);
  const negShare = arr => arr.length ? Math.round(100 * arr.filter(isNeg).length / arr.length) : null;
  const ng = negShare(goodSleep), nb = negShare(badSleep);
  if (ng != null && nb != null && nb - ng >= 15) {
    insights.push(`😴 В дни с хорошим сном негативных эмоций на <b>${nb - ng}%</b> меньше. Сон — ваш ресурс.`);
  }
  const avgEnergy = Math.round(10 * withSleep.reduce((a, e) => a + (e.energy || 0), 0) / (withSleep.length || 1)) / 10;
  if (avgEnergy) insights.push(`⚡ Средний уровень энергии: <b>${avgEnergy}/10</b>.`);
  // самая частая эмоция (учитываем мультивыбор)
  const freq = {};
  entries.forEach(e => entryNames(e).forEach(n => freq[n] = (freq[n] || 0) + 1));
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  if (top) insights.push(`🎯 Чаще всего вы отмечаете: <b>${top[0]}</b>. Обратите на это внимание в практиках.`);
  box.innerHTML = insights.map(t => `<div class="insight">${t}</div>`).join('');
}

function renderDiary() {
  const all = loadEntries();
  const entries = periodEntries(all);
  const chartEl = document.getElementById('chart');
  const logEl = document.getElementById('diaryLog');
  renderStreak(all);
  renderInsights(entries);
  if (!entries.length) {
    const msg = all.length
      ? 'За выбранный период записей нет. Смените период или отметьте настроение дня.'
      : 'Пока нет записей. Отметьте своё состояние — и здесь появится статистика.';
    chartEl.innerHTML = `<p class="chart-empty">${msg}</p>`;
    logEl.innerHTML = '';
    return;
  }
  const label = e => {
    const d = new Date(e.date);
    return statsPeriod === 'all'
      ? d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
      : (statsPeriod === 'month'
          ? d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
          : d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'));
  };
  const last = entries.slice(-Math.min(entries.length, statsPeriod === 'week' ? 10 : 31));
  chartEl.innerHTML = last.map(e => {
    const col = entryEmotions(e)[0]?.color || e.color || '#8B5CF6';
    return `<div class="bar" style="--e:${col}">
      <div class="fill" style="height:${(e.intensity || 5) * 10}%"></div>
      <small>${label(e)}</small></div>`;
  }).join('');
  logEl.innerHTML = entries.slice(-14).reverse().map(e => {
    const d = new Date(e.date);
    const dt = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) + ' ' +
      d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    const meta = e.sleep != null ? ` <span class="log-meta">😴${e.sleep} ⚡${e.energy}</span>` : '';
    const tags = entryEmotions(e).map(x =>
      `<span class="tag" style="--e:${x.color}">${x.name}</span>`).join('');
    const comp = e.compound ? `<span class="tag tag-comp">→ ${escapeHtml(String(e.compound))}</span>` : '';
    return `<div class="log-item" style="--e:${entryEmotions(e)[0]?.color || '#8B5CF6'}">
      <span class="tags">${tags}${comp} <b class="tag-int">· ${e.intensity || 5}</b></span>
      <span class="txt">${e.note ? escapeHtml(e.note) : '<i>без заметки</i>'}${meta}</span>
      <time>${dt}</time></div>`;
  }).join('');
}
/* ---- Экспорт/импорт дневника в JSON (данные остаются у пользователя) ---- */
// Проверка одной записи из внешнего файла — это граница системы, доверять нельзя.
function isValidEntry(e) {
  if (!e || typeof e !== 'object') return false;
  if (typeof e.date !== 'number' || !isFinite(e.date)) return false;
  const hasArr = Array.isArray(e.emotions) && e.emotions.length &&
    e.emotions.every(x => x && typeof x.name === 'string');
  const hasLegacy = typeof e.emotion === 'string' && e.emotion;
  return hasArr || hasLegacy;
}
function exportDiary() {
  const entries = loadEntries();
  if (!entries.length) { alert('Дневник пуст — экспортировать нечего.'); return; }
  const payload = { app: 'matryoshka', kind: 'diary', version: 1, exportedAt: Date.now(), entries };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const stamp = d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  a.href = url;
  a.download = `matryoshka-dnevnik-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function importDiary(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = JSON.parse(reader.result); }
    catch { alert('Не удалось прочитать файл: это не корректный JSON.'); return; }
    // Принимаем и «обёртку» {entries:[...]}, и голый массив записей.
    const incoming = Array.isArray(data) ? data : (data && Array.isArray(data.entries) ? data.entries : null);
    if (!incoming) { alert('В файле нет записей дневника.'); return; }
    const valid = incoming.filter(isValidEntry);
    if (!valid.length) { alert('В файле не нашлось ни одной корректной записи дневника.'); return; }
    const current = loadEntries();
    const seen = new Set(current.map(e => e.date));
    const added = valid.filter(e => !seen.has(e.date));
    if (!added.length) { alert('Все записи из файла уже есть в дневнике — ничего не добавлено.'); return; }
    const merged = current.concat(added).sort((a, b) => a.date - b.date);
    saveEntries(merged);
    renderDiary();
    alert(`Импортировано новых записей: ${added.length}. Всего в дневнике: ${merged.length}.`);
  };
  reader.onerror = () => alert('Не удалось прочитать файл.');
  reader.readAsText(file);
}
(function initDiaryIO() {
  const exportBtn = document.getElementById('diaryExport');
  const importBtn = document.getElementById('diaryImportBtn');
  const importInput = document.getElementById('diaryImportInput');
  if (exportBtn) exportBtn.addEventListener('click', exportDiary);
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', () => {
      const file = importInput.files && importInput.files[0];
      if (file) importDiary(file);
      importInput.value = '';  // чтобы повторный выбор того же файла тоже срабатывал
    });
  }
})();

// Переключатель периода аналитики
(function initPeriodToggle() {
  const t = document.getElementById('periodToggle');
  if (!t) return;
  t.querySelectorAll('button').forEach(b => b.onclick = () => {
    t.querySelectorAll('button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    statsPeriod = b.dataset.period;
    renderDiary();
  });
})();
renderDiary();
