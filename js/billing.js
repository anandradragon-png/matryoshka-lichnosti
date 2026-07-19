/* ================= ПЕРЕКЛЮЧАТЕЛЬ ТАРИФОВ (мес/год) ================= */
(function billing() {
  const toggle = document.getElementById('billingToggle');
  if (!toggle) return;
  const priceEl = document.querySelector('.price-card.featured .price');
  toggle.querySelectorAll('button').forEach(b => b.onclick = () => {
    toggle.querySelectorAll('button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    priceEl.innerHTML = b.dataset.plan === 'year' ? priceEl.dataset.year : priceEl.dataset.month;
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
