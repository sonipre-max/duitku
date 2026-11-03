import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Cell, Pie, PieChart } from 'recharts';
import { db, getKv } from '../db';
import { idr, today } from '../util';
import { loadCfg } from '../ai';
import { useTheme } from '../theme';
import SkyCard from './SkyCard';

const QUICK = [
  { go: 'uang', icon: '💸', label: 'Catat Keuangan', short: 'Keuangan', c: '#3b82f6' },
  { go: 'tugas', icon: '✅', label: 'To Do List', short: 'To Do', c: '#22c55e' },
  { go: 'dca', icon: '📈', label: 'Investasi DCA', short: 'Investasi', c: '#f59e0b' },
  { go: 'ai', icon: '🤖', label: 'AI Assistant', short: 'AI', c: '#a855f7' },
];
const MKT = [
  { sym: 'BTCUSDT', t: 'BTC', label: 'Bitcoin', icon: '₿', c: '#f7931a' },
  { sym: 'ETHUSDT', t: 'ETH', label: 'Ethereum', icon: '◆', c: '#627eea' },
  { sym: 'SOLUSDT', t: 'SOL', label: 'Solana', icon: '◎', c: '#14f195' },
  { sym: 'PAXGUSDT', t: 'PAXG', label: 'Emas (PAXG)', icon: 'Au', c: '#d4af37' },
];

// klasifikasi aset DCA utk donut portofolio
const cls = (sym: string) => sym.startsWith('yf:') ? 'Saham' : sym.includes('PAXG') || sym.includes('XAU') ? 'Emas' : 'Crypto';
const DONUT_C: Record<string, string> = { Crypto: '#f97316', Saham: '#3b82f6', Emas: '#22c55e' };

const kFmt = (n: number) => n >= 1000 ? '$' + (n / 1000).toFixed(1) + 'K' : '$' + n.toFixed(1);

export default function Home({ go }: { go: (t: string) => void }) {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) || [];
  const txs = useLiveQuery(() => db.txs.toArray(), []) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const trades = useLiveQuery(() => db.trades.toArray(), []) || [];
  const cfg = loadCfg();
  const name = cfg.name || 'Soni';
  const theme = useTheme();

  const [mkt, setMkt] = useState<{ sym: string; price: number; chg: number }[]>([]);
  const [m30, setM30] = useState<number[]>([]);
  const [hide, setHide] = useState(false);
  const [hi, setHi] = useState(-1);
  const [px, setPx] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      try {
        const syms = encodeURIComponent(JSON.stringify(MKT.map(m => m.sym)));
        const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${syms}`);
        if (r.ok) setMkt((await r.json()).map((t: any) => ({ sym: t.symbol, price: +t.lastPrice, chg: +t.priceChangePercent })));
      } catch { /* offline */ }
      try {
        const r = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=30');
        if (r.ok) setM30((await r.json()).map((k: any[]) => +k[4]));
      } catch { /* offline */ }
    })();
  }, []);

  const bal = accounts.reduce((s, a) => s + a.balance0, 0) + txs.reduce((s, t) => s + (t.type === 'in' ? t.amount : -t.amount), 0);
  const m = today().slice(0, 7);
  const real = txs.filter(t => t.date.startsWith(m) && t.category !== 'Transfer');
  const inc = real.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
  const out = real.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
  const net = inc - out;
  const todays = tasks.filter(t => t.repeat === 'none' ? t.date === today() && !t.done : t.repeat === 'daily');
  const doneToday = tasks.filter(t => t.date === today() && t.done);
  const invested = trades.reduce((s, t) => s + t.amount, 0);

  // portofolio: nilai per aset + alokasi per kelas
  useEffect(() => {
    (async () => {
      const qty: Record<string, number> = {};
      trades.forEach(t => (qty[t.symbol] = (qty[t.symbol] || 0) + t.qty));
      const o: Record<string, number> = {};
      for (const [s, q] of Object.entries(qty)) o[s] = q * (await getKv('px:' + s, 0));
      setPx(o);
    })();
  }, [trades.length]);
  const value = Object.values(px).reduce((s, v) => s + v, 0);
  const growth = invested > 0 ? ((value - invested) / invested) * 100 : null;
  const donut = useMemo(() => {
    const by: Record<string, number> = {};
    Object.entries(px).forEach(([s, v]) => (by[cls(s)] = (by[cls(s)] || 0) + v));
    const tot = Object.values(by).reduce((s, v) => s + v, 0);
    return Object.entries(by).map(([k, v]) => ({ name: k, value: v, pct: tot ? Math.round((v / tot) * 100) : 0 })).filter(d => d.value > 0);
  }, [px]);

  // grafik 30 hari
  const pts = useMemo(() => m30.length > 1
    ? m30.map((v, i) => [(i / (m30.length - 1)) * 100, 34 - ((v - Math.min(...m30)) / (Math.max(...m30) - Math.min(...m30) || 1)) * 30])
    : [], [m30]);
  const line = pts.map(p => p.map(n => +n.toFixed(2)).join(',')).join(' ');

  // pengeluaran 7 hari
  const days7 = useMemo(() => {
    const arr: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      arr.push(txs.filter(t => t.date === k && t.type === 'out' && t.category !== 'Transfer').reduce((s, t) => s + t.amount, 0));
    }
    return arr;
  }, [txs.length]);
  const spendMax = Math.max(...days7, 1);
  const mask = (s: string) => hide ? '••••••' : s;
  const heroLabel = theme === 'gold' ? 'Total Kekayaan' : theme === 'light' ? 'Total Keuangan' : 'Total Aset';

  const HeroTitle = (
    <div className="heroTop">
      <div>
        <div className="mute">{heroLabel}</div>
        <div className="big">{mask(idr(bal))}</div>
        {growth !== null && <div className={'chip ' + (growth >= 0 ? 'pos' : 'neg')}>▲ {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%</div>}
      </div>
      <button className="eye" onClick={e => { e.stopPropagation(); setHide(!hide); }}>{hide ? '🙈' : '👁️'}</button>
    </div>
  );

  const HeroChart = pts.length > 1 && (
    <svg className="spark" viewBox="0 0 100 36" preserveAspectRatio="none"
      onMouseMove={e => {
        const r = (e.currentTarget as SVGElement).getBoundingClientRect();
        setHi(Math.min(m30.length - 1, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * (m30.length - 1)))));
      }}
      onMouseLeave={() => setHi(-1)}
      onTouchStart={e => {
        const r = (e.currentTarget as SVGElement).getBoundingClientRect();
        setHi(Math.min(m30.length - 1, Math.max(0, Math.round(((e.touches[0].clientX - r.left) / r.width) * (m30.length - 1)))));
      }}
      onTouchMove={e => {
        const r = (e.currentTarget as SVGElement).getBoundingClientRect();
        setHi(Math.min(m30.length - 1, Math.max(0, Math.round(((e.touches[0].clientX - r.left) / r.width) * (m30.length - 1)))));
      }}
      onTouchEnd={() => setHi(-1)}>
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity=".35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,36 ${line} 100,36`} fill="url(#hg)" />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.4" />
      {hi >= 0 && <>
        <line x1={pts[hi][0]} y1="0" x2={pts[hi][0]} y2="36" stroke="currentColor" strokeWidth=".3" opacity=".6" />
        <circle cx={pts[hi][0]} cy={pts[hi][1]} r="1.6" fill="currentColor" />
      </>}
    </svg>
  );

  const tipDate = hi >= 0 && m30.length ? (() => {
    const d = new Date(); d.setDate(d.getDate() - (m30.length - 1 - hi));
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  })() : '';
  const tipPrice = hi >= 0 ? '$' + m30[hi].toLocaleString('en-US', { maximumFractionDigits: 0 }) : '';

  const QuickRow = ({ short }: { short?: boolean }) => (
    <div className="quick">
      {QUICK.map(q => (
        <button key={q.go} className="tile" onClick={() => go(q.go)}>
          <span className="ticon" style={{ background: q.c + '22', color: q.c }}>{q.icon}</span>
          <span className="tlabel">{short ? q.short : q.label}</span>
        </button>
      ))}
    </div>
  );

  /* ═══ CYBER: kartu market 3 kolom + quick access grid ═══ */
  if (theme === 'cyber') {
    return (
      <>
        <section className="hero">
          <div className="mute">Welcome Back, 👑</div>
          <div className="big" style={{ fontSize: 24 }}>{name}!</div>
          <div className="tag" style={{ color: 'inherit', opacity: .8 }}>Dream Big, Invest Bigger</div>
          {HeroTitle}
          {HeroChart}
          {hi >= 0 && <div className="sparkTip" style={{ left: pts[hi][0] + '%' }}>{tipPrice} · {tipDate}</div>}
          {growth !== null && <div className="chip">↗ {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%</div>}
        </section>
        <QuickRow short />
        <section>
          <h2>Market Overview</h2>
          <div className="cyberGrid">
            {MKT.slice(0, 3).map(info => {
              const t = mkt.find(x => x.sym === info.sym);
              return (
                <div className="ccard" key={info.sym}>
                  <span className="mcoin" style={{ background: info.c + '22', color: info.c }}>{info.icon}</span>
                  <b>{info.t}</b>
                  <span className="tag">{t ? kFmt(t.price) : '…'}</span>
                  <span className={'pill ' + ((t?.chg ?? 0) >= 0 ? 'pos' : 'neg')}>{t ? (t.chg >= 0 ? '▲ +' : '▼ ') + t.chg.toFixed(1) + '%' : ''}</span>
                </div>
              );
            })}
          </div>
        </section>
        <section>
          <h2>Quick Access</h2>
          <div className="g2">
            <button className="btn alt" onClick={() => go('tugas')}>📅 Kalender</button>
            <button className="btn alt" onClick={() => go('ai')}>🤖 Analisis AI</button>
            <button className="btn alt" onClick={() => go('uang')}>💸 Keuangan</button>
            <button className="btn alt" onClick={() => go('dca')}>📊 Portofolio</button>
          </div>
        </section>
      </>
    );
  }

  /* ═══ GOLD: pertumbuhan + pill rentang + kalender + banner DCA ═══ */
  if (theme === 'gold') {
    const d = new Date();
    return (
      <>
        <section className="hero">
          {HeroTitle}
          {HeroChart}
          {hi >= 0 && <div className="sparkTip" style={{ left: pts[hi][0] + '%' }}>{tipPrice} · {tipDate}</div>}
          {growth === null && <div className="chip">Bulan ini: <span className="pos">+{idr(inc)}</span> · <span className="neg">-{idr(out)}</span></div>}
        </section>
        <QuickRow short />
        <section>
          <h2>Pertumbuhan Portofolio</h2>
          {value > 0 && growth !== null ? <div className="big pos">+{growth.toFixed(1)}%</div> : <div className="mute">Belum ada portofolio aktif.</div>}
          <div className="tag">Nilai kini {idr(value)} dari modal {idr(invested)}</div>
          <div className="pills">
            {['1D', '1W', '1M', '3M', '1Y'].map(p => <span key={p} className={'tpill' + (p === '1M' ? ' on' : '')}>{p}</span>)}
          </div>
          <div className="minibar" style={{ height: 44 }}>
            {days7.map((v, i) => <i key={i} style={{ height: v > 0 ? Math.max(8, (v / spendMax) * 100) + '%' : '4px', opacity: v > 0 ? 1 : .3 }} className={i === 6 ? 'now' : ''} />)}
          </div>
        </section>
        <section onClick={() => go('tugas')}>
          <h2>Kalender & To Do</h2>
          <div className="dateblock">
            <b>{d.getDate()}</b>
            <span>{d.toLocaleDateString('id-ID', { month: 'short' })}</span>
            <span>{d.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
          </div>
          {todays.length === 0 && doneToday.length === 0 ? <div className="mute">Tidak ada agenda hari ini.</div>
            : [...todays.slice(0, 3).map(t => ({ id: t.id, title: t.title, time: t.time, done: false })),
               ...doneToday.slice(0, 2).map(t => ({ id: t.id, title: t.title, time: t.time, done: true }))]
              .map(t => (
                <div className="row" key={t.id}><span><span className={'abox' + (t.done ? ' ok' : '')}>{t.done ? '✓' : ''}</span>{t.title}</span><span className="mute">{t.time}</span></div>
              ))}
        </section>
        <section className="banner" onClick={() => go('dca')}>
          <div>⭐ <b>Investasi DCA Otomatis</b><div className="tag">Bangun aset masa depan, setiap hari!</div></div>
          <span className="chev">›</span>
        </section>
      </>
    );
  }

  /* ═══ DARK PRO & LIGHT: donut portofolio + ringkasan 3 stat ═══ */
  return (
    <>
      {theme === 'light' && false && (
        <div className="hello">
          <div>
            <b>Halo, {name} 👋</b>
            <div className="tag">Semangat hari ini!</div>
          </div>
          <div className="wchip">☀️ 28°C · Denpasar</div>
        </div>
      )}
      <SkyCard />
      <section className="hero">
        {HeroTitle}
        {HeroChart}
        {hi >= 0 && <div className="sparkTip" style={{ left: pts[hi][0] + '%' }}>{tipPrice} · {tipDate}</div>}
        {growth === null && <div className="chip">Bulan ini: <span className="pos">+{idr(inc)}</span> · <span className="neg">-{idr(out)}</span></div>}
        </section>

        <QuickRow />

      <section>
        <h2>Ringkasan Hari Ini</h2>
        <div className="stats three">
          <div className="stat"><b className="pos">+{idr(inc)}</b><span className="mute">Pemasukan</span></div>
          <div className="stat"><b className="neg">-{idr(out)}</b><span className="mute">Pengeluaran</span></div>
          <div className="stat"><b className={net >= 0 ? 'pos' : 'neg'}>{net >= 0 ? '+' : '-'}{idr(Math.abs(net))}</b><span className="mute">Saldo Bersih</span></div>
        </div>
        <div className="minibar">
          {days7.map((v, i) => <i key={i} style={{ height: v > 0 ? Math.max(8, (v / spendMax) * 100) + '%' : '4px', opacity: v > 0 ? 1 : .3 }} className={i === 6 ? 'now' : ''} />)}
        </div>
      </section>

      <section onClick={() => go('dca')}>
        <h2>Portofolio Investasi</h2>
        {donut.length === 0 ? <div className="mute">Belum ada investasi. Mulai rencana DCA pertama.</div> : (
          <div className="donutWrap">
            <PieChart width={150} height={140}>
              <Pie data={donut} dataKey="value" nameKey="name" outerRadius={62} innerRadius={34} paddingAngle={3} strokeWidth={0}>
                {donut.map((d, i) => <Cell key={i} fill={DONUT_C[d.name] || '#888'} />)}
              </Pie>
            </PieChart>
            <div className="legend">
              {growth !== null && <div className="big pos">+{growth.toFixed(1)}%</div>}
              <div className="tag">7 hari · nilai {idr(value)}</div>
              {donut.map(d => (
                <div className="lgrow" key={d.name}><span className="ldot" style={{ background: DONUT_C[d.name] }} />{d.name} <b>{d.pct}%</b></div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section onClick={() => go('tugas')}>
        <h2>To Do Hari Ini {doneToday.length}/{todays.length + doneToday.length}</h2>
        {todays.length === 0 && doneToday.length === 0 ? <div className="mute">Tidak ada agenda. Ketuk untuk menambah.</div>
          : [...todays.slice(0, 4).map(t => ({ id: t.id, title: t.title, time: t.time, done: false })),
             ...doneToday.slice(0, 2).map(t => ({ id: t.id, title: t.title, time: t.time, done: true }))]
            .map(t => (
              <div className="row" key={t.id}>
                <span><span className={'abox' + (t.done ? ' ok' : '')}>{t.done ? '✓' : ''}</span>{t.title}</span>
                <span className="mute">{t.time}</span>
              </div>
            ))}
      </section>

      <section>
        <h2>Harga Pasar</h2>
        {mkt.length === 0 && <div className="mute">Memuat harga pasar…</div>}
        {mkt.slice(0, theme === 'light' ? 2 : 4).map(t => {
          const info = MKT.find(x => x.sym === t.sym)!;
          return (
            <div className="row mkt" key={t.sym}>
              <span className="mcoin" style={{ background: info.c + '22', color: info.c }}>{info.icon}</span>
              <div style={{ flex: 1 }}><div>{info.label}</div><div className="tag">{info.t} · USD</div></div>
              <div style={{ textAlign: 'right' }}>
                <b>{t.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</b>
                <div className={'tag ' + (t.chg >= 0 ? 'pos' : 'neg')}>{t.chg >= 0 ? '▲ +' : '▼ '}{t.chg.toFixed(1)}%</div>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
