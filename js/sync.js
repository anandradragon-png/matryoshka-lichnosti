/* ================= СИНХРОНИЗАЦИЯ С СЕРВЕРОМ =================
   Как это устроено: браузер остаётся рабочей копией, сервер — тем, что не
   пропадёт. Приложение читает и пишет localStorage как раньше, а этот модуль
   после записи досылает изменение на сервер. Поэтому разделы не переписаны
   под ожидание сети: без связи всё работает, при связи — ещё и сохраняется.

   Порядок при входе:
   1) первый вход этого человека — отправляем накопленное в браузере на сервер;
   2) дальше — забираем с сервера и кладём в браузер: сервер главнее, иначе на
      втором устройстве человек увидит пустой дневник и решит, что данные ушли.

   Чего здесь намеренно нет: слияния правок с двух устройств. Если человек
   вёл дневник одновременно с телефона и компьютера, победит последняя запись.
   Для отметок настроения это приемлемо, для чего-то серьёзнее — нет.

   Всё молчит, если window.ML_API_URL пустой. */
import { ML_KEYS } from './core.js';
import { safeParse } from './util.js';
import { scopedKey, currentLogin, announceSessionChange } from './scope.js';
import { apiOn, apiCall, setToken } from './api.js';

const read = base => safeParse(localStorage.getItem(scopedKey(base)), []);
const write = (base, list) => localStorage.setItem(scopedKey(base), JSON.stringify(list));

const flags = () => safeParse(localStorage.getItem(ML_KEYS.synced), {});
const isSynced = login => !!flags()[login];
const markSynced = login => localStorage.setItem(ML_KEYS.synced, JSON.stringify({ ...flags(), [login]: true }));

/* ---- Очередь неотправленного ----
   Связь рвётся чаще, чем кажется: метро, лифт, слабый вайфай. Без очереди
   запись осталась бы только в браузере и молча не доехала бы до сервера. */
const queue = () => safeParse(localStorage.getItem(ML_KEYS.pending), []);
const setQueue = list => localStorage.setItem(ML_KEYS.pending, JSON.stringify(list.slice(-200)));

function enqueue(op, payload) {
  setQueue([...queue(), { op, payload, login: currentLogin() }]);
}

/* Отправить одно изменение. Не получилось — отложить и жить дальше. */
async function send(op, payload) {
  if (!apiOn() || !currentLogin()) return;
  try {
    await apiCall(op, payload);
  } catch (e) {
    if (e.status === 401) { setToken(''); return; }   // токен истёк — очередь бессмысленна
    enqueue(op, payload);
  }
}

/* Разобрать очередь. Зовётся при входе и при возврате связи. */
export async function flush() {
  const login = currentLogin();
  if (!apiOn() || !login) return;
  const mine = queue().filter(t => t.login === login);
  const others = queue().filter(t => t.login !== login);
  const failed = [];
  for (const task of mine) {
    try {
      await apiCall(task.op, task.payload);
    } catch (e) {
      if (e.status !== 401) failed.push(task);
    }
  }
  setQueue([...others, ...failed]);
}

/* ---- Досылка изменений ---- */
export const pushEntry = entry => send('diary.save', { entry });
export const pushEvent = event => send('journal.save', { event });

/* ---- Забрать всё с сервера в браузер ---- */
export async function pull() {
  const [diary, journal] = await Promise.all([
    apiCall('diary.list'),
    apiCall('journal.list'),
  ]);
  write(ML_KEYS.diary, diary.entries || []);
  write(ML_KEYS.journal, journal.events || []);
  announceSessionChange();
}

/* ---- Первая отправка накопленного в браузере ---- */
async function pushEverything() {
  // Старым записям дневника номера не выдавались — выдаём и запоминаем в
  // браузере, иначе повторная отправка создаст на сервере вторую копию.
  const entries = read(ML_KEYS.diary).map((e, i) =>
    e && e.id ? e : { ...e, id: 'en_' + (e && e.date ? e.date : Date.now()) + '_' + i });
  write(ML_KEYS.diary, entries);
  const events = read(ML_KEYS.journal);
  if (entries.length) await apiCall('diary.import', { entries });
  if (events.length) await apiCall('journal.import', { events });
}

/* Главная точка: вызывается сразу после успешного входа или регистрации. */
export async function afterLogin(login) {
  if (!apiOn() || !login) return;
  await flush();
  try {
    if (!isSynced(login)) {
      await pushEverything();
      markSynced(login);
    }
    await pull();
  } catch (e) {
    if (e.status === 409) {           // на сервере уже есть данные — они главнее
      markSynced(login);
      await pull();
      return;
    }
    // Связи нет — работаем из браузера. Очередь и отметка о переносе целы,
    // поэтому при следующем входе всё доедет.
  }
}

if (apiOn() && typeof window !== 'undefined') {
  window.addEventListener('online', () => { flush(); });
}
