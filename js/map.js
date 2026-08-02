/* ================= КАРТА ЛИЧНОСТИ (Дары и Поля) ================= */
(function initMap() {
  const chips = document.getElementById('fieldsChips');
  if (!chips || !window.YupDar) return;
  const { FIELDS, getPersonalityCard } = window.YupDar;

  /* Блок «физика поля»: стихия, тело, цвет струны, рисунок, течение, слои. */
  function physicsHtml(f) {
    const p = f.physics;
    if (!p) return '';
    return `
      <div class="map-physics">
        <h5>Физика поля</h5>
        <div class="map-phys-grid">
          <span><i>Стихия</i>${p.element}</span>
          <span><i>Тело</i>${p.body}</span>
          <span><i>Цвет струны</i>${p.string}</span>
          <span><i>Рисунок</i>${p.drawing}</span>
        </div>
        <p class="map-phys-flow"><b>Течение энергии:</b> ${p.flow}</p>
        <p class="map-phys-layers"><b>Слои:</b> МА — ${p.layers.ma}; ЖИ — ${p.layers.zhi}; КУН — ${p.layers.kun}.</p>
      </div>`;
  }

  /* Свет + тень поля по всем трём позициям (для просмотра поля целиком). */
  function fieldAspectsHtml(f) {
    return `
      <div class="map-aspects">
        <div class="map-aspect">
          <span class="map-aspect-pos">Потенциал · МА</span>
          <p class="map-light">☀️ ${f.light.ma}</p>
          <p class="map-shadow"><b>Пассивная тень:</b> ${f.shadow.passive}</p>
        </div>
        <div class="map-aspect">
          <span class="map-aspect-pos">Реализация · ЖИ</span>
          <p class="map-light">☀️ ${f.light.zhi}</p>
          <p class="map-shadow"><b>Активная тень:</b> ${f.shadow.active}</p>
        </div>
        <div class="map-aspect">
          <span class="map-aspect-pos">Результат · КУН</span>
          <p class="map-light">☀️ ${f.light.kun}</p>
          <p class="map-shadow"><b>Тень разрыва:</b> ${f.shadow.broken}</p>
        </div>
      </div>`;
  }

  /* Персональная расшифровка — человекоориентированный формат: три грани
     характера тёплым понятным языком, без технических меток «поля/МА/ЖИ/КУН». */
  const ASPECT_TITLES = { ma:'Ваша внутренняя опора', zhi:'Как вы проявляете себя', kun:'Что вы дарите близким и миру' };
  const ASPECT_SHADOWS = { ma:'Когда теряете равновесие', zhi:'Когда выбиваетесь из сил', kun:'В трудные периоды' };
  function personAspectsHtml(aspects) {
    return ['ma', 'zhi', 'kun'].map(pos => {
      const a = aspects[pos];
      return `
        <div class="map-aspect" style="--afc:${a.field.color}">
          <span class="map-aspect-pos">${ASPECT_TITLES[pos]}</span>
          <p class="map-light">☀️ ${a.light}</p>
          <p class="map-shadow"><b>${ASPECT_SHADOWS[pos]}:</b> ${a.shadow}</p>
        </div>`;
    }).join('');
  }

  /* Эмоциональная опора: как ощущается трудное состояние и как вернуться в ресурс. */
  function resourceHtml(f) {
    const r = f.resource;
    if (!r) return '';
    return `
      <div class="map-resource">
        <h4>Как вернуться к себе</h4>
        <p class="map-res-signs">${r.signs}</p>
        <p class="map-res-steps">☘️ ${r.steps}</p>
      </div>`;
  }

  chips.innerHTML = Object.entries(FIELDS).map(([n, f]) =>
    `<span class="field-chip" style="--fc:${f.color}" data-field="${n}">${f.icon} ${f.name}<i>${f.theme}</i></span>`
  ).join('');

  chips.querySelectorAll('.field-chip').forEach(ch => ch.onclick = () => {
    const f = FIELDS[ch.dataset.field];
    document.getElementById('mapResult').innerHTML = `
      <div class="map-card" style="--fc:${f.color}">
        <div class="map-field-head"><span class="map-field-icon">${f.icon}</span>
          <div><h3>Поле ${f.name}</h3><span class="muted">${f.theme}</span></div></div>
        <p class="map-essence">${f.essence}</p>
        ${fieldAspectsHtml(f)}
        ${physicsHtml(f)}
      </div>`;
    document.getElementById('mapResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
        <p class="map-essence">${f.essence}</p>
        <h4 class="map-aspects-title">Три грани вашего характера</h4>
        ${personAspectsHtml(r.aspects)}
        ${resourceHtml(f)}
        <a href="#pricing" class="btn btn-primary" data-nav>Раскрыть полную Карту личности</a>
      </div>`;
    document.getElementById('mapResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
})();
