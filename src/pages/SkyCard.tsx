import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { today, idr, addDays, parse } from '../util';
import { useSky, useClock } from '../sky';
import { applyWallpaper, setTimeOfDay, wallOn } from '../theme';
import { Ic, Deco } from '../icons';

const ICO: Record<string, keyof typeof Deco> = {
  kuliah: 'graduation', belajar: 'book', gym: 'gym', kerja: 'laptop', baca: 'book', meditasi: 'lotus',
  meeting: 'laptop', olahraga: 'gym', belanja: 'cart', kelas: 'graduation', mandarin: 'book', review: 'laptop', project: 'laptop',
};
const pickIco = (title: string, priority: number): keyof typeof Deco => {
  const t = title.toLowerCase();
  for (const k of Object.keys(ICO)) if (t.includes(k)) return ICO[k];
  return priority === 3 ? 'graduation' : priority === 2 ? 'book' : 'memo';
};

const toMin = (time: string) => {
  const m = time.match(/(\d{1,2}):(\d{2})/);
  return m ? +m[1] * 60 + +m[2] : -1;
};

function useTick(ms = 30000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setT(x => x + 1), ms);
    return () => clearInterval(iv);
  }, [ms]);
}

// Dashboard: greeting+jam+cuaca, ringkasan tipis, agenda harian interaktif, banner motivasi
export default function SkyCard({ go }: { go?: (t: string) => void }) {
  const sky = useSky();
  const clock = useClock(sky && sky.tzOffset !== 0 ? sky.tzOffset : undefined);
  const night = !!sky && sky.period === 'malam';

  useEffect(() => {
    if (wallOn()) applyWallpaper(true);
    if (sky) setTimeOfDay(night);
  }, [night, sky]);
  useTick();

  const dayTxs = useLiveQuery(() => db.txs.where('date').equals(today()).toArray(), []) || [];
  const allTasks = useLiveQuery(() => db.tasks.toArray(), []) || [];

  const [dayOff, setDayOff] = useState(0); // 0=hari ini, -1=kemarin, +1=besok
  const viewDate = addDays(today(), dayOff);

  if (!sky) return null;
  const rain = sky.weather === 'hujan';
  const cloudy = sky.weather === 'berawan' || sky.weather === 'malam-berawan';

  const inc = dayTxs.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
  const out = dayTxs.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);

  const hhmm = `${String(clock.getHours()).padStart(2, '0')}.${String(clock.getMinutes()).padStart(2, '0')}`;
  const nowMin = clock.getHours() * 60 + clock.getMinutes();
  const dstr = clock.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const greet = night ? 'Selamat Malam' : sky.period === 'pagi' ? 'Selamat Pagi' : sky.period === 'siang' ? 'Selamat Siang' : 'Selamat Sore';
  const emo = night ? '🌙' : '☀️';
  const motto = night
    ? 'Istirahat yang cukup, besok kita lanjut lagi!'
    : sky.period === 'pagi' ? 'Semangat menjalani hari baru! Langkah kecil, hasil besar.'
    : sky.period === 'siang' ? 'Tengah hari, tetap fokus dan semangat ya, Bos!'
    : 'Sore menjelang, hampir sampai. Tetap semangat!';
  const banner = night ? ['Istirahat dulu, Bos..', 'Besok kita gas lagi! 💪', '✨'] : ['Terus melangkah, Bos!', 'Hari ini pasti lebih baik!', '🧭'];

  // agenda utk tanggal yang dilihat (termasuk repeat), urut jam
  const d = parse(viewDate);
  const dateLabel = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const agenda = allTasks
    .filter(t => t.repeat === 'none' ? t.date === viewDate
      : t.repeat === 'daily' || (t.repeat === 'weekly' && parse(t.date).getDay() === d.getDay()) || (t.repeat === 'monthly' && parse(t.date).getDate() === d.getDate()))
    .sort((a, b) => toMin(a.time) - toMin(b.time));
  const isToday = dayOff === 0;
  const dayLabel = dayOff === 0 ? 'Hari Ini' : dayOff === -1 ? 'Kemarin' : dayOff === 1 ? 'Besok' : d.toLocaleDateString('id-ID', { weekday: 'long' });

  // kelompokkan: berlangsung / mendatang / lewat
  const ongoing = isToday ? agenda.filter(t => { const s = toMin(t.time); return s >= 0 && s <= nowMin && !t.done; }) : [];
  const upcoming = agenda.filter(t => !t.done && !ongoing.includes(t) && (!isToday || toMin(t.time) > nowMin));
  const pastList = isToday ? agenda.filter(t => t.done || (toMin(t.time) >= 0 && toMin(t.time) <= nowMin)) : [];
  // untuk non-hari-ini: tampil semua biasa
  const listMain = isToday ? [...ongoing, ...upcoming] : agenda;

  const countdown = (time: string) => {
    const s = toMin(time);
    if (s < 0) return '';
    const diff = s - nowMin;
    if (diff <= 0) return '';
    if (diff < 60) return `${diff} menit lagi`;
    return `${Math.floor(diff / 60)} jam ${diff % 60} menit lagi`;
  };

  const Row = ({ t, state }: { t: typeof agenda[0]; state: 'now' | 'next' | 'past' }) => (
    <div className={'agRow ' + state + (t.done ? ' ok' : '')} key={t.id}>
      <span className={'adot' + (state === 'now' ? ' live' : t.done ? ' ok' : '')} />
      <span className="agIco">{(() => { const D = Deco[pickIco(t.title, t.priority)] as any; return <D width={19} />; })()}</span>
      <div className="agTxt">
        <b>{t.title}</b>
        <span>{t.time || 'Sepanjang hari'}</span>
        {state === 'now' && <span className="cd live">● Berlangsung</span>}
        {state === 'next' && isToday && countdown(t.time) && <span className="cd">⏳ {countdown(t.time)}</span>}
      </div>
    </div>
  );

  return (
    <>
      <div className={'dashTop' + (night ? ' night' : '')}>
        <div className="dashGreet">
          <div className="avatar"><Deco.avatar width={30} /><span className="crown"><Deco.crown width={16} /></span></div>
          <div>
            <b>{greet}, Bos! {night ? <Deco.moon width={16} style={{verticalAlign:'-2px'}} /> : <Deco.sun width={16} style={{verticalAlign:'-2px'}} />}</b>
            <div className="motto">{motto}</div>
          </div>
        </div>
        <div className="dashHero">
          <div className="clockBig">
            <b>{hhmm}</b>
            <span className="dateChip"><Ic.calendar size={11} style={{verticalAlign:'-1.5px', marginRight:3}} />{dstr}</span>
          </div>
          <div className="wcard">
            <div className="wIcon">{night ? (cloudy ? <Deco.cloud width={30} /> : <Deco.moon width={30} />) : (cloudy ? <Deco.sunCloud width={30} /> : <Deco.sun width={30} />)}</div>
            <div className="wBody">
              <b>{Math.round(sky.temp)}°C <span className="wCity"><Deco.pin width={10} style={{verticalAlign:'-1px'}} /> {sky.city}</span></b>
              <div className="wCond">{rain ? 'Hujan' : 'Cerah berawan'}</div>
              <div className="wSub">{sky.forecast}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="quickSum">
        <button className="qsItem" onClick={() => go && go('uang')} title="Catat pemasukan">
          <span className="qsIco in"><Ic.down size={16} strokeWidth={2.6} /></span>
          <div className="qsTxt"><b className="pos">{idr(inc)}</b><span>Pemasukan</span></div>
        </button>
        <button className="qsItem" onClick={() => go && go('uang')} title="Catat pengeluaran">
          <span className="qsIco out"><Ic.up size={16} strokeWidth={2.6} /></span>
          <div className="qsTxt"><b className="neg">{idr(out)}</b><span>Pengeluaran</span></div>
        </button>
        <button className="qsNote" title="Notes (segera)" aria-label="Notes"><Ic.pencil size={18} /></button>
      </div>

      {/* Agenda harian: geser kiri/kanan antar hari, scroll vertikal utk agenda lewat */}
      <section className="agendaCard" onClick={e => e.stopPropagation()}>
        <div className="dashHead">
          <span className="starBadge blue"><Ic.calendar size={16} /></span>
          <div className="agTitle">
            <b>Agenda {dayLabel}</b>
            <span className="agDate">{dateLabel}</span>
          </div>
          <a className="dashLink" href="#" onClick={e => { e.preventDefault(); go && go('tugas'); }}>Lihat Semua ›</a>
        </div>
        <div className="agSwipe">
          <button className="agNav" onClick={() => setDayOff(x => x - 1)} aria-label="Hari sebelumnya">‹</button>
          <div className="agList">
            {listMain.length === 0 && pastList.length === 0 && (
              <div className="agRow empty"><span className="agIco">📝</span><div className="agTxt"><b>Tidak ada agenda</b><span>Geser ‹ › untuk hari lain</span></div></div>
            )}
            {listMain.map(t => <Row key={t.id} t={t} state={ongoing.includes(t) ? 'now' : isToday && toMin(t.time) > nowMin ? 'next' : 'past'} />)}
            {isToday && pastList.length > 0 && (
              <details className="agPast">
                <summary>Agenda yang sudah lewat ({pastList.length})</summary>
                {pastList.map(t => <Row key={t.id} t={t} state="past" />)}
              </details>
            )}
          </div>
          <button className="agNav" onClick={() => setDayOff(x => x + 1)} aria-label="Hari berikutnya">›</button>
        </div>
        <div className="agDots">
          {[-2, -1, 0, 1, 2].map(o => <i key={o} className={o === dayOff ? 'on' : ''} onClick={() => setDayOff(o)} />)}
        </div>
      </section>

      <div className={'mottoBanner' + (night ? ' night' : '')}>
        <span className="mIco">{night ? <Deco.lotus width={22} /> : <Deco.compass width={22} />}</span>
        <div className="mTxt"><b>{banner[0]}</b><span>{banner[1]}</span></div>
        <span className="chev">›</span>
      </div>
    </>
  );
}
