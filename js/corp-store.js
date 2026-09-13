/* ================= ДАННЫЕ КАБИНЕТА КОМПАНИИ =================
   Слой хранения и помощники по дереву отделов. Только данные, без DOM.
   Компании лежат в localStorage (форма 1:1 ляжет в будущий PostgreSQL).

   ГЛАВНЫЙ ПРИНЦИП ПРИВАТНОСТИ (152-ФЗ + обещание бренда об анонимности):
   HR НИКОГДА не видит эмоции конкретного человека — только сводку по
   подразделению и только если в нём не меньше THRESHOLD активных участников
   (k-анонимность). Экрана с эмоциями конкретного сотрудника нет в принципе. */
import { ML_KEYS } from './core.js';
import { safeParse } from './util.js';

export const THRESHOLD = 5; // минимум участников в узле, чтобы показать статистику

export const loadCompanies = () => safeParse(localStorage.getItem(ML_KEYS.companies), []);
export const saveCompanies = c => localStorage.setItem(ML_KEYS.companies, JSON.stringify(c));
export const sessionLogin = () => localStorage.getItem(ML_KEYS.session) || '';
export const rid = p => p + Math.random().toString(36).slice(2, 9);

/* Синтетическое «самочувствие» нового участника — заполнитель до настоящих
   данных чек-инов. В аналитике блок самочувствия честно помечен как пример. */
export function synthWb() {
  const stress = 2 + Math.floor(Math.random() * 4);
  const energy = 2 + Math.floor(Math.random() * 4);
  return { stress, energy, prevStress: Math.min(5, stress + 1), checkins: 3 + Math.floor(Math.random() * 20), emotions: ['спокойствие'] };
}

/* ---------- Дерево отделов ---------- */
export const childrenOf = (c, parentId) => c.units.filter(u => u.parentId === parentId);
export const unitById = (c, id) => c.units.find(u => u.id === id);

export function descendantsIncluding(c, unitId) {
  const acc = [unitId];
  const walk = pid => childrenOf(c, pid).forEach(u => { acc.push(u.id); walk(u.id); });
  walk(unitId);
  return acc;
}

export const membersOf = (c, unitId) => {
  const ids = new Set(descendantsIncluding(c, unitId));
  return c.roster.filter(r => r.joined && ids.has(r.unitId));
};

export const companyOwnedBy = login => loadCompanies().find(c => c.ownerLogin === login);

/* Изменить компанию и сохранить. Перерисовку делает вызывающий. */
export function mutate(cId, fn) {
  const companies = loadCompanies();
  const c = companies.find(x => x.id === cId);
  if (!c) return;
  fn(c);
  saveCompanies(companies);
}
