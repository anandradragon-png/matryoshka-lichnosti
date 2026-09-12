/* ================= РЕЕСТР ЛЮДЕЙ И СЕССИЯ =================
   Кто зарегистрирован в этом браузере и кто сейчас вошёл. Экранов здесь нет —
   только хранилище, его читают кабинет, админка и разделы с личными данными.

   При подключённом сервере (window.ML_API_URL) пароль сюда не попадает: он
   проверяется на сервере, а здесь остаётся только профиль с пометкой server. */
import { ML_KEYS } from './core.js';
import { safeParse } from './util.js';
import { announceSessionChange } from './scope.js';

export const loadUsers = () => safeParse(localStorage.getItem(ML_KEYS.users), []);
export const saveUsers = u => localStorage.setItem(ML_KEYS.users, JSON.stringify(u));

export const getSession = () => localStorage.getItem(ML_KEYS.session) || '';

/* Сменился вошедший — сменились и данные на экране: дневник со статистикой
   принадлежат конкретному человеку (js/scope.js), их надо перерисовать. */
export const setSession = login => {
  if (login) localStorage.setItem(ML_KEYS.session, login);
  else localStorage.removeItem(ML_KEYS.session);
  announceSessionChange();
};

export const findUser = login =>
  loadUsers().find(u => u.login.toLowerCase() === String(login).trim().toLowerCase());

export const currentUser = () => findUser(getSession());

export const isAdmin = u => !!u && u.role === 'admin';

/* Стартовые аккаунты: demo (гость) + два администратора-разработчика.

   ВНИМАНИЕ: это временные учётки прототипа. Пока сервер не подключён, пароль
   проверяется здесь же, в браузере, и настоящей защитой не является. Пароли
   уникальные, нигде больше не используются — чтобы утечка прототипа ничего
   не открыла. При включённом сервере эти записи остаются как заготовка: войти
   по ним можно только если такие же люди созданы на сервере. */
(function seedAccounts() {
  const users = loadUsers();
  let changed = false;
  const ensure = u => {
    const ex = users.find(x => x.login === u.login);
    if (!ex) { users.push(u); changed = true; return; }
    if (u.role && ex.role !== u.role) { ex.role = u.role; changed = true; }
    // Пароль сид-аккаунтов авторитетно берётся из кода: если он менялся
    // (ротация), синхронизируем существующую запись в localStorage.
    if (u.pass && ex.pass !== u.pass) { ex.pass = u.pass; changed = true; }
  };
  ensure({ name: 'Гость', login: 'demo', pass: 'demo123', created: Date.now() });
  ensure({ name: 'Светлана', login: 'sveta', pass: 'Mtr$Sv-2026-q7Xk', role: 'admin', created: Date.now() });
  ensure({ name: 'Альбина', login: 'albina', pass: 'Mtr$Al-2026-w9Rb', role: 'admin', created: Date.now() });
  if (changed) saveUsers(users);
})();
