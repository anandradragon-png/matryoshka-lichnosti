/**
 * sync.js + api.js — синхронизация с сервером.
 *
 * Главное, что здесь проверяется: приложение не должно ломаться ни без
 * сервера, ни при обрыве связи. Записи человека не могут пропадать молча,
 * поэтому недоехавшее обязано оказаться в очереди и уйти при следующем входе.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { freshEnv } from './helpers/boot.js';

const URL = 'https://functions.example/matryoshka';

/** Ответы сервера по действиям. Всё остальное — ошибка теста. */
function mockFetch(map) {
  return vi.fn(async (url, opts) => {
    const body = JSON.parse(opts.body);
    const answer = map[body.op];
    if (typeof answer === 'function') return answer(body, opts);
    if (!answer) throw new Error('неожидаемое действие: ' + body.op);
    return { ok: true, status: 200, json: async () => answer };
  });
}

async function loadSync(apiUrl) {
  await freshEnv();
  window.ML_API_URL = apiUrl;
  const core = await import('../js/core.js');
  const sync = await import('../js/sync.js');
  const api = await import('../js/api.js');
  return { ...sync, ...api, ML_KEYS: core.ML_KEYS };
}

afterEach(() => { delete window.ML_API_URL; vi.unstubAllGlobals(); });

describe('выключатель сервера', () => {
  it('без адреса сервера ничего не отправляется', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { pushEntry, apiOn } = await loadSync('');
    expect(apiOn()).toBe(false);
    await pushEntry({ id: 'en_1', date: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('с адресом, но без вошедшего человека — тоже не отправляется', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { pushEntry } = await loadSync(URL);
    await pushEntry({ id: 'en_1', date: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('досылка записей', () => {
  beforeEach(() => {});

  it('запись дневника уходит на сервер', async () => {
    const fetchMock = mockFetch({ 'diary.save': { entry: { id: 'en_1' } } });
    vi.stubGlobal('fetch', fetchMock);
    const { pushEntry, ML_KEYS } = await loadSync(URL);
    localStorage.setItem(ML_KEYS.session, 'sveta');
    await pushEntry({ id: 'en_1', date: 1, note: 'тест' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.op).toBe('diary.save');
    expect(sent.entry.note).toBe('тест');
  });

  it('токен уходит своим заголовком, а не Authorization', async () => {
    const fetchMock = mockFetch({ 'journal.save': { event: {} } });
    vi.stubGlobal('fetch', fetchMock);
    const { pushEvent, setToken, ML_KEYS } = await loadSync(URL);
    localStorage.setItem(ML_KEYS.session, 'sveta');
    setToken('tok123');
    await pushEvent({ id: 'ev_1', type: 'practice', date: 1, data: {} });
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['X-Auth-Token']).toBe('tok123');
    expect(headers.Authorization).toBeUndefined();
  });
});

describe('обрыв связи', () => {
  it('недоехавшая запись попадает в очередь', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network'); }));
    const { pushEntry, ML_KEYS } = await loadSync(URL);
    localStorage.setItem(ML_KEYS.session, 'sveta');
    await pushEntry({ id: 'en_1', date: 1 });
    const queue = JSON.parse(localStorage.getItem(ML_KEYS.pending));
    expect(queue).toHaveLength(1);
    expect(queue[0].op).toBe('diary.save');
    expect(queue[0].login).toBe('sveta');
  });

  it('очередь уходит при следующей попытке и очищается', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network'); }));
    const { pushEntry, flush, ML_KEYS } = await loadSync(URL);
    localStorage.setItem(ML_KEYS.session, 'sveta');
    await pushEntry({ id: 'en_1', date: 1 });
    await pushEntry({ id: 'en_2', date: 2 });
    expect(JSON.parse(localStorage.getItem(ML_KEYS.pending))).toHaveLength(2);

    const fetchMock = mockFetch({ 'diary.save': { entry: {} } });
    vi.stubGlobal('fetch', fetchMock);
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(localStorage.getItem(ML_KEYS.pending))).toEqual([]);
  });

  it('чужая очередь не отправляется под нашим токеном', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network'); }));
    const { pushEntry, flush, ML_KEYS } = await loadSync(URL);
    localStorage.setItem(ML_KEYS.session, 'anna');
    await pushEntry({ id: 'en_anna', date: 1 });
    localStorage.setItem(ML_KEYS.session, 'sveta');

    const fetchMock = mockFetch({ 'diary.save': { entry: {} } });
    vi.stubGlobal('fetch', fetchMock);
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(ML_KEYS.pending))).toHaveLength(1);
  });

  it('истёкший токен не копится в очереди', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ error: 'Нужно войти' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const { pushEntry, setToken, getToken, ML_KEYS } = await loadSync(URL);
    localStorage.setItem(ML_KEYS.session, 'sveta');
    setToken('старый');
    await pushEntry({ id: 'en_1', date: 1 });
    expect(getToken()).toBe('');
    expect(localStorage.getItem(ML_KEYS.pending)).toBe(null);
  });
});

describe('вход в кабинет', () => {
  it('первый вход отправляет накопленное в браузере, потом забирает с сервера', async () => {
    const calls = [];
    const fetchMock = vi.fn(async (url, opts) => {
      const body = JSON.parse(opts.body);
      calls.push(body.op);
      const answers = {
        'diary.import': { imported: 1 },
        'journal.import': { imported: 1 },
        'diary.list': { entries: [{ id: 'srv_1', date: 5, note: 'с сервера' }] },
        'journal.list': { events: [{ id: 'srv_e', type: 'dar', date: 5, data: {} }] },
      };
      return { ok: true, status: 200, json: async () => answers[body.op] };
    });
    vi.stubGlobal('fetch', fetchMock);
    const { afterLogin, ML_KEYS } = await loadSync(URL);
    localStorage.setItem(ML_KEYS.session, 'sveta');
    localStorage.setItem(ML_KEYS.diary + '__sveta', JSON.stringify([{ date: 1, note: 'местная' }]));
    localStorage.setItem(ML_KEYS.journal + '__sveta', JSON.stringify([{ id: 'ev_1', type: 'chat', date: 1, data: {} }]));

    await afterLogin('sveta');

    expect(calls).toEqual(['diary.import', 'journal.import', 'diary.list', 'journal.list']);
    // Серверная версия перезаписала местную: две правды хуже одной.
    const diary = JSON.parse(localStorage.getItem(ML_KEYS.diary + '__sveta'));
    expect(diary).toHaveLength(1);
    expect(diary[0].note).toBe('с сервера');
    expect(JSON.parse(localStorage.getItem(ML_KEYS.synced)).sveta).toBe(true);
  });

  it('старым записям без номера номер выдаётся до отправки', async () => {
    const sent = [];
    const fetchMock = vi.fn(async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.op === 'diary.import') sent.push(body.entries);
      return { ok: true, status: 200, json: async () => ({ entries: [], events: [] }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    const { afterLogin, ML_KEYS } = await loadSync(URL);
    localStorage.setItem(ML_KEYS.session, 'sveta');
    localStorage.setItem(ML_KEYS.diary + '__sveta', JSON.stringify([{ date: 111, note: 'старая' }]));

    await afterLogin('sveta');
    expect(sent[0][0].id).toBeTruthy();
  });

  it('второй вход уже ничего не отправляет, только забирает', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      calls.push(JSON.parse(opts.body).op);
      return { ok: true, status: 200, json: async () => ({ entries: [], events: [] }) };
    }));
    const { afterLogin, ML_KEYS } = await loadSync(URL);
    localStorage.setItem(ML_KEYS.session, 'sveta');
    localStorage.setItem(ML_KEYS.synced, JSON.stringify({ sveta: true }));
    await afterLogin('sveta');
    expect(calls).toEqual(['diary.list', 'journal.list']);
  });

  it('нет связи при входе — приложение работает из браузера, данные целы', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network'); }));
    const { afterLogin, ML_KEYS } = await loadSync(URL);
    localStorage.setItem(ML_KEYS.session, 'sveta');
    const mine = JSON.stringify([{ id: 'en_1', date: 1, note: 'местная' }]);
    localStorage.setItem(ML_KEYS.diary + '__sveta', mine);
    await afterLogin('sveta');
    expect(JSON.parse(localStorage.getItem(ML_KEYS.diary + '__sveta'))[0].note).toBe('местная');
    expect(localStorage.getItem(ML_KEYS.synced)).toBe(null);
  });

  it('данные на сервере уже есть — они главнее местных', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.op === 'diary.import') return { ok: false, status: 409, json: async () => ({ error: 'уже есть' }) };
      return { ok: true, status: 200, json: async () => ({ entries: [{ id: 'srv', date: 9 }], events: [] }) };
    }));
    const { afterLogin, ML_KEYS } = await loadSync(URL);
    localStorage.setItem(ML_KEYS.session, 'sveta');
    localStorage.setItem(ML_KEYS.diary + '__sveta', JSON.stringify([{ id: 'en_1', date: 1 }]));
    await afterLogin('sveta');
    const diary = JSON.parse(localStorage.getItem(ML_KEYS.diary + '__sveta'));
    expect(diary[0].id).toBe('srv');
    expect(JSON.parse(localStorage.getItem(ML_KEYS.synced)).sveta).toBe(true);
  });
});
