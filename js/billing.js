/* ================= ПЕРЕКЛЮЧАТЕЛЬ ТАРИФОВ (мес/год) ================= */
(function billing() {
  const toggle = document.getElementById('billingToggle');
  if (!toggle) return;
  // Все платные карточки с ценой мес/год, а не только «Стандартная».
  const priceEls = [...document.querySelectorAll('.price-card .price[data-month]')];
  toggle.querySelectorAll('button').forEach(b => b.onclick = () => {
    toggle.querySelectorAll('button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    const year = b.dataset.plan === 'year';
    priceEls.forEach(el => (el.innerHTML = year ? el.dataset.year : el.dataset.month));
  });
})();

/* ================= ЗАГЛУШКА ОПЛАТЫ (до подключения приёма платежей) ================= */
(function payStub() {
  let toast;
  function showToast(msg) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'pay-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 3500);
  }
  document.querySelectorAll('[data-pay-stub]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      showToast('💜 Приём оплаты скоро будет доступен. Оставьте заявку в ассистенте — мы свяжемся с вами.');
    });
  });
})();
