import { greeting, mood, useClock, useSky } from '../sky';

// Animasi langit: matahari/awan/bulan+bintang, murni CSS
export default function SkyCard() {
  const sky = useSky();
  const clock = useClock(sky && sky.tzOffset !== 0 ? sky.tzOffset : undefined);
  if (!sky) return null;
  const night = sky.period === 'malam';
  const rain = sky.weather === 'hujan';
  const cloudy = sky.weather === 'berawan' || sky.weather === 'malam-berawan';
  const hhmm = `${String(clock.getHours()).padStart(2, '0')}.${String(clock.getMinutes()).padStart(2, '0')}`;

  return (
    <div className={'skyCard' + (night ? ' night' : '')}>
      {/* langit */}
      <div className="skyScene">
        {/* bintang (malam) */}
        {night && <div className="stars">{[...Array(14)].map((_, i) => <i key={i} className="star" style={{ left: `${(i * 37 + 13) % 96}%`, top: `${(i * 53 + 9) % 70}%`, animationDelay: `${i * .35}s` }} />)}</div>}
        {/* matahari / bulan */}
        <div className={night ? 'moon' : 'sun'}>{night ? '🌙' : '☀️'}</div>
        {/* awan */}
        {(cloudy || rain) && <>
          <div className="cloud c1">☁️</div>
          <div className="cloud c2">☁️</div>
          {rain && <div className="rain">{[...Array(6)].map((_, i) => <i key={i} style={{ left: `${15 + i * 14}%`, animationDelay: `${i * .3}s` }} />)}</div>}
        </>}
      </div>
      {/* teks */}
      <div className="skyText">
        <div className="skyGreet">{greeting(sky.period)}</div>
        <div className="skyInfo">sekarang jam <b>{hhmm}</b> {sky.temp ? Number.isNaN(sky.temp) ? '' : `· ${sky.city} ${Math.round(sky.temp)}°C` : `· ${sky.city}`}</div>
        <div className="skySub">Cuaca hari ini <b>{sky.weather === 'hujan' ? 'hujan' : sky.weather.includes('cerah') ? 'cerah' : 'berawan'}</b> {sky.forecast}.</div>
        <div className="skyMood">{mood(sky.period)}</div>
      </div>
    </div>
  );
}
