/* ================= РОУТЕР ВКЛАДОК (лендинг → сайт) =================
   Прогрессивное улучшение. БЕЗ JS все секции видны — это длинная страница
   (graceful degradation: важно для SEO, для тестов и на случай ошибки скрипта).
   С JS страница превращается в сайт с «вкладками»: показываем одну вкладку
   (view) за раз, прочие прячем. Шапка и подвал видны всегда.

   Гибрид сознательный: «Главная» — маркетинговая витрина (длинный скролл:
   герой → концепт → как работает → ценность → CTA). Интерактив (бот, органайзер,
   карта, практики, тесты) вынесен в отдельные вкладки-рабочие панели. */

// Карта вкладок: id вкладки → id секций, входящих в неё (в порядке показа).
const VIEWS = {
  home: ['hero', 'concept', 'how', 'value', 'partners', 'cta'],
  bot: ['bot', 'plutchik'],
  organizer: ['organizer'],
  map: ['map'],
  practices: ['practices'],
  tests: ['tests'],
  pricing: ['pricing'],
};

// Обратный индекс: id секции → id её вкладки.
const SECTION_VIEW = {};
for (const [view, ids] of Object.entries(VIEWS)) {
  ids.forEach(id => (SECTION_VIEW[id] = view));
}
// Синонимы «якорей», встречающихся в разметке.
SECTION_VIEW.top = 'home'; // логотип/шапка ведёт на «Главную»

const navLinks = [...document.querySelectorAll('[data-view-link]')];

/* Помечаем управляемые секции атрибутом data-view — по нему CSS их прячет/кажет. */
Object.entries(SECTION_VIEW).forEach(([id, view]) => {
  const el = document.getElementById(id);
  if (el) el.dataset.view = view;
});

function setActiveNav(view) {
  navLinks.forEach(a => a.classList.toggle('active', a.dataset.viewLink === view));
}

/* Показать вкладку. scrollToId — прокрутить к конкретной секции внутри вкладки
   (например к #how на «Главной»); иначе прокрутка наверх. */
function showView(view, scrollToId) {
  if (!VIEWS[view]) view = 'home';
  document.querySelectorAll('[data-view]').forEach(el => {
    el.classList.toggle('view-on', el.dataset.view === view);
  });
  setActiveNav(view);
  document.body.dataset.view = view;

  if (scrollToId && VIEWS[view].length > 1) {
    const target = document.getElementById(scrollToId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }
  window.scrollTo({ top: 0, behavior: 'auto' });
}

/* Перейти по id секции: определяем её вкладку и открываем. */
function goTo(sectionId, { updateHash = true } = {}) {
  const view = SECTION_VIEW[sectionId] || 'home';
  const scrollToId = VIEWS[view].length > 1 && sectionId !== VIEWS[view][0] ? sectionId : null;
  showView(view, scrollToId);
  if (updateHash) {
    const hash = view === 'home' ? '#top' : '#' + view;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  }
}

/* Перехват кликов по внутренним якорям и элементам с data-nav. */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"], [data-nav], [data-view-link]');
  if (!a) return;
  const href = a.getAttribute('href') || '';
  const id = href.startsWith('#') ? href.slice(1) : a.dataset.viewLink;
  if (!id) return;
  if (id in SECTION_VIEW || id in VIEWS) {
    e.preventDefault();
    goTo(id);
  }
});

/* Программная навигация из других модулей (чат, практики) — через событие,
   чтобы не заводить прямые зависимости между модулями. */
document.addEventListener('ml:goto', e => goTo(e.detail));

/* Инициализация: включаем режим сайта и открываем вкладку из адреса (#bot и т.п.). */
document.body.classList.add('spa');
const initId = (location.hash || '').slice(1);
goTo(initId && (initId in SECTION_VIEW || initId in VIEWS) ? initId : 'home', {
  updateHash: false,
});

window.addEventListener('hashchange', () => {
  const id = (location.hash || '').slice(1);
  if (id in SECTION_VIEW || id in VIEWS) goTo(id, { updateHash: false });
});
