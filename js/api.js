/* ================= СВЯЗЬ С СЕРВЕРОМ =================
   Тонкий транспорт: один адрес, действие в поле op, токен входа в заголовке.
   Логики здесь нет — она в sync.js и в модулях разделов.

   ВЫКЛЮЧАТЕЛЬ: адрес берётся из window.ML_API_URL (задаётся в index.html).
   Пусто — приложение работает как раньше, целиком в браузере. Это сделано
   намеренно: включение сервера означает, что дневник эмоций начинает
   обрабатываться вне устройства человека, а это специальная категория
   персональных данных (ст. 10 152-ФЗ) и отдельный набор документов.

   Заголовок Authorization НЕ используется: его перехватывает сам Yandex Cloud
   и отвечает 403, не доходя до нашего кода. Поэтому свой X-Auth-Token. */
import { ML_KEYS } from './core.js';

const url = () => (typeof window !== 'undefined' && window.ML_API_URL) || '';

export const apiOn = () => !!url();

export const getToken = () => localStorage.getItem(ML_KEYS.token) || '';
export const setToken = t => {
  if (t) localStorage.setItem(ML_KEYS.token, t);
  else localStorage.removeItem(ML_KEYS.token);
};

/* Понятная ошибка от сервера: текст в .message показываем человеку как есть,
   .status нужен, чтобы отличить «нужно войти заново» (401) от прочего. */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* Один запрос. Сеть могла отвалиться — тогда ApiError со статусом 0:
   вызывающий сам решает, работать дальше из localStorage или показать ошибку. */
export async function apiCall(op, payload = {}) {
  if (!apiOn()) throw new ApiError(0, 'Сервер не подключён');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  const token = getToken();
  try {
    const res = await fetch(url(), {
      method: 'POST',
      headers: token
        ? { 'Content-Type': 'application/json', 'X-Auth-Token': token }
        : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, op }),
      signal: ctrl.signal,
    });
    let data = {};
    try { data = await res.json(); } catch { data = {}; }
    if (!res.ok) throw new ApiError(res.status, data.error || 'Сервер вернул ошибку');
    return data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, 'Нет связи с сервером');
  } finally {
    clearTimeout(timer);
  }
}
