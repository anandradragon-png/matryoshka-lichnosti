/**
 * Заявка B2B: телефон обязателен.
 *
 * Зачем тест. Заявка — единственный способ, которым компания сообщает о себе;
 * без телефона по ней невозможно перезвонить, и лид фактически потерян.
 * Требование заказчика от 12.09.2026. Проверяем не только «поле помечено
 * звёздочкой», но и что отправка без телефона не уходит.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { freshEnv } from './helpers/boot.js';

async function openForm() {
  await import('../js/lead.js');
  document.querySelector('[data-lead]').click();
  return document.querySelector('.lead-form');
}

function fill(form, values) {
  Object.entries(values).forEach(([name, value]) => {
    form.elements[name].value = value;
  });
}

/** Отправка формы в обход браузерной проверки required — как её видит наш код. */
function submit(form) {
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}

const GOOD = {
  name: 'Светлана',
  company: 'ЮПЛАБ',
  email: 'sveta@yuplab.ru',
  phone: '+7 (900) 123-45-67',
  comment: '',
};

describe('lead.js — заявка B2B', () => {
  beforeEach(async () => {
    await freshEnv();
  });

  it('поле телефона помечено обязательным', async () => {
    const form = await openForm();
    expect(form.elements.phone.required).toBe(true);
  });

  it('без телефона заявка не уходит', async () => {
    const form = await openForm();
    const sent = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { set href(v) { sent(v); } },
      writable: true,
    });
    fill(form, { ...GOOD, phone: '' });
    submit(form);
    expect(sent).not.toHaveBeenCalled();
    expect(form.querySelector('.lead-err').hidden).toBe(false);
  });

  it('огрызок вместо номера не проходит', async () => {
    const form = await openForm();
    fill(form, { ...GOOD, phone: '123' });
    submit(form);
    expect(form.querySelector('.lead-err').textContent).toMatch(/телефон/i);
  });

  it('номер в любом написании проходит и попадает в письмо', async () => {
    const form = await openForm();
    let href = '';
    Object.defineProperty(window, 'location', {
      value: { set href(v) { href = v; } },
      writable: true,
    });
    fill(form, GOOD);
    submit(form);
    expect(decodeURIComponent(href)).toContain('Телефон: +7 (900) 123-45-67');
  });
});
