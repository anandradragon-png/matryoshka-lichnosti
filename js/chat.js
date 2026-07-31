import { escapeHtml } from './util.js';
import {
  EMOTION_GUIDE,
  PRACTICES,
  openPractice,
  scrollToPractices,
  filterPractices,
} from './practices.js';

/* ================= ЧАТ-БОТ ================= */
/* URL серверной функции-прослойки YandexGPT (Yandex Cloud Function).
   Пусто → работает демо-сценарий. После деплоя сюда вписывается адрес
   вида https://functions.yandexcloud.net/<function-id> и бот отвечает
   вживую через YandexGPT. Ключ к ИИ хранится ТОЛЬКО на сервере. */
const BOT_API_URL = 'https://functions.yandexcloud.net/d4ea6e787931k2cbblqh';
const chat = document.getElementById('chat');
const quickReplies = document.getElementById('quickReplies');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

/* История диалога для контекста (роль + текст) */
const chatHistory = [];

/* Запрос к живому ИИ через серверную прослойку */
async function callBotAPI(text) {
  // Таймаут запроса: серверная функция живёт до 90 с (RAG + поллинг). Если связь
  // зависла — прерываем, чтобы индикатор «печатает…» не висел вечно, а показали
  // мягкую ошибку. AbortController поддерживается всеми целевыми браузерами.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  try {
    const res = await fetch(BOT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: chatHistory.slice(-8) }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error('bot api ' + res.status);
    const data = await res.json();
    if (!data.reply) throw new Error(data.error || 'no reply');
    return data.reply;
  } finally {
    clearTimeout(timer);
  }
}

/* Ответ живого ИИ с индикатором «печатает…» */
async function botSayLive(text) {
  const t = typing();
  try {
    const reply = await callBotAPI(text);
    t.remove();
    addMsg(escapeHtml(reply).replace(/\n/g, '<br>'));
    chatHistory.push({ role: 'user', text });
    chatHistory.push({ role: 'assistant', text: reply });
  } catch (e) {
    t.remove();
    addMsg('Извините, не получилось получить ответ прямо сейчас. Попробуйте ещё раз чуть позже. 💜');
  }
}

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
      { label: 'Записать в дневник', action: () => { const t = document.getElementById('organizer'); if (t) t.scrollIntoView({ behavior: 'smooth' }); flow.after(); } },
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
    await botSay('Отличный выбор! Открываю практики направления «' + cat + '». 👇');
    const t = document.getElementById('practices');
    if (t) t.scrollIntoView({ behavior: 'smooth' });
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
  // Экранируем ввод пользователя: addMsg вставляет через innerHTML, иначе XSS.
  addMsg(escapeHtml(v), 'user');
  chatInput.value = '';
  const low = v.toLowerCase();
  // Безопасность: признаки кризиса — мягко направляем к живой помощи.
  // Словарь намеренно широкий: пропустить кризисную фразу опаснее, чем лишний раз
  // показать телефон доверия. Формулировки — частые рус. варианты суицидальных мыслей и самоповреждения.
  if (/(суицид|самоубийств|убить себя|покончить|наложить на себя руки|свести счёт|счёты с жизнью|повес(иться|люсь)|не хочу (больше )?жить|жить не хочется|не хочется жить|не хочу просыпаться|хочу(?: больше)? (умереть|сдохнуть|исчезнуть)|хочется умереть|лучше( бы)?( я)? (умер|не жил)|нет смысла жить|не вижу смысла жить|уйти из жизни|причинить себе|сделать себе больно|резать себя|порезать себя|самоповреж)/.test(low)) {
    botSay('Мне важно то, что вы сейчас пишете, и я отношусь к этому серьёзно. 💜 Пожалуйста, не оставайтесь с этим наедине — прямо сейчас можно позвонить на бесплатный круглосуточный телефон доверия <b>8-800-2000-122</b> или в экстренную службу <b>112</b>. Здесь вам ответят и поддержат.').then(() =>
      setQuick([{ label: 'Спасибо, мне нужна поддержка', action: () => flow.feel('Грусть') }]));
    return;
  }
  // Живой ИИ через YandexGPT, если сервер подключён; иначе — демо-сценарий ниже
  if (BOT_API_URL) { setQuick([]); return void botSayLive(v); }
  // Приветствие
  if (/^(привет|здравств|добрый|хай|доброе утро|хеллоу|hello|hi)/.test(low)) {
    botSay('Здравствуйте! Рада, что вы здесь. 🪆 Как вы себя чувствуете прямо сейчас?').then(() =>
      setQuick([
        { label: '😟 Тревожно', action: () => flow.feel('Тревога') },
        { label: '😢 Грустно', action: () => flow.feel('Грусть') },
        { label: '😮‍💨 Устал(а)', action: () => flow.feel('Усталость') },
        { label: '🙂 Хорошо', action: () => flow.feel('Радость') },
      ]));
    return;
  }
  // Вопрос «кто ты / что умеешь»
  if (/(кто ты|ты бот|ты человек|ты живой|что ты умеешь|ты ии|искусственн)/.test(low)) {
    botSay('Я — ИИ-ассистент «Матрёшки»: помогаю замечать, называть и мягко проживать эмоции, подбираю простые техники. Я не заменяю живого специалиста — в приложении есть психологи-эмотологи. О чём хотите поговорить?').then(() =>
      setQuick([{ label: 'О моём состоянии', action: flow.dialog }, { label: 'Что такое эмотология?', action: flow.about }]));
    return;
  }
  // Благодарность пользователя
  if (/^(спасибо|благодарю|спс|thanks)/.test(low)) {
    botSay('Пожалуйста. 💜 Я рядом, если захотите продолжить.').then(() => flow.after());
    return;
  }
  if (/(трев|паник|страх|боюсь|волну|беспоко|стресс|напряж|напряг|нерв|мандраж|не по себе)/.test(low)) return flow.feel('Тревога');
  if (/(зл|гнев|раздраж|беси|ярост|ненавиж|бомбит)/.test(low)) return flow.feel('Гнев');
  if (/(груст|тоск|плак|печал|уныл|одинок|пусто|стыд|вина|виноват|никчём|апати|подавлен|депресс|горе|на душе (плохо|тяжело))/.test(low)) return flow.feel('Грусть');
  if (/(обид|предал|несправедлив|задел)/.test(low)) return flow.feel('Обида');
  if (/(устал|вымот|нет сил|без сил|истощ|выгор|разбит|обессил|нет энергии|нет ресурс)/.test(low)) return flow.feel('Усталость');
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
