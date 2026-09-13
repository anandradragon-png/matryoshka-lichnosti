/* ================= ДЕМО-КОМПАНИЯ =================
   Посев один раз: чтобы кабинет HR был сразу «живым» и кликабельным — дерево
   отделов, сотрудники с датами рождения (по ним считаются настоящие Дары)
   и синтетическим самочувствием (в аналитике помечено как пример).
   Владелец — гостевой аккаунт demo. */
import { loadCompanies, saveCompanies, rid, synthWb, THRESHOLD } from './corp-store.js';

const NAMES = ['Анна', 'Игорь', 'Мария', 'Пётр', 'Ольга', 'Дмитрий', 'Елена', 'Сергей',
  'Наталья', 'Алексей', 'Ирина', 'Владимир', 'Юлия', 'Роман', 'Ксения'];
/* Даты фиксированные, не случайные: демо у всех выглядит одинаково,
   а набор Даров подобран разнообразным. */
const BIRTHS = ['14.03.1988', '02.11.1992', '25.07.1985', '09.01.1990', '17.09.1979',
  '30.05.1995', '11.12.1983', '05.04.1991', '22.08.1987', '19.02.1993',
  '07.06.1980', '28.10.1989', '15.01.1996', '03.07.1984', '21.11.1994'];

export function seedDemoCompany() {
  const companies = loadCompanies();
  const existing = companies.find(c => c.demo);
  if (existing) {
    // Демо посеяно раньше, чем появились Дары: дописываем даты рождения.
    if (existing.roster.some(r => !r.birth)) {
      existing.roster.forEach((r, i) => { if (!r.birth) r.birth = BIRTHS[i % BIRTHS.length]; });
      saveCompanies(companies);
    }
    return;
  }
  let ni = 0;
  const emp = (unitId, position) => {
    const wb = synthWb();
    wb.stress = 2 + Math.floor(Math.random() * 4);
    wb.energy = 2 + Math.floor(Math.random() * 4);
    wb.prevStress = Math.min(5, wb.stress + Math.floor(Math.random() * 2));
    const emoPool = ['спокойствие', 'радость', 'тревога', 'усталость', 'вдохновение', 'раздражение', 'грусть'];
    wb.emotions = [emoPool[Math.floor(Math.random() * emoPool.length)]];
    if (Math.random() > 0.5) wb.emotions.push(emoPool[Math.floor(Math.random() * emoPool.length)]);
    wb.checkins = 5 + Math.floor(Math.random() * 24);
    const i = ni++;
    return {
      id: rid('e_'), name: NAMES[i % NAMES.length], email: '', unitId, position,
      birth: BIRTHS[i % BIRTHS.length], joined: true, wb,
    };
  };
  const d1 = rid('u_'), d2 = rid('u_'), d3 = rid('u_'), s1 = rid('u_'), s2 = rid('u_');
  const company = {
    id: rid('c_'), demo: true, name: 'ООО «Ромашка»', ownerLogin: 'demo', threshold: THRESHOLD,
    units: [
      { id: d1, parentId: null, name: 'Отдел продаж' },
      { id: s1, parentId: d1, name: 'Группа B2B' },
      { id: s2, parentId: d1, name: 'Группа розницы' },
      { id: d2, parentId: null, name: 'Разработка' },
      { id: d3, parentId: null, name: 'Поддержка' },
    ],
    roster: [],
  };
  const push = (unit, count, pos) => { for (let i = 0; i < count; i++) company.roster.push(emp(unit, pos)); };
  push(s1, 4, 'Менеджер по продажам');
  push(s2, 4, 'Менеджер по продажам');
  push(d2, 6, 'Разработчик');
  push(d3, 2, 'Специалист поддержки'); // < THRESHOLD → самочувствие по отделу скрыто (демонстрация анонимности)
  companies.push(company);
  saveCompanies(companies);
}
