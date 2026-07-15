/* ================= Матрёшка Личности — прототип ================= */

/* ---------- Мобильное меню + активная навигация ---------- */
const burger = document.getElementById('burger');
const nav = document.getElementById('mainNav');
burger.addEventListener('click', () => nav.classList.toggle('open'));
document.querySelectorAll('[data-nav]').forEach(a =>
  a.addEventListener('click', () => nav.classList.remove('open'))
);

const sections = [...document.querySelectorAll('section[id]')];
const navLinks = [...document.querySelectorAll('.main-nav a')];
window.addEventListener('scroll', () => {
  const y = window.scrollY + 120;
  let cur = '';
  sections.forEach(s => { if (s.offsetTop <= y) cur = s.id; });
  navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + cur));
});

/* ================= ЧАТ-БОТ ================= */
const chat = document.getElementById('chat');
const quickReplies = document.getElementById('quickReplies');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

function addMsg(text, who = 'bot') {
  const el = document.createElement('div');
  el.className = 'msg ' + who;
  el.innerHTML = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}
function typing() {
  const el = document.createElement('div');
  el.className = 'msg bot typing';
  el.innerHTML = '<i></i><i></i><i></i>';
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}
function botSay(text, delay = 750) {
  return new Promise(res => {
    const t = typing();
    setTimeout(() => { t.remove(); addMsg(text); res(); }, delay);
  });
}
function setQuick(options) {
  quickReplies.innerHTML = '';
  options.forEach(o => {
    const b = document.createElement('button');
    b.textContent = o.label;
    b.onclick = () => { addMsg(o.label, 'user'); o.action(); };
    quickReplies.appendChild(b);
  });
}

/* Простой сценарный движок диалога по мотивам Telegram-бота */
const flow = {
  async start() {
    setQuick([]);
    await botSay('Здравствуйте! Рады, что вы решили познакомиться с Эмотологией. 🪆');
    await botSay('Я помогу разобраться с эмоциями и подберу простые техники. С чего начнём?');
    setQuick([
      { label: 'Простой диалог', action: flow.dialog },
      { label: 'Что такое эмотология?', action: flow.about },
      { label: 'Техники работы с состоянием', action: flow.techniques },
    ]);
  },
  async about() {
    await botSay('Эмотология учит замечать, называть и <b>завершать</b> эмоции. У каждой эмоции есть цикл: возникновение → проживание → завершение.');
    await botSay('Если эмоцию не прожить, она возвращается снова. Мы поможем это осознать. Хотите попробовать?');
    setQuick([
      { label: 'Да, простой диалог', action: flow.dialog },
      { label: 'Показать техники', action: flow.techniques },
    ]);
  },
  async dialog() {
    await botSay('Хорошо. Как вы себя чувствуете прямо сейчас?');
    setQuick([
      { label: '😟 Тревожно', action: () => flow.feel('тревога') },
      { label: '😠 Раздражённо', action: () => flow.feel('гнев') },
      { label: '😢 Грустно', action: () => flow.feel('грусть') },
      { label: '🙂 Хорошо', action: () => flow.feel('спокойствие') },
    ]);
  },
  async feel(state) {
    const map = {
      'тревога': 'Тревога часто живёт в теле — сжатие в груди, поверхностное дыхание. Это нормально. Давайте мягко её проживём.',
      'гнев': 'Злость нередко прикрывает страх или усталость. У вас есть право её чувствовать. Направим эту энергию в безопасное русло.',
      'грусть': 'Грусть тоже важна и хочет быть прожитой. Давайте побудем с ней и поддержим себя.',
      'спокойствие': 'Здорово, что у вас всё хорошо! Отличный момент, чтобы закрепить это состояние практикой благодарности.'
    };
    const rec = {
      'тревога': 'дыхание',
      'гнев': 'звучание',
      'грусть': 'рисование',
      'спокойствие': 'медитация'
    };
    await botSay(map[state]);
    await botSay('Рекомендую технику из направления «' + rec[state] + '». Это упражнение на 5–7 минут.');
    setQuick([
      { label: 'Показать технику', action: () => { document.querySelector('#practices').scrollIntoView({behavior:'smooth'}); filterPractices(rec[state]); flow.after(); } },
      { label: 'Записать в дневник', action: () => { document.querySelector('#organizer').scrollIntoView({behavior:'smooth'}); flow.after(); } },
    ]);
  },
  async techniques() {
    await botSay('Техники работы с состоянием — простые упражнения на 5–7 минут. Выберите направление:');
    setQuick([
      { label: 'Техники дыхания', action: () => flow.pickTech('дыхание') },
      { label: 'Техники рисования', action: () => flow.pickTech('рисование') },
      { label: 'Техники звучания', action: () => flow.pickTech('звучание') },
    ]);
  },
  async pickTech(cat) {
    await botSay('Отличный выбор! Открываю подборку практик направления «' + cat + '» ниже. 👇');
    document.querySelector('#practices').scrollIntoView({ behavior: 'smooth' });
    filterPractices(cat);
    flow.after();
  },
  async after() {
    await botSay('Если захотите продолжить — я рядом. Что дальше?');
    setQuick([
      { label: 'Начать сначала', action: () => { chat.innerHTML=''; flow.start(); } },
      { label: 'Ещё техники', action: flow.techniques },
    ]);
  }
};

function handleFreeText() {
  const v = chatInput.value.trim();
  if (!v) return;
  addMsg(v, 'user');
  chatInput.value = '';
  const low = v.toLowerCase();
  if (/(трев|паник|страх|боюсь)/.test(low)) return flow.feel('тревога');
  if (/(зл|гнев|раздраж|бесит)/.test(low)) return flow.feel('гнев');
  if (/(груст|тоск|плак|одинок)/.test(low)) return flow.feel('грусть');
  if (/(хорош|спокой|рад|отлич)/.test(low)) return flow.feel('спокойствие');
  botSay('Спасибо, что поделились. Расскажите чуть больше — что вы сейчас чувствуете?').then(() =>
    setQuick([
      { label: '😟 Тревожно', action: () => flow.feel('тревога') },
      { label: '😠 Раздражённо', action: () => flow.feel('гнев') },
      { label: '😢 Грустно', action: () => flow.feel('грусть') },
      { label: '🙂 Хорошо', action: () => flow.feel('спокойствие') },
    ])
  );
}
chatSend.addEventListener('click', handleFreeText);
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleFreeText(); });
flow.start();

/* ================= ОРГАНАЙЗЕР ЭМОЦИЙ ================= */
const EMOTIONS = [
  { name: 'Радость', color: '#FBBF24' },
  { name: 'Спокойствие', color: '#22D3EE' },
  { name: 'Тревога', color: '#8B5CF6' },
  { name: 'Гнев', color: '#EF4444' },
  { name: 'Грусть', color: '#6366F1' },
  { name: 'Обида', color: '#EC4899' },
  { name: 'Усталость', color: '#94A3B8' },
  { name: 'Благодарность', color: '#10B981' },
];
const emotionsWrap = document.getElementById('emotions');
let selectedEmotion = null;
EMOTIONS.forEach(e => {
  const b = document.createElement('button');
  b.className = 'emotion';
  b.style.setProperty('--e', e.color);
  b.innerHTML = `<span class="dot"></span>${e.name}`;
  b.onclick = () => {
    document.querySelectorAll('.emotion').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel');
    selectedEmotion = e;
  };
  emotionsWrap.appendChild(b);
});

const intensity = document.getElementById('intensity');
const intensityVal = document.getElementById('intensityVal');
const sleep = document.getElementById('sleep');
const sleepVal = document.getElementById('sleepVal');
const energy = document.getElementById('energy');
const energyVal = document.getElementById('energyVal');
intensity.addEventListener('input', () => intensityVal.textContent = intensity.value);
sleep.addEventListener('input', () => sleepVal.textContent = sleep.value);
energy.addEventListener('input', () => energyVal.textContent = energy.value);

const STORE_KEY = 'ml_diary';
const loadEntries = () => JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
const saveEntries = e => localStorage.setItem(STORE_KEY, JSON.stringify(e));

document.getElementById('saveEntry').addEventListener('click', () => {
  if (!selectedEmotion) { alert('Выберите эмоцию, которую вы сейчас чувствуете.'); return; }
  const entries = loadEntries();
  entries.push({
    emotion: selectedEmotion.name,
    color: selectedEmotion.color,
    intensity: +intensity.value,
    sleep: +sleep.value,
    energy: +energy.value,
    note: document.getElementById('diaryNote').value.trim(),
    date: Date.now()
  });
  saveEntries(entries);
  document.getElementById('diaryNote').value = '';
  document.querySelectorAll('.emotion').forEach(x => x.classList.remove('sel'));
  selectedEmotion = null;
  intensity.value = 5; intensityVal.textContent = '5';
  renderDiary();
  celebrate();
});

/* ---- Стрик и прогресс по слоям матрёшки (движок удержания) ---- */
const dayKey = ts => { const d = new Date(ts); return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate(); };
function computeStreak(entries) {
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
function renderInsights(entries) {
  const box = document.getElementById('insights');
  if (entries.length < 3) {
    box.innerHTML = `<div class="insight hint">📈 Отмечайтесь ${3 - entries.length} дн., чтобы открыть персональные инсайты о связи сна, энергии и настроения.</div>`;
    return;
  }
  const withSleep = entries.filter(e => e.sleep != null);
  const insights = [];
  // корреляция сон → интенсивность негатива (грубая эвристика для демо)
  const goodSleep = withSleep.filter(e => e.sleep >= 7);
  const badSleep = withSleep.filter(e => e.sleep < 7);
  const NEG = ['Тревога','Гнев','Грусть','Обида','Усталость'];
  const negShare = arr => arr.length ? Math.round(100 * arr.filter(e => NEG.includes(e.emotion)).length / arr.length) : null;
  const ng = negShare(goodSleep), nb = negShare(badSleep);
  if (ng != null && nb != null && nb - ng >= 15) {
    insights.push(`😴 В дни с хорошим сном негативных эмоций на <b>${nb - ng}%</b> меньше. Сон — ваш ресурс.`);
  }
  const avgEnergy = Math.round(10 * withSleep.reduce((a, e) => a + (e.energy || 0), 0) / (withSleep.length || 1)) / 10;
  if (avgEnergy) insights.push(`⚡ Средний уровень энергии: <b>${avgEnergy}/10</b>.`);
  // самая частая эмоция
  const freq = {};
  entries.forEach(e => freq[e.emotion] = (freq[e.emotion] || 0) + 1);
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  if (top) insights.push(`🎯 Чаще всего вы отмечаете: <b>${top[0]}</b>. Обратите на это внимание в практиках.`);
  box.innerHTML = insights.map(t => `<div class="insight">${t}</div>`).join('');
}

function renderDiary() {
  const entries = loadEntries();
  const chartEl = document.getElementById('chart');
  const logEl = document.getElementById('diaryLog');
  renderStreak(entries);
  renderInsights(entries);
  if (!entries.length) {
    chartEl.innerHTML = '<p class="chart-empty">Пока нет записей. Отметьте своё состояние — и здесь появится статистика.</p>';
    logEl.innerHTML = '';
    return;
  }
  const last = entries.slice(-10);
  chartEl.innerHTML = last.map(e => {
    const d = new Date(e.date);
    const t = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    return `<div class="bar" style="--e:${e.color}">
      <div class="fill" style="height:${e.intensity * 10}%"></div>
      <small>${t}</small></div>`;
  }).join('');
  logEl.innerHTML = entries.slice(-12).reverse().map(e => {
    const d = new Date(e.date);
    const dt = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) + ' ' +
      d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    const meta = e.sleep != null ? ` <span class="log-meta">😴${e.sleep} ⚡${e.energy}</span>` : '';
    return `<div class="log-item" style="--e:${e.color}">
      <span class="tag">${e.emotion} · ${e.intensity}</span>
      <span class="txt">${e.note ? escapeHtml(e.note) : '<i>без заметки</i>'}${meta}</span>
      <time>${dt}</time></div>`;
  }).join('');
}
function escapeHtml(s){return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
renderDiary();

/* ================= КАРТА ЛИЧНОСТИ (Дары и Поля) ================= */
(function initMap() {
  const chips = document.getElementById('fieldsChips');
  if (!chips || !window.YupDar) return;
  const { FIELDS, getPersonalityCard } = window.YupDar;
  chips.innerHTML = Object.entries(FIELDS).map(([n, f]) =>
    `<span class="field-chip" style="--fc:${f.color}" data-field="${n}">${f.icon} ${f.name}<i>${f.theme}</i></span>`
  ).join('');
  chips.querySelectorAll('.field-chip').forEach(ch => ch.onclick = () => {
    const f = FIELDS[ch.dataset.field];
    document.getElementById('mapResult').innerHTML = `
      <div class="map-card" style="--fc:${f.color}">
        <div class="map-field-head"><span class="map-field-icon">${f.icon}</span>
          <div><h3>Поле ${f.name}</h3><span class="muted">${f.theme}</span></div></div>
        <p class="map-block"><b>Потенциал (МА):</b> ${f.ma}</p>
        <p class="map-block"><b>Реализация (ЖИ):</b> ${f.zhi}</p>
        <p class="map-block"><b>Результат (КУН):</b> ${f.kun}</p>
        <p class="map-shadow"><b>Тень:</b> ${f.shadow}</p>
      </div>`;
    document.getElementById('mapResult').scrollIntoView({ behavior:'smooth', block:'nearest' });
  });

  document.getElementById('calcDar').onclick = () => {
    const d = +document.getElementById('dobDay').value;
    const m = +document.getElementById('dobMonth').value;
    const y = +document.getElementById('dobYear').value;
    if (!d || !m || !y || d > 31 || m > 12 || y < 1920) {
      alert('Введите корректную дату рождения.'); return;
    }
    const r = getPersonalityCard(d, m, y);
    const f = r.field;
    const typeLabel = r.type === 'absolute' ? '<span class="map-badge">✨ Абсолютное присутствие</span>'
      : r.type === 'field_human' ? '<span class="map-badge">🌐 Человек-Поле</span>' : '';
    document.getElementById('mapResult').innerHTML = `
      <div class="map-card revealed" style="--fc:${f.color}">
        ${typeLabel}
        <div class="map-code">${r.code}</div>
        <h3 class="map-dar-name">${r.darName}</h3>
        <p class="map-arch">${r.darArch}</p>
        <div class="map-mzk">
          <span><b>МА</b>${r.ma}<i>потенциал</i></span>
          <span><b>ЖИ</b>${r.zhi}<i>реализация</i></span>
          <span><b>КУН</b>${r.kun}<i>мощность</i></span>
        </div>
        <div class="map-field-head" style="margin-top:6px"><span class="map-field-icon">${f.icon}</span>
          <div><h4>Ваше Поле: ${f.name}</h4><span class="muted">${f.theme}</span></div></div>
        <p class="map-block"><b>Ваш потенциал:</b> ${f.ma}</p>
        <p class="map-block"><b>Как проявляется:</b> ${f.zhi}</p>
        <p class="map-shadow"><b>Зона роста (тень):</b> ${f.shadow}</p>
        <a href="#pricing" class="btn btn-primary" data-nav>Раскрыть полную Карту личности</a>
      </div>`;
  };
})();

/* ================= ПРАКТИКИ ================= */
const PRACTICES = [
  { cat: 'дыхание', icon: '🌬️', title: 'Дыхание по квадрату', desc: 'Вдох на 4 — задержка 4 — выдох 4 — пауза 4. Успокаивает нервную систему.', time: '5 мин' },
  { cat: 'дыхание', icon: '🫁', title: 'Дыхание 4-7-8', desc: 'Медленный выдох активирует расслабление и снижает тревогу.', time: '5 мин' },
  { cat: 'дыхание', icon: '🌊', title: 'Волновое дыхание', desc: 'Дышите животом, представляя набегающие и уходящие волны.', time: '6 мин' },
  { cat: 'рисование', icon: '🎨', title: 'Рисунок эмоции', desc: 'Изобразите чувство цветом и формой — без оценки результата.', time: '7 мин' },
  { cat: 'рисование', icon: '✏️', title: 'Каракули', desc: 'Свободные линии на бумаге помогают выпустить напряжение.', time: '5 мин' },
  { cat: 'рисование', icon: '🌈', title: 'Палитра настроения', desc: 'Заполните лист цветами вашего дня — наглядно и терапевтично.', time: '6 мин' },
  { cat: 'звучание', icon: '🎵', title: 'Пропевание гласных', desc: 'Тянущийся звук «а-о-у» снимает зажимы и заземляет.', time: '5 мин' },
  { cat: 'звучание', icon: '🥁', title: 'Ритм ладонями', desc: 'Простукивайте ритм — тело выпускает злость безопасно.', time: '5 мин' },
  { cat: 'звучание', icon: '🎧', title: 'Осознанное слушание', desc: 'Выберите звук и полностью растворитесь в нём на минуту.', time: '4 мин' },
  { cat: 'тело', icon: '🧘', title: 'Сканирование тела', desc: 'Пройдитесь вниманием от макушки до стоп, отпуская зажимы.', time: '7 мин' },
  { cat: 'тело', icon: '💪', title: 'Мышечная релаксация', desc: 'Напрягите и отпустите мышцы по очереди — уходит спазм.', time: '7 мин' },
  { cat: 'тело', icon: '🚶', title: 'Осознанная ходьба', desc: 'Медленный шаг с вниманием к каждому касанию стопы.', time: '6 мин' },
  { cat: 'медитация', icon: '🕯️', title: 'Здесь и сейчас', desc: 'Назовите 5 вещей, что видите, 4 — слышите, 3 — ощущаете.', time: '5 мин' },
  { cat: 'медитация', icon: '💜', title: 'Практика доброты', desc: 'Пожелайте благополучия себе и близким — мягко и тепло.', time: '6 мин' },
  { cat: 'письмо', icon: '📝', title: 'Незавершённое письмо', desc: 'Напишите то, что не сказали. Прожить — значит завершить.', time: '7 мин' },
  { cat: 'письмо', icon: '🙏', title: 'Дневник благодарности', desc: 'Три вещи, за которые вы благодарны сегодня.', time: '4 мин' },
];
const CATS = ['все', 'дыхание', 'рисование', 'звучание', 'тело', 'медитация', 'письмо'];
const CAT_COLOR = { 'дыхание':'#22D3EE','рисование':'#EC4899','звучание':'#8B5CF6','тело':'#10B981','медитация':'#FBBF24','письмо':'#6366F1' };

const filtersWrap = document.getElementById('practiceFilters');
const grid = document.getElementById('practicesGrid');
let activeCat = 'все';

CATS.forEach(c => {
  const b = document.createElement('button');
  b.textContent = c[0].toUpperCase() + c.slice(1);
  if (c === 'все') b.classList.add('active');
  b.onclick = () => filterPractices(c);
  b.dataset.cat = c;
  filtersWrap.appendChild(b);
});

function filterPractices(cat) {
  activeCat = cat;
  document.querySelectorAll('#practiceFilters button').forEach(b =>
    b.classList.toggle('active', b.dataset.cat === cat));
  renderPractices();
}
function renderPractices() {
  const list = activeCat === 'все' ? PRACTICES : PRACTICES.filter(p => p.cat === activeCat);
  grid.innerHTML = list.map(p => `
    <article class="card practice-card" style="--c:${CAT_COLOR[p.cat]}">
      <div class="p-icon">${p.icon}</div>
      <h3>${p.title}</h3>
      <p>${p.desc}</p>
      <div class="practice-meta">
        <span class="practice-cat">#${p.cat}</span>
        <span>⏱ ${p.time}</span>
      </div>
    </article>`).join('');
}
renderPractices();

/* ================= ПЕРЕКЛЮЧАТЕЛЬ ТАРИФОВ (мес/год) ================= */
(function billing() {
  const toggle = document.getElementById('billingToggle');
  if (!toggle) return;
  const priceEl = document.querySelector('.price-card.featured .price');
  toggle.querySelectorAll('button').forEach(b => b.onclick = () => {
    toggle.querySelectorAll('button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    priceEl.innerHTML = b.dataset.plan === 'year' ? priceEl.dataset.year : priceEl.dataset.month;
  });
})();
