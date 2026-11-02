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
export const setTheme = (t: ThemeId) => {
  localStorage.setItem('theme', t);
  document.documentElement.setAttribute('data-theme', t);
};
// terapkan tema tersimpan saat app dibuka
document.documentElement.setAttribute('data-theme', getTheme());
