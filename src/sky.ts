// Ringkasan pagi/malam di Home: waktu lokal + cuaca open-meteo (open source, tanpa key)
import { useEffect, useState } from 'react';
import { loadCfg } from './ai';

export type Sky = { period: 'pagi' | 'siang' | 'sore' | 'malam'; weather: 'cerah' | 'berawan' | 'hujan' | 'malam-cerah' | 'malam-berawan'; temp: number; wmo: number; forecast: string; city: string; tzOffset: number };

const WMO = (code: number): 'cerah' | 'berawan' | 'hujan' =>
  code === 0 || code === 1 ? 'cerah' : code >= 51 ? 'hujan' : 'berawan';

export function greeting(period: Sky['period']) {
  switch (period) {
    case 'pagi': return 'Selamat pagi, Bos!';
    case 'siang': return 'Selamat siang, Bos!';
    case 'sore': return 'Selamat sore, Bos!';
    case 'malam': return 'Selamat malam, Bos! Utang tidur jangan ditambah utang duit, ya.';
  }
}

export function mood(period: Sky['period']) {
  switch (period) {
    case 'pagi': return 'Hari baru, kesempatan baru. Gas mulai yang paling penting dulu! ☀️';
    case 'siang': return 'Semangat di tengah hari! Jangan lupa minum air dan catat pengeluaran yang tadi. 💪';
    case 'sore': return 'Sore jelang pulang. Cek sisa budget dulu sebelum mampir, Bos. 🌇';
    case 'malam': return 'Sudah kerja keras hari ini. Istirahat yang cukup, besok kita gas lagi. 🌙';
  }
}

const forecastText = (w: Sky['weather'], p: Sky['period']) => {
  const night = p === 'malam';
  switch (w) {
    case 'cerah': return night ? 'dan langit malam cerah berbintang — enak buat lihat bintang sebentar sebelum tidur' : 'dan cuacanya cerah — pas banget buat mulai hari dengan semangat';
    case 'berawan': return night ? 'dan ada awan tipis menemani malammu' : 'dan agak berawan — tetap semangat, yang penting niatnya';
    case 'hujan': return night ? 'dan hujan gerimis — bawa payung kalau mau keluar malam' : 'dan berpotensi hujan — siapkan payung sebelum keluar, Bos';
  }
};

// offset menit zona waktu yang diisi user di Settings (default mengikuti perangkat)
export function useSky(): Sky | null {
  const cfg = loadCfg();
  const city = cfg.city || 'Jakarta';
  const lat = cfg.lat ?? -6.2, lon = cfg.lon ?? 106.816;
  const tzOff = cfg.tzOffset; // menit, undefined = pakai jam perangkat
  const [sky, setSky] = useState<Sky | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const now = new Date();
      // jam lokal: pakai offset user kalau diisi, kalau tidak pakai jam perangkat
      const local = tzOff == null ? now : new Date(now.getTime() + (tzOff + now.getTimezoneOffset()) * 60000);
      const h = local.getHours();
      const period: Sky['period'] = h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 19 ? 'sore' : 'malam';
      let skyNow: Sky = {
        period,
        weather: period === 'malam' ? 'malam-cerah' : 'cerah',
        temp: NaN, wmo: -1, forecast: '', city, tzOffset: tzOff ?? 0,
      };
      try {
        const u = new URL('https://api.open-meteo.com/v1/forecast');
        u.searchParams.set('latitude', String(lat));
        u.searchParams.set('longitude', String(lon));
        u.searchParams.set('current', 'temperature_2m,weather_code');
        u.searchParams.set('daily', 'weather_code');
        u.searchParams.set('forecast_days', '1');
        u.searchParams.set('timezone', 'auto');
        const r = await fetch(u.toString());
        if (r.ok) {
          const j = await r.json();
          const code = j.current?.weather_code ?? 0;
          const base = WMO(code);
          skyNow = {
            period,
            weather: period === 'malam' ? (base === 'hujan' ? 'hujan' : base === 'berawan' ? 'malam-berawan' : 'malam-cerah')
              : base,
            temp: j.current?.temperature_2m ?? NaN,
            wmo: code,
            city, tzOffset: 0,
            forecast: '',
          };
        }
      } catch { /* offline: pakai default cerah */ }
      // ramalan hari ini (dari kode cuaca harian)
      let dayCode = skyNow.wmo;
      try {
        const u = new URL('https://api.open-meteo.com/v1/forecast');
        u.searchParams.set('latitude', String(lat));
        u.searchParams.set('longitude', String(lon));
        u.searchParams.set('daily', 'weather_code');
        u.searchParams.set('forecast_days', '1');
        u.searchParams.set('timezone', 'auto');
        const r = await fetch(u.toString());
        if (r.ok) dayCode = (await r.json()).daily?.weather_code?.[0] ?? dayCode;
      } catch { /* offline */ }
      skyNow.forecast = forecastText(dayCode >= 0 ? WMO(dayCode) : 'cerah', period);
      if (alive) setSky(skyNow);
    };
    tick();
    const iv = setInterval(tick, 60000);
    return () => { alive = false; clearInterval(iv); };
  }, [lat, lon, city, tzOff]);

  return sky;
}

// jam lokal berjalan
export function useClock(tzOffset?: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  if (tzOffset == null) return now;
  return new Date(now.getTime() + (tzOffset + now.getTimezoneOffset()) * 60000);
}
