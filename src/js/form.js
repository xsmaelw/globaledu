import gsap from 'gsap';
import { $, $$, reduceMotion } from './env.js';

// Requests are delivered by e-mail through formsubmit.co (no server code needed).
const FORM_EMAIL = 'globaleduc@gmail.com';
const DIRECTIONS = ['Ingliz tili', 'Hamkorlik', 'Imtihonlar', 'Xorijda taʼlim'];

export function initForm(lenis) {
  const form = $('[data-form]');
  if (!form) return;
  const chips = $$('[data-chip]', form);
  const submit = $('[data-submit]', form);
  const errBox = $('[data-send-err]', form);
  let dir = null;

  const pick = (i) => {
    dir = dir === i ? null : i;
    chips.forEach((c, k) => c.setAttribute('aria-pressed', String(k === dir)));
  };
  chips.forEach((c) => c.addEventListener('click', () => pick(Number(c.dataset.chip))));
  document.addEventListener('ge:pick', (e) => { dir = null; pick(e.detail); });

  const setErr = (name, on) => $(`[name="${name}"]`, form).closest('.field').classList.toggle('has-err', on);
  form.addEventListener('input', (e) => { if (e.target.name === 'n' || e.target.name === 'c') setErr(e.target.name, false); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submit.classList.contains('is-sending')) return;
    const n = form.elements.n.value.trim();
    const c = form.elements.c.value.trim();
    const m = form.elements.m.value.trim();
    const badN = n.length < 2;
    const badC = !(/^\S+@\S+\.\S+$/.test(c) || /^@[A-Za-z0-9_]{4,}$/.test(c) || c.replace(/\D/g, '').length >= 9);
    setErr('n', badN); setErr('c', badC);
    if (badN || badC) { (badN ? form.elements.n : form.elements.c).focus(); return; }

    errBox.hidden = true;
    submit.classList.add('is-sending');
    $('span', submit).textContent = 'Yuborilmoqda…';
    try {
      const res = await fetch('https://formsubmit.co/ajax/' + FORM_EMAIL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: 'Yangi ariza — GlobalEdu.uz', _template: 'table', _captcha: 'false',
          _honey: form.elements._honey.value,
          Yonalish: dir == null ? '—' : DIRECTIONS[dir], Ism: n, Aloqa: c, Xabar: m || '—',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === 'false' || data.success === false) throw new Error('send');
      showSent();
    } catch {
      errBox.hidden = false;
      submit.classList.remove('is-sending');
      $('span', submit).textContent = 'Soʻrov yuborish';
    }
  });

  function showSent() {
    const sent = $('[data-sent]');
    const stamp = $('[data-sent-stamp]', sent);
    form.hidden = true; sent.hidden = false;
    lenis?.resize?.();
    if (reduceMotion) return;
    gsap.fromTo(stamp, { scale: 3.2, rotate: 10, autoAlpha: 0 }, { scale: 1, rotate: -7, autoAlpha: 1, duration: 0.45, ease: 'power4.in' });
    gsap.fromTo(sent, { x: 0 }, { x: 0, keyframes: [{ x: -7, duration: 0.05 }, { x: 6, duration: 0.05 }, { x: -3, duration: 0.05 }, { x: 0, duration: 0.05 }], delay: 0.45 });
    gsap.from($$('h3, p', sent), { yPercent: 40, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.1, delay: 0.5 });
  }
}
