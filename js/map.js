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
