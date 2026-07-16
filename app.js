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
    await botSay('Хорошо. Как вы себя чувствуете прямо сейчас? Выберите — или напишите своими словами.');
    setQuick([
      { label: '😟 Тревога', action: () => flow.feel('Тревога') },
      { label: '😠 Гнев', action: () => flow.feel('Гнев') },
      { label: '😢 Грусть', action: () => flow.feel('Грусть') },
      { label: '😔 Обида', action: () => flow.feel('Обида') },
      { label: '😮‍💨 Усталость', action: () => flow.feel('Усталость') },
      { label: '🙂 Радость', action: () => flow.feel('Радость') },
      { label: '😌 Спокойствие', action: () => flow.feel('Спокойствие') },
      { label: '🙏 Благодарность', action: () => flow.feel('Благодарность') },
    ]);
  },
  async feel(state) {
    const g = EMOTION_GUIDE[state] || EMOTION_GUIDE['Спокойствие'];
    const rec = PRACTICES.find(p => p.cat === g.rec);
    await botSay(g.text);
    await botSay(`Рекомендую практику «<b>${rec.title}</b>» из направления «${g.rec}» — это ${rec.time}. Хотите попробовать?`);
    setQuick([
      { label: 'Показать практику', action: () => { openPractice(rec); flow.after(); } },
      { label: 'Другие практики этого типа', action: () => { scrollToPractices(g.rec); flow.after(); } },
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
  // Безопасность: признаки кризиса — мягко направляем к живой помощи
  if (/(суицид|убить себя|не хочу жить|покончить|нет смысла жить|причинить себе)/.test(low)) {
    botSay('Мне важно то, что вы сейчас пишете, и я отношусь к этому серьёзно. 💜 Пожалуйста, не оставайтесь с этим наедине — прямо сейчас можно позвонить на бесплатный круглосуточный телефон доверия <b>8-800-2000-122</b> или в экстренную службу <b>112</b>. Также в приложении есть живые психологи-эмотологи, они рядом.').then(() =>
      setQuick([{ label: 'Показать психологов', action: () => document.querySelector('#psychologists').scrollIntoView({behavior:'smooth'}) }]));
    return;
  }
  if (/(трев|паник|страх|боюсь|волну|беспоко)/.test(low)) return flow.feel('Тревога');
  if (/(зл|гнев|раздраж|бесит|злюсь|ярост)/.test(low)) return flow.feel('Гнев');
  if (/(груст|тоск|плак|печал|уныл)/.test(low)) return flow.feel('Грусть');
  if (/(обид|предал|несправедлив|задел)/.test(low)) return flow.feel('Обида');
  if (/(устал|вымот|нет сил|истощ|выгор|разбит)/.test(low)) return flow.feel('Усталость');
  if (/(благодар|признат)/.test(low)) return flow.feel('Благодарность');
  if (/(рад|счаст|отлич|здорово|воодушев)/.test(low)) return flow.feel('Радость');
  if (/(спокой|норм|хорош|ровн)/.test(low)) return flow.feel('Спокойствие');
  botSay('Спасибо, что поделились. Расскажите чуть больше — что вы сейчас чувствуете?').then(() =>
    setQuick([
      { label: '😟 Тревога', action: () => flow.feel('Тревога') },
      { label: '😠 Гнев', action: () => flow.feel('Гнев') },
      { label: '😢 Грусть', action: () => flow.feel('Грусть') },
      { label: '😔 Обида', action: () => flow.feel('Обида') },
      { label: '😮‍💨 Усталость', action: () => flow.feel('Усталость') },
      { label: '🙂 Радость', action: () => flow.feel('Радость') },
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

/* ================= ПРАКТИКИ =================
   Каждая практика: категория, иконка, название, краткое описание, время,
   пошаговая инструкция (steps) и совет, когда применять (when). */
const PRACTICES = [
  /* --- ДЫХАНИЕ --- */
  { cat:'дыхание', icon:'🌬️', title:'Дыхание по квадрату', desc:'Вдох 4 — задержка 4 — выдох 4 — пауза 4. Успокаивает нервную систему.', time:'5 мин',
    when:'Когда тревожно, перед важным событием или чтобы вернуть контроль.',
    steps:['Сядьте удобно, спина прямая, плечи опущены.','Медленно вдохните через нос, считая до 4.','Задержите дыхание на счёт 4.','Плавно выдохните через рот на счёт 4.','Пауза на счёт 4 — и повторите цикл 4–6 раз.'] },
  { cat:'дыхание', icon:'🫁', title:'Дыхание 4-7-8', desc:'Длинный выдох включает расслабление и снижает тревогу.', time:'5 мин',
    when:'Перед сном или при остром волнении.',
    steps:['Кончик языка — за верхними зубами.','Вдох через нос на счёт 4.','Задержка дыхания на счёт 7.','Долгий выдох через рот со звуком «ш-ш» на счёт 8.','Повторите 4 цикла, не напрягаясь.'] },
  { cat:'дыхание', icon:'🌊', title:'Волновое дыхание животом', desc:'Дышите животом, представляя набегающие и уходящие волны.', time:'6 мин',
    when:'Когда нужно заземлиться и замедлиться.',
    steps:['Положите ладонь на живот.','Вдох — живот мягко надувается, как волна приходит к берегу.','Выдох — живот опадает, волна уходит.','Дышите в этом ритме, не форсируя.','Считайте до 10 волн.'] },
  { cat:'дыхание', icon:'🔥', title:'Охлаждающее дыхание', desc:'Вдох через «трубочку» из губ остужает и снимает раздражение.', time:'4 мин',
    when:'Когда злость или жар поднимаются внутри.',
    steps:['Сверните губы трубочкой (или язык, если получается).','Медленно вдохните через это узкое отверстие — воздух ощущается прохладным.','Закройте рот и выдохните через нос.','Повторяйте 8–10 раз, отмечая, как внутри становится спокойнее.'] },
  { cat:'дыхание', icon:'⚖️', title:'Попеременное дыхание', desc:'Дыхание через одну ноздрю уравновешивает состояние.', time:'6 мин',
    when:'Когда мысли скачут и трудно сосредоточиться.',
    steps:['Правым большим пальцем закройте правую ноздрю.','Вдохните через левую ноздрю.','Закройте левую ноздрю, откройте правую — выдохните.','Вдохните через правую, поменяйте — выдохните через левую.','Продолжайте 8 циклов.'] },
  { cat:'дыхание', icon:'🌬️', title:'Продлённый выдох', desc:'Выдох вдвое длиннее вдоха — быстрый способ успокоиться.', time:'3 мин',
    when:'В любой момент напряжения, даже незаметно для окружающих.',
    steps:['Вдохните на счёт 3.','Выдохните на счёт 6, полностью опустошая лёгкие.','Не задерживайте дыхание между циклами.','Повторяйте 2–3 минуты.'] },

  /* --- РИСОВАНИЕ --- */
  { cat:'рисование', icon:'🎨', title:'Рисунок эмоции', desc:'Изобразите чувство цветом и формой — без оценки результата.', time:'7 мин',
    when:'Когда трудно назвать словами, что внутри.',
    steps:['Возьмите бумагу и то, чем рисовать.','Спросите себя: какого цвета моё чувство? Какой оно формы?','Рисуйте, не думая о красоте — доверьтесь руке.','Когда закончите, посмотрите на рисунок как со стороны.','Отметьте, что изменилось в теле.'] },
  { cat:'рисование', icon:'✏️', title:'Каракули', desc:'Свободные линии на бумаге помогают выпустить напряжение.', time:'5 мин',
    when:'Когда внутри много энергии или беспокойства.',
    steps:['Возьмите ручку и лист.','Позвольте руке чертить любые линии — быстро, хаотично, с нажимом.','Не контролируйте результат.','Когда почувствуете разрядку — остановитесь.','Сделайте вдох и посмотрите на след своей энергии.'] },
  { cat:'рисование', icon:'🌈', title:'Палитра настроения', desc:'Заполните лист цветами вашего дня — наглядно и терапевтично.', time:'6 мин',
    when:'Вечером, чтобы подвести итог дня.',
    steps:['Разделите лист на несколько частей — по событиям дня.','Каждому событию подберите цвет по ощущению.','Закрасьте участки.','Посмотрите на палитру целиком: каких цветов больше?','Спросите себя, что хочется добавить завтра.'] },
  { cat:'рисование', icon:'🖤', title:'Рисунок и трансформация', desc:'Нарисуйте тяжёлое чувство — и дорисуйте ему опору.', time:'8 мин',
    when:'Когда чувство кажется большим и подавляющим.',
    steps:['Нарисуйте своё тяжёлое чувство так, как оно ощущается.','Побудьте с рисунком минуту.','Теперь добавьте на лист что-то поддерживающее: свет, руку, дверь, солнце.','Отметьте, как меняется восприятие.'] },
  { cat:'рисование', icon:'🌀', title:'Мандала спокойствия', desc:'Рисование по кругу от центра успокаивает и центрирует.', time:'10 мин',
    when:'Когда нужно собрать себя и замедлиться.',
    steps:['Поставьте точку в центре листа.','Рисуйте узоры вокруг неё, двигаясь по кругу.','Повторяйте элементы, добавляйте цвет.','Сосредоточьтесь на процессе, а не на результате.','Завершите, когда почувствуете умиротворение.'] },

  /* --- ЗВУЧАНИЕ --- */
  { cat:'звучание', icon:'🎵', title:'Пропевание гласных', desc:'Тянущийся звук «а-о-у» снимает зажимы и заземляет.', time:'5 мин',
    when:'Когда в горле или груди ком, трудно выразить себя.',
    steps:['Сделайте глубокий вдох.','На выдохе тяните звук «а-а-а», ощущая вибрацию в груди.','Затем «о-о-о» — вибрация в животе.','Затем «у-у-у» — вибрация ниже.','Повторите каждый звук 3 раза.'] },
  { cat:'звучание', icon:'🥁', title:'Ритм ладонями', desc:'Простукивайте ритм — тело безопасно выпускает злость.', time:'5 мин',
    when:'Когда накопилось раздражение или гнев.',
    steps:['Похлопайте ладонями по бёдрам, столу или подушке.','Задайте ритм, который отражает ваше состояние.','Постепенно усиливайте, выпуская напряжение.','Затем плавно замедляйтесь.','Закончите тишиной и вдохом.'] },
  { cat:'звучание', icon:'🎧', title:'Осознанное слушание', desc:'Выберите звук и полностью растворитесь в нём на минуту.', time:'4 мин',
    when:'Когда мысли не отпускают, нужно переключиться.',
    steps:['Закройте глаза.','Выберите один звук вокруг — птицы, гул, музыка.','Слушайте только его, отмечая оттенки.','Когда внимание уплывает — мягко возвращайте к звуку.','Через минуту откройте глаза.'] },
  { cat:'звучание', icon:'😮‍💨', title:'Звук вздоха облегчения', desc:'Громкий выдох со звуком сбрасывает напряжение.', time:'3 мин',
    when:'Когда хочется «сбросить» тяжесть с плеч.',
    steps:['Вдохните полной грудью.','Выдохните с открытым ртом и звуком «ха-а» — как вздох облегчения.','Опустите плечи вместе с выдохом.','Повторите 5–6 раз.'] },
  { cat:'звучание', icon:'🎶', title:'Гудение (жужжащее дыхание)', desc:'Мягкое «м-м-м» на выдохе успокаивает мозг.', time:'5 мин',
    when:'При тревоге и переутомлении.',
    steps:['Закройте глаза, губы сомкнуты.','На выдохе издавайте ровное «м-м-м», ощущая вибрацию в голове.','Пусть выдох будет долгим.','Повторяйте 6–8 раз.','Посидите в тишине, замечая эффект.'] },

  /* --- ТЕЛО --- */
  { cat:'тело', icon:'🧘', title:'Сканирование тела', desc:'Пройдитесь вниманием от макушки до стоп, отпуская зажимы.', time:'7 мин',
    when:'При усталости, перед сном, для контакта с телом.',
    steps:['Лягте или сядьте удобно, закройте глаза.','Направьте внимание на макушку, затем медленно вниз.','В каждой части тела замечайте ощущения без оценки.','Где есть зажим — мягко «выдыхайте» его.','Дойдя до стоп, ощутите всё тело целиком.'] },
  { cat:'тело', icon:'💪', title:'Мышечная релаксация', desc:'Напрягите и отпустите мышцы по очереди — уходит спазм.', time:'7 мин',
    when:'Когда тело «каменное» от стресса.',
    steps:['Сожмите кулаки на 5 секунд — резко отпустите.','Напрягите плечи к ушам — отпустите.','Напрягите живот — отпустите.','Напрягите ноги и стопы — отпустите.','Ощутите разницу между напряжением и покоем.'] },
  { cat:'тело', icon:'🚶', title:'Осознанная ходьба', desc:'Медленный шаг с вниманием к каждому касанию стопы.', time:'6 мин',
    when:'Когда нужно выйти из головы в тело.',
    steps:['Идите медленнее обычного.','Замечайте, как стопа касается земли: пятка, свод, носок.','Синхронизируйте шаги с дыханием.','Если отвлеклись — вернитесь к ощущению ног.','Пройдите так несколько минут.'] },
  { cat:'тело', icon:'🤗', title:'Объятие себя', desc:'Мягкое самоприкосновение включает чувство безопасности.', time:'3 мин',
    when:'Когда одиноко, тревожно или нужна поддержка.',
    steps:['Обхватите себя руками за плечи.','Слегка покачивайтесь, как убаюкивая.','Дышите медленно и ровно.','Мысленно скажите себе тёплые слова.','Побудьте так, сколько хочется.'] },
  { cat:'тело', icon:'🌡️', title:'Заземление 5-4-3-2-1', desc:'Возвращение в «здесь и сейчас» через органы чувств.', time:'5 мин',
    when:'При панике, наплыве тревоги, «улёте» в мысли.',
    steps:['Назовите 5 вещей, которые видите.','4 вещи, которые слышите.','3, которых можете коснуться.','2 запаха, которые чувствуете.','1 вкус — и сделайте спокойный вдох.'] },
  { cat:'тело', icon:'🙆', title:'Растяжка-потягивание', desc:'Мягко потянитесь всем телом, как после сна.', time:'4 мин',
    when:'При зажатости, вялости, для прилива энергии.',
    steps:['Встаньте, поднимите руки вверх и потянитесь.','Наклонитесь вправо, затем влево.','Мягко скрутитесь корпусом в стороны.','Потрясите кистями и стопами.','Сделайте вдох и опустите плечи.'] },

  /* --- МЕДИТАЦИЯ --- */
  { cat:'медитация', icon:'🕯️', title:'Здесь и сейчас', desc:'Мягкое возвращение внимания в настоящий момент.', time:'5 мин',
    when:'Когда уносит в тревожное будущее или прошлое.',
    steps:['Сядьте удобно, закройте глаза.','Заметьте своё дыхание, не меняя его.','Отмечайте: «вдох… выдох…».','Появилась мысль — просто отметьте и верните внимание к дыханию.','Побудьте так несколько минут.'] },
  { cat:'медитация', icon:'💜', title:'Практика доброты (метта)', desc:'Пожелайте благополучия себе и близким — мягко и тепло.', time:'6 мин',
    when:'Когда хочется тепла, при самокритике, обиде.',
    steps:['Закройте глаза, положите руку на сердце.','Мысленно скажите себе: «Пусть я буду в покое, пусть мне будет хорошо».','Представьте близкого человека и пожелайте того же ему.','Расширьте пожелание на всех, кого знаете.','Побудьте в этом тепле.'] },
  { cat:'медитация', icon:'☀️', title:'Закрепление радости', desc:'Удерживайте приятное чувство, чтобы оно «впиталось».', time:'5 мин',
    when:'В моменты радости, благодарности, спокойствия.',
    steps:['Заметьте приятное чувство прямо сейчас.','Где оно живёт в теле? Какое оно?','Задержитесь на нём 20–30 секунд, усиливая.','Представьте, что оно наполняет всё тело.','Мысленно скажите «спасибо» этому моменту.'] },
  { cat:'медитация', icon:'🌳', title:'Образ безопасного места', desc:'Внутреннее убежище, куда можно вернуться в любой момент.', time:'7 мин',
    when:'При тревоге, для восстановления чувства опоры.',
    steps:['Закройте глаза, сделайте несколько вдохов.','Представьте место, где вам спокойно и безопасно.','Наполните его деталями: цвета, звуки, запахи, тепло.','Побудьте там, впитывая ощущение защищённости.','Запомните его — сюда можно возвращаться.'] },
  { cat:'медитация', icon:'🍃', title:'Мысли-облака', desc:'Наблюдайте мысли, не цепляясь за них.', time:'6 мин',
    when:'Когда мысли навязчивы и утомляют.',
    steps:['Сядьте, закройте глаза.','Представьте небо, а мысли — облака.','Каждую мысль отпускайте плыть дальше.','Не боритесь с ними, просто наблюдайте.','Возвращайтесь к небу между облаками.'] },
  { cat:'медитация', icon:'🔔', title:'Одна минута тишины', desc:'Короткая пауза-перезагрузка среди дня.', time:'2 мин',
    when:'В любой момент, когда нужно «выдохнуть».',
    steps:['Остановите дела.','Закройте глаза или опустите взгляд.','Сделайте 5 медленных вдохов и выдохов.','Ничего не делайте — просто будьте.','Мягко вернитесь к делам.'] },

  /* --- ПИСЬМО --- */
  { cat:'письмо', icon:'📝', title:'Незавершённое письмо', desc:'Напишите то, что не сказали. Прожить — значит завершить.', time:'7 мин',
    when:'При обиде, невысказанном, тяжести в отношениях.',
    steps:['Возьмите лист и напишите обращение тому, кому хочется.','Пишите всё, что не сказали, без цензуры.','Не сдерживайте чувства — их важно выразить.','Письмо можно не отправлять — оно для вас.','Перечитайте и решите, что с ним сделать.'] },
  { cat:'письмо', icon:'🙏', title:'Дневник благодарности', desc:'Три вещи, за которые вы благодарны сегодня.', time:'4 мин',
    when:'Вечером, для смещения фокуса на хорошее.',
    steps:['Вспомните прошедший день.','Запишите 3 вещи, за которые благодарны — даже мелочи.','К каждой добавьте, почему она важна.','Отметьте, что чувствуете, перечитывая.'] },
  { cat:'письмо', icon:'🗑️', title:'Выгрузка тревог', desc:'Перенесите все тревоги из головы на бумагу.', time:'6 мин',
    when:'Когда в голове «каша» из беспокойств.',
    steps:['Выпишите всё, что тревожит, списком.','Не оценивайте и не решайте — просто выгружайте.','Разделите: на что могу повлиять / на что нет.','На «могу» наметьте один маленький шаг.','«Не могу» — мысленно отпустите.'] },
  { cat:'письмо', icon:'💌', title:'Письмо себе с поддержкой', desc:'Напишите себе так, как написали бы дорогому другу.', time:'6 мин',
    when:'При самокритике, в трудный период.',
    steps:['Вспомните, что вас сейчас гложет.','Представьте, что это переживает близкий друг.','Напишите ему тёплые, поддерживающие слова.','Теперь перечитайте это, обращаясь к себе.','Заметьте, как меняется отношение к ситуации.'] },
  { cat:'письмо', icon:'📖', title:'Дневник эмоций', desc:'Опишите чувство по циклу: что вызвало, как ощущается, что помогает.', time:'7 мин',
    when:'Чтобы понять и завершить эмоцию.',
    steps:['Назовите эмоцию, которую переживаете.','Что её вызвало? Опишите ситуацию.','Как она ощущается в теле?','О чём она сигналит, чего вам хочется?','Что маленькое поможет вам сейчас?'] },

  /* --- МЫШЛЕНИЕ (КПТ) --- */
  { cat:'мышление', icon:'🧩', title:'Проверка мысли (КПТ)', desc:'Разберите тревожную мысль на факты и домыслы.', time:'8 мин',
    when:'Когда захватила пугающая или самокритичная мысль.',
    steps:['Запишите тревожную мысль дословно.','Какие факты её подтверждают? А какие опровергают?','Что бы вы сказали другу с такой мыслью?','Сформулируйте более сбалансированную мысль.','Отметьте, как изменилось состояние.'] },
  { cat:'мышление', icon:'🔄', title:'Триггер → мысль → чувство', desc:'Проследите цепочку от события к реакции.', time:'7 мин',
    when:'Когда реакция кажется слишком сильной.',
    steps:['Что произошло? (триггер, только факты)','Какая мысль мелькнула в ответ?','Какое чувство она вызвала?','Как отозвалось тело и что вы сделали?','Где в этой цепочке можно было бы иначе?'] },
  { cat:'мышление', icon:'⚖️', title:'Взгляд с трёх сторон', desc:'Посмотрите на ситуацию глазами Ребёнка, Взрослого и Родителя.', time:'8 мин',
    when:'При внутреннем конфликте, сложном выборе.',
    steps:['Опишите ситуацию коротко.','Что говорит ваш «внутренний Ребёнок» (чувства, желания)?','Что говорит «Родитель» (правила, долг)?','Что скажет «Взрослый» (спокойно, по факту)?','Найдите решение из позиции Взрослого.'] },
  { cat:'мышление', icon:'🎯', title:'Маленький следующий шаг', desc:'Разбейте пугающую задачу на один посильный шаг.', time:'5 мин',
    when:'При прокрастинации, когда задача подавляет.',
    steps:['Назовите задачу, которая давит.','Разбейте её на самые мелкие части.','Выберите один шаг, который займёт 5 минут.','Сделайте только его.','Похвалите себя — начало положено.'] },
  { cat:'мышление', icon:'🌤️', title:'Что в моей зоне влияния', desc:'Отделите то, что можете контролировать, от остального.', time:'6 мин',
    when:'При ощущении беспомощности и перегруза.',
    steps:['Выпишите всё, что вас беспокоит.','Нарисуйте два круга: «могу влиять» / «не могу».','Разложите пункты по кругам.','В круге «могу» выберите одно действие.','«Не могу» — сознательно отпустите, это не ваша ответственность.'] },
];
const CATS = ['все', 'дыхание', 'рисование', 'звучание', 'тело', 'медитация', 'письмо', 'мышление'];
const CAT_COLOR = { 'дыхание':'#22D3EE','рисование':'#EC4899','звучание':'#8B5CF6','тело':'#10B981','медитация':'#FBBF24','письмо':'#6366F1','мышление':'#F97316' };

/* --- Гид по эмоциям: текст поддержки + рекомендованное направление практик --- */
const EMOTION_GUIDE = {
  'Тревога':      { emoji:'😟', rec:'дыхание',   text:'Тревога часто живёт в теле — сжатие в груди, поверхностное дыхание. Это нормально. Давайте мягко её проживём и вернём себе опору.' },
  'Гнев':         { emoji:'😠', rec:'звучание',  text:'Злость нередко прикрывает страх или усталость. У вас есть право её чувствовать. Направим эту энергию в безопасное русло.' },
  'Грусть':       { emoji:'😢', rec:'письмо',    text:'Грусть тоже важна и хочет быть прожитой. Не нужно её прогонять — давайте побудем с ней рядом и мягко поддержим себя.' },
  'Обида':        { emoji:'😔', rec:'письмо',    text:'Обида — это боль от несбывшихся ожиданий. Ей важно быть услышанной, чтобы она не копилась внутри. Поможем ей завершиться.' },
  'Усталость':    { emoji:'😮‍💨', rec:'тело',    text:'Усталость — сигнал, что ресурсы на исходе и телу нужна забота. Это не слабость. Давайте бережно восстановим силы.' },
  'Радость':      { emoji:'🙂', rec:'медитация', text:'Здорово, что вы это чувствуете! Радость важно замечать и «закреплять» — так она остаётся с нами дольше.' },
  'Спокойствие':  { emoji:'😌', rec:'медитация', text:'Спокойствие — прекрасный ресурсный фон. Отличный момент, чтобы укрепить это состояние и запомнить его телом.' },
  'Благодарность':{ emoji:'🙏', rec:'письмо',    text:'Благодарность расширяет и наполняет. Давайте усилим это тёплое чувство простой практикой.' },
};

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
  grid.innerHTML = list.map((p, i) => `
    <article class="card practice-card" style="--c:${CAT_COLOR[p.cat]}" data-idx="${PRACTICES.indexOf(p)}" tabindex="0" role="button">
      <div class="p-icon">${p.icon}</div>
      <h3>${p.title}</h3>
      <p>${p.desc}</p>
      <div class="practice-meta">
        <span class="practice-cat">#${p.cat}</span>
        <span>⏱ ${p.time}</span>
      </div>
      <span class="practice-open">Открыть практику →</span>
    </article>`).join('');
  grid.querySelectorAll('.practice-card').forEach(card => {
    const open = () => openPractice(PRACTICES[+card.dataset.idx]);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}
renderPractices();

/* --- Модальное окно с пошаговой инструкцией практики --- */
function openPractice(p) {
  if (!p) return;
  let modal = document.getElementById('practiceModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'practiceModal';
    modal.className = 'practice-modal';
    modal.innerHTML = '<div class="pm-backdrop"></div><div class="pm-box" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(modal);
    modal.querySelector('.pm-backdrop').addEventListener('click', closePractice);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePractice(); });
  }
  const box = modal.querySelector('.pm-box');
  box.style.setProperty('--c', CAT_COLOR[p.cat]);
  box.innerHTML = `
    <button class="pm-close" aria-label="Закрыть">✕</button>
    <div class="pm-head">
      <span class="pm-icon">${p.icon}</span>
      <div><h3>${p.title}</h3><span class="pm-cat">#${p.cat} · ⏱ ${p.time}</span></div>
    </div>
    <p class="pm-desc">${p.desc}</p>
    ${p.when ? `<p class="pm-when"><b>Когда применять:</b> ${p.when}</p>` : ''}
    <h4 class="pm-steps-title">Как выполнять</h4>
    <ol class="pm-steps">${p.steps.map(s => `<li>${s}</li>`).join('')}</ol>
    <p class="pm-foot">Прожить эмоцию — значит дать ей завершиться. Будьте к себе бережны. 💜</p>
    <a href="#organizer" class="btn btn-primary pm-diary" data-nav>Записать состояние в дневник</a>`;
  box.querySelector('.pm-close').addEventListener('click', closePractice);
  box.querySelector('.pm-diary').addEventListener('click', closePractice);
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closePractice() {
  const modal = document.getElementById('practiceModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}
/* Открыть практику по категории (для рекомендаций бота) */
function openFirstPracticeOf(cat) {
  const p = PRACTICES.find(x => x.cat === cat);
  if (p) openPractice(p);
}
function scrollToPractices(cat) {
  document.querySelector('#practices').scrollIntoView({ behavior:'smooth' });
  if (cat) filterPractices(cat);
}

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

/* ================= ЗАГЛУШКА ОПЛАТЫ (до подключения приёма платежей) ================= */
(function payStub() {
  let toast;
  function showToast(msg) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'pay-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 3500);
  }
  document.querySelectorAll('[data-pay-stub]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      showToast('💜 Приём оплаты скоро будет доступен. Оставьте заявку в ассистенте — мы свяжемся с вами.');
    });
  });
})();

/* ================= ЛИЧНЫЙ КАБИНЕТ (вход / регистрация) ================= */
(function account() {
  const USERS_KEY = 'ml_users';
  const SESSION_KEY = 'ml_session';

  const loadUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const saveUsers = u => localStorage.setItem(USERS_KEY, JSON.stringify(u));
  const getSession = () => localStorage.getItem(SESSION_KEY) || '';
  const setSession = login => login ? localStorage.setItem(SESSION_KEY, login) : localStorage.removeItem(SESSION_KEY);
  const findUser = login => loadUsers().find(u => u.login.toLowerCase() === String(login).trim().toLowerCase());
  const currentUser = () => findUser(getSession());

  // Демо-аккаунт: заводится один раз, чтобы можно было сразу войти и посмотреть кабинет.
  (function seedDemo() {
    const users = loadUsers();
    if (!users.some(u => u.login === 'demo')) {
      users.push({ name: 'Гость', login: 'demo', pass: 'demo123', created: Date.now() });
      saveUsers(users);
    }
  })();

  const authBtn = document.getElementById('authBtn');
  let modal = null;

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'account-modal';
    modal.innerHTML = '<div class="am-backdrop"></div><div class="am-box" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(modal);
    modal.querySelector('.am-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
    return modal;
  }
  function openModal(html) {
    ensureModal();
    modal.querySelector('.am-box').innerHTML = html;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    const f = modal.querySelector('input');
    if (f) setTimeout(() => f.focus(), 50);
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ---- Экран входа ---- */
  function showLogin(msg) {
    openModal(`
      <button class="am-close" aria-label="Закрыть">×</button>
      <h3 class="am-title">Вход в личный кабинет</h3>
      <p class="am-sub">Введите логин и пароль, которые вы указали при регистрации.</p>
      ${msg ? `<div class="am-error">${msg}</div>` : ''}
      <form class="am-form" id="loginForm">
        <label>Логин или e-mail<input type="text" name="login" autocomplete="username" required></label>
        <label>Пароль<input type="password" name="pass" autocomplete="current-password" required></label>
        <button type="submit" class="btn btn-primary btn-lg am-submit">Войти</button>
      </form>
      <div class="am-demo">Demo-доступ для быстрого просмотра: логин <b>demo</b> · пароль <b>demo123</b></div>
      <div class="am-switch">Нет аккаунта? <button type="button" id="toRegister">Зарегистрироваться</button></div>
    `);
    modal.querySelector('.am-close').onclick = closeModal;
    modal.querySelector('#toRegister').onclick = () => showRegister();
    modal.querySelector('#loginForm').onsubmit = e => {
      e.preventDefault();
      const login = e.target.login.value.trim();
      const pass = e.target.pass.value;
      const u = findUser(login);
      if (!u || u.pass !== pass) { showLogin('Неверный логин или пароль. Попробуйте ещё раз.'); return; }
      setSession(u.login);
      renderAuthState();
      showCabinet();
    };
  }

  /* ---- Экран регистрации ---- */
  function showRegister(msg) {
    openModal(`
      <button class="am-close" aria-label="Закрыть">×</button>
      <h3 class="am-title">Регистрация</h3>
      <p class="am-sub">Придумайте логин и пароль — они понадобятся для входа в кабинет.</p>
      ${msg ? `<div class="am-error">${msg}</div>` : ''}
      <form class="am-form" id="regForm">
        <label>Как к вам обращаться<input type="text" name="name" autocomplete="name" required></label>
        <label>Логин или e-mail<input type="text" name="login" autocomplete="username" required></label>
        <label>Пароль (мин. 4 символа)<input type="password" name="pass" autocomplete="new-password" minlength="4" required></label>
        <button type="submit" class="btn btn-primary btn-lg am-submit">Создать кабинет</button>
      </form>
      <div class="am-switch">Уже есть аккаунт? <button type="button" id="toLogin">Войти</button></div>
    `);
    modal.querySelector('.am-close').onclick = closeModal;
    modal.querySelector('#toLogin').onclick = () => showLogin();
    modal.querySelector('#regForm').onsubmit = e => {
      e.preventDefault();
      const name = e.target.name.value.trim();
      const login = e.target.login.value.trim();
      const pass = e.target.pass.value;
      if (findUser(login)) { showRegister('Такой логин уже занят. Выберите другой или войдите.'); return; }
      const users = loadUsers();
      users.push({ name, login, pass, created: Date.now() });
      saveUsers(users);
      setSession(login);
      renderAuthState();
      showCabinet();
    };
  }

  /* ---- Кабинет ---- */
  function showCabinet() {
    const u = currentUser();
    if (!u) { showLogin(); return; }
    const entries = (typeof loadEntries === 'function') ? loadEntries() : [];
    const streak = (typeof computeStreak === 'function') ? computeStreak(entries) : 0;
    const total = entries.length;
    const level = Math.min(5, 1 + Math.floor(total / 3));
    const last = entries.length ? new Date(entries[entries.length - 1].date).toLocaleDateString('ru-RU') : '—';
    openModal(`
      <button class="am-close" aria-label="Закрыть">×</button>
      <div class="am-hello">
        <div class="am-avatar">${(u.name || u.login).slice(0,1).toUpperCase()}</div>
        <div>
          <h3 class="am-title">Здравствуйте, ${u.name || u.login}!</h3>
          <p class="am-sub">Ваш личный кабинет Матрёшки</p>
        </div>
      </div>
      <div class="am-stats">
        <div class="am-stat"><b>${streak}</b><span>дней подряд</span></div>
        <div class="am-stat"><b>${total}</b><span>записей в дневнике</span></div>
        <div class="am-stat"><b>${level}/5</b><span>слой матрёшки</span></div>
      </div>
      <p class="am-last">Последняя отметка: <b>${last}</b></p>
      <div class="am-actions">
        <button class="btn btn-primary" data-go="#organizer">📔 Дневник эмоций</button>
        <button class="btn btn-outline" data-go="#map">🪆 Карта личности</button>
        <button class="btn btn-outline" data-go="#practices">🧘 Практики</button>
        <button class="btn btn-outline" data-go="#bot">💬 Ассистент</button>
      </div>
      <button class="am-logout" id="logoutBtn">Выйти из кабинета</button>
    `);
    modal.querySelector('.am-close').onclick = closeModal;
    modal.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
      closeModal();
      const t = document.querySelector(b.dataset.go);
      if (t) t.scrollIntoView({ behavior: 'smooth' });
    });
    modal.querySelector('#logoutBtn').onclick = () => {
      setSession('');
      renderAuthState();
      closeModal();
    };
  }

  /* ---- Состояние кнопки в шапке ---- */
  function renderAuthState() {
    const u = currentUser();
    if (u) {
      authBtn.textContent = '🪆 ' + (u.name || u.login);
      authBtn.classList.add('logged');
    } else {
      authBtn.textContent = 'Войти';
      authBtn.classList.remove('logged');
    }
  }

  authBtn.addEventListener('click', () => {
    if (currentUser()) showCabinet();
    else showLogin();
  });

  renderAuthState();
})();
