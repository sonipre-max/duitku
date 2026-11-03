import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { today, idr } from '../util';
import { useSky, useClock } from '../sky';
import { applyWallpaper, setTimeOfDay, wallOn } from '../theme';

// Dashboard: greeting avatar+jam besar+cuaca, ringkasan tipis (masuk/keluar + tombol notes), banner motivasi.
// Wallpaper day/night full-bleed diatur di sini.
export default function SkyCard({ go }: { go?: (t: string) => void }) {
  const sky = useSky();
  const clock = useClock(sky && sky.tzOffset !== 0 ? sky.tzOffset : undefined);
  const night = !!sky && sky.period === 'malam';

  // wallpaper day/night mengikuti waktu
  useEffect(() => {
    if (wallOn()) applyWallpaper(true);
    if (sky) setTimeOfDay(night);
  }, [night, sky]);

  const dayTxs = useLiveQuery(() => db.txs.where('date').equals(today()).toArray(), []) || [];

  if (!sky) return null;
  const rain = sky.weather === 'hujan';
  const cloudy = sky.weather === 'berawan' || sky.weather === 'malam-berawan';

  const inc = dayTxs.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
  const out = dayTxs.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);

  const hhmm = `${String(clock.getHours()).padStart(2, '0')}.${String(clock.getMinutes()).padStart(2, '0')}`;
  const dstr = clock.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const greet = night ? 'Selamat Malam' : sky.period === 'pagi' ? 'Selamat Pagi' : sky.period === 'siang' ? 'Selamat Siang' : 'Selamat Sore';
  const emo = night ? '🌙' : '☀️';
  const motto = night
    ? 'Istirahat yang cukup, besok kita lanjut lagi!'
    : sky.period === 'pagi' ? 'Semangat menjalani hari baru! Langkah kecil, hasil besar.'
    : sky.period === 'siang' ? 'Tengah hari, tetap fokus dan semangat ya, Bos!'
    : 'Sore menjelang, hampir sampai. Tetap semangat!';
  const banner = night ? ['Istirahat dulu, Bos..', 'Besok kita gas lagi! 💪', '✨'] : ['Terus melangkah, Bos!', 'Hari ini pasti lebih baik!', '🧭'];

  return (
    <>
      <div className={'dashTop' + (night ? ' night' : '')}>
        <div className="dashGreet">
          <div className="avatar">👦<span className="crown">👑</span></div>
          <div>
            <b>{greet}, Bos! {emo}</b>
            <div className="motto">{motto}</div>
          </div>
        </div>
        <div className="dashHero">
          <div className="clockBig">
            <b>{hhmm}</b>
            <span className="dateChip">📅 {dstr}</span>
          </div>
          <div className="wcard">
            <div className="wIcon">{night ? (cloudy ? '☁️' : '🌙') : (cloudy ? '🌤️' : '☀️')}</div>
            <div className="wBody">
              <b>{Math.round(sky.temp)}°C <span className="wCity">📍 {sky.city}</span></b>
              <div className="wCond">{rain ? 'Hujan' : 'Cerah berawan'}</div>
              <div className="wSub">{sky.forecast}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ringkasan tipis: pemasukan ▼ hijau / pengeluaran ▲ merah, klik buka catatan keuangan + tombol notes */}
      <div className="quickSum">
        <button className="qsItem" onClick={() => go && go('uang')} title="Catat pemasukan">
          <span className="qsIco in">▼</span>
          <div className="qsTxt"><b className="pos">{idr(inc)}</b><span>Pemasukan</span></div>
        </button>
        <button className="qsItem" onClick={() => go && go('uang')} title="Catat pengeluaran">
          <span className="qsIco out">▲</span>
          <div className="qsTxt"><b className="neg">{idr(out)}</b><span>Pengeluaran</span></div>
        </button>
        <button className="qsNote" title="Notes (segera)" aria-label="Notes">✏️</button>
      </div>

      <div className={'mottoBanner' + (night ? ' night' : '')}>
        <span className="mIco">{banner[2]}</span>
        <div className="mTxt"><b>{banner[0]}</b><span>{banner[1]}</span></div>
        <span className="chev">›</span>
      </div>
    </>
  );
}
