import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { today, idr } from '../util';
import { useSky, useClock } from '../sky';
import { applyWallpaper, setTimeOfDay, wallOn } from '../theme';

// Dashboard ala mockup: greeting avatar+jam besar+cuaca, band wallpaper, ringkasan, agenda, banner motivasi
export default function SkyCard() {
  const sky = useSky();
  const clock = useClock(sky && sky.tzOffset !== 0 ? sky.tzOffset : undefined);
  const night = !!sky && sky.period === 'malam';

  // wallpaper day/night mengikuti waktu
  useEffect(() => {
    if (wallOn()) applyWallpaper(true);
    if (sky) setTimeOfDay(night);
  }, [night, sky]);

  const dayTxs = useLiveQuery(() => db.txs.where('date').equals(today()).toArray(), []) || [];
  const tasksToday = useLiveQuery(() => db.tasks.where('date').equals(today()).toArray(), []) || [];
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) || [];
  const plans = useLiveQuery(() => db.plans.toArray(), []) || [];
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const yestTxs = useYestTxs(ymd(yest));

  if (!sky) return null;
  const rain = sky.weather === 'hujan';
  const cloudy = sky.weather === 'berawan' || sky.weather === 'malam-berawan';

  const saldo = accounts.reduce((s, a) => s + a.balance0, 0)
    + dayTxs.reduce((s, t) => s + (t.type === 'in' ? t.amount : -t.amount), 0);
  const spent = dayTxs.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
  const doneN = tasksToday.filter(t => t.done).length;

  // % perubahan vs kemarin (pengeluaran & saldo)
  const spentY = yestTxs.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
  const spentPct = spentY > 0 ? ((spent - spentY) / spentY * 100) : 0;
  const saldoY = saldo - dayTxs.reduce((s, t) => s + (t.type === 'in' ? t.amount : -t.amount), 0);
  const saldoPct = saldoY > 0 ? ((saldo - saldoY) / saldoY * 100) : 0;

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
              <div className="wCond">{rain ? 'Hujan' : cloudy ? 'Cerah berawan' : night ? 'Cerah' : 'Cerah'}</div>
              <div className="wSub">{sky.forecast}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={'dashBand' + (night ? ' night' : '')} aria-hidden>
        <img src={night ? './night.jpg' : './day.jpg'} alt="" loading="eager" />
      </div>

      <section className="dashCard">
        <div className="dashHead">
          <span className="starBadge">⭐</span>
          <b>Ringkasan Hari Ini</b>
        </div>
        <div className="dashStats">
          <div className="dstat">
            <span className="dico orange">👛</span>
            <b>{idr(saldo)}</b>
            <span className="dlab">Saldo Total</span>
            <span className={`pill ${saldoPct >= 0 ? 'pos' : 'neg'}`}>{saldoPct >= 0 ? '▲' : '▼'} {Math.abs(saldoPct).toFixed(1)}%</span>
          </div>
          <div className="dstat">
            <span className="dico blue">📊</span>
            <b>{idr(spent)}</b>
            <span className="dlab">Pengeluaran Hari Ini</span>
            {spentY > 0 && <span className={`pill ${spentPct <= 0 ? 'pos' : 'neg'}`}>{spentPct >= 0 ? '▲' : '▼'} {Math.abs(spentPct).toFixed(1)}%</span>}
          </div>
          <div className="dstat">
            <span className="dico green">✅</span>
            <b>{doneN}</b>
            <span className="dlab">Tugas Selesai</span>
          </div>
        </div>
      </section>

      <section className="dashCard agenda">
        <div className="dashHead">
          <span className="starBadge blue">📅</span>
          <b>Agenda Hari Ini</b>
        </div>
        {tasksToday.slice(0, 4).map(t => (
          <div className="agRow" key={t.id}>
            <span className={'adot' + (t.done ? ' ok' : '')}>{t.done ? '●' : '○'}</span>
            <span className="agIco">{t.priority === 3 ? '🎓' : t.priority === 2 ? '📖' : '🏋️'}</span>
            <div className="agTxt">
              <b>{t.title}</b>
              <span>{t.time || 'Sepanjang hari'}</span>
            </div>
          </div>
        ))}
        {!tasksToday.length && (
          <div className="agRow">
            <span className="adot">○</span><span className="agIco">📝</span>
            <div className="agTxt"><b>Belum ada agenda</b><span>Tambah di tab Tugas, yuk!</span></div>
          </div>
        )}
      </section>

      <div className={'mottoBanner' + (night ? ' night' : '')}>
        <span className="mIco">{banner[2]}</span>
        <div className="mTxt"><b>{banner[0]}</b><span>{banner[1]}</span></div>
        <span className="chev">›</span>
      </div>
    </>
  );
}

function useYestTxs(date: string) {
  return useLiveQuery(() => db.txs.where('date').equals(date).toArray(), [date]) || [];
}
