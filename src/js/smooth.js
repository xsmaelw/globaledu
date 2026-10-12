import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reduceMotion } from './env.js';

gsap.registerPlugin(ScrollTrigger);

/** Inertial scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync. */
export function initSmooth() {
  if (reduceMotion) return null;
  const lenis = new Lenis({ lerp: 0.18, wheelMultiplier: 1.15, smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export const easeExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
