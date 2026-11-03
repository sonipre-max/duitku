import { useEffect, useState } from 'react';

export type ThemeId = 'darkpro' | 'light' | 'gold' | 'cyber';

export const THEMES: { id: ThemeId; name: string; desc: string; swatch: string[] }[] = [
  { id: 'darkpro', name: 'Modern Dark Pro', desc: 'Tech & futuristik', swatch: ['#0b0f1a', '#3b82f6', '#22c55e'] },
  { id: 'light', name: 'Clean Light', desc: 'Simple & segar', swatch: ['#ffffff', '#2563eb', '#16a34a'] },
  { id: 'gold', name: 'Premium Gold', desc: 'Elegan & mewah', swatch: ['#050505', '#d4af37', '#22c55e'] },
  { id: 'cyber', name: 'Cyber Finance', desc: 'Gaya gaming neon', swatch: ['#0d0221', '#a855f7', '#e879f9'] },
];

export const getTheme = (): ThemeId => {
  const t = localStorage.getItem('theme') as ThemeId | null;
  return t && THEMES.some(x => x.id === t) ? t : 'light';
};
// setTheme + event agar halaman yang sudah terbuka ikut berubah
export const setTheme = (t: ThemeId) => {
  localStorage.setItem('theme', t);
  document.documentElement.setAttribute('data-theme', t);
  window.dispatchEvent(new CustomEvent('themechange', { detail: t }));
};

// wallpaper: pasang <img class="wpbg"> + body.wp, ganti day/night sesuai jam
export function applyWallpaper(on: boolean) {
  localStorage.setItem('wp', on ? '1' : '0');
  let el = document.querySelector('.wpbg') as HTMLImageElement | null;
  if (on && !el) {
    el = document.createElement('img');
    el.className = 'wpbg';
    el.alt = '';
    document.body.appendChild(el);
  }
  if (!on && el) el.remove();
  document.body.classList.toggle('wp', on);
  document.documentElement.classList.toggle('wp', on);
  if (on && el && !el.src) el.src = './day.jpg';
}
export const wallOn = () => localStorage.getItem('wp') === '1';
export const setTimeOfDay = (night: boolean) => {
  document.documentElement.setAttribute('data-time', night ? 'night' : 'day');
};
export const useTheme = (): ThemeId => {
  const [t, setT] = useState<ThemeId>(getTheme());
  useEffect(() => {
    const h = (e: Event) => setT((e as CustomEvent).detail);
    window.addEventListener('themechange', h);
    return () => window.removeEventListener('themechange', h);
  }, []);
  return t;
};
// terapkan tema tersimpan saat app dibuka
document.documentElement.setAttribute('data-theme', getTheme());
