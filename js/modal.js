/* ================= МОДАЛКА КАБИНЕТА =================
   Одно окно на все экраны личного кабинета: вход, регистрация, кабинет,
   отзыв, панель разработчика. Экраны сменяют друг друга внутри него, поэтому
   ловушка фокуса ставится один раз — при первом открытии. */
import { trapFocus } from './util.js';

let modal = null;
let releaseTrap = null;

function ensure() {
  if (modal) return modal;
  modal = document.createElement('div');
  modal.className = 'account-modal';
  modal.innerHTML = '<div class="am-backdrop"></div><div class="am-box" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(modal);
  modal.querySelector('.am-backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
  return modal;
}

export function openModal(html) {
  ensure();
  const box = modal.querySelector('.am-box');
  const wasOpen = modal.classList.contains('open');
  box.innerHTML = html;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  const first = box.querySelector('input');
  if (first) setTimeout(() => first.focus(), 50);
  if (!wasOpen) releaseTrap = trapFocus(box);
  return modal;
}

export function closeModal() {
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
  if (releaseTrap) { releaseTrap(); releaseTrap = null; }
}

/* Элемент внутри открытой модалки. Нужен экранам, чтобы навесить обработчики. */
export const inModal = sel => (modal ? modal.querySelector(sel) : null);
export const allInModal = sel => (modal ? modal.querySelectorAll(sel) : []);
