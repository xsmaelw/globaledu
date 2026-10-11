import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$, reduceMotion } from './env.js';
import { easeExpo } from './smooth.js';

export function initHeader(lenis) {
  const hdr = $('[data-hdr]');
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  let menuOpen = false;

  /* ---- smooth anchor navigation ---- */
  const goTo = (hash, pick) => {
    const target = hash === '#top' ? 0 : $(hash);
    if (target === null || target === undefined) return;
    if (pick != null) document.dispatchEvent(new CustomEvent('ge:pick', { detail: Number(pick) }));
    if (lenis) lenis.scrollTo(target, { duration: 1.7, easing: easeExpo, offset: hash === '#contact' ? 0 : 0 });
    else (target === 0 ? window.scrollTo(0, 0) : target.scrollIntoView());
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-scroll]');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (!hash?.startsWith('#')) return;
    e.preventDefault();
    if (menuOpen) closeMenu(() => goTo(hash, a.dataset.pick));
    else goTo(hash, a.dataset.pick);
    history.replaceState(null, '', hash === '#top' ? location.pathname : hash);
  });

  /* ---- hide on scroll down, show on scroll up ---- */
  let last = 0;
  const onScroll = (y) => {
    hdr.classList.toggle('is-solid', y > 40);
    if (menuOpen) return;
    if (y > last + 4 && y > 240) hdr.classList.add('is-hidden');
    else if (y < last - 4 || y < 240) hdr.classList.remove('is-hidden');
    last = y;
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else addEventListener('scroll', () => onScroll(scrollY), { passive: true });

  /* ---- active section in nav ---- */
  $$('[data-nav]').forEach((link) => {
    const sec = $(link.getAttribute('href'));
    if (!sec) return;
    ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', toggleClass: { targets: link, className: 'is-active' } });
  });

  /* ---- fullscreen menu ---- */
  const links = $$('.menu__nav a', menu);
  const foot = $$('.menu__foot a', menu);
  function openMenu() {
    menuOpen = true;
    burger.setAttribute('aria-expanded', 'true');
    burger.querySelector('.burger__label').textContent = 'Yopish';
    menu.classList.add('is-open'); menu.setAttribute('aria-hidden', 'false');
    hdr.classList.remove('is-hidden');
    lenis?.stop(); document.documentElement.style.overflow = 'hidden';
    gsap.killTweensOf([menu, ...links, ...foot]);
    gsap.fromTo(menu, { clipPath: 'circle(0px at calc(100% - 56px) 36px)' }, { clipPath: 'circle(150% at calc(100% - 56px) 36px)', duration: reduceMotion ? 0 : 0.9, ease: 'expo.inOut' });
    gsap.fromTo($$('b', menu), { yPercent: 110 }, { yPercent: 0, duration: reduceMotion ? 0 : 0.9, ease: 'expo.out', stagger: 0.07, delay: 0.25 });
    gsap.fromTo(foot, { y: 24 }, { y: 0, duration: reduceMotion ? 0 : 0.7, ease: 'expo.out', stagger: 0.05, delay: 0.45 });
  }
  function closeMenu(after) {
    menuOpen = false;
    burger.setAttribute('aria-expanded', 'false');
    burger.querySelector('.burger__label').textContent = 'Menyu';
    document.documentElement.style.overflow = ''; lenis?.start();
    gsap.to(menu, { clipPath: 'circle(0px at calc(100% - 56px) 36px)', duration: reduceMotion ? 0 : 0.7, ease: 'expo.inOut',
      onComplete: () => { menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true'); after?.(); } });
  }
  burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) closeMenu(); });
  matchMedia('(min-width: 961px)').addEventListener('change', (m) => { if (m.matches && menuOpen) closeMenu(); });
}
