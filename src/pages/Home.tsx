import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getKv } from '../db';
import { idr, today } from '../util';
import { loadCfg } from '../ai';

const QUICK = [
  { go: 'uang', icon: '💸', label: 'Catat Keuangan', c: '#3b82f6' },
  { go: 'tugas', icon: '✅', label: 'To Do List', c: '#22c55e' },
  { go: 'dca', icon: '📈', label: 'Investasi DCA', c: '#f59e0b' },
  { go: 'ai', icon: '🤖', label: 'AI Chat', c: '#a855f7' },
];
const MKT = [
  { sym: 'BTCUSDT', label: 'Bitcoin', icon: '₿', c: '#f7931a' },
  { sym: 'ETHUSDT', label: 'Ethereum', icon: '◆', c: '#627eea' },
  { sym: 'SOLUSDT', label: 'Solana', icon: '◎', c: '#14f195' },
  { sym: 'PAXGUSDT', label: 'Emas (PAXG)', icon: 'Au', c: '#d4af37' },
];

export default function Home({ go }: { go: (t: string) => void }) {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) || [];
  const txs = useLiveQuery(() => db.txs.toArray(), []) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const trades = useLiveQuery(() => db.trades.toArray(), []) || [];
  const cfg = loadCfg();
  const name = cfg.name || 'Soni';

  const [mkt, setMkt] = useState<{ sym: string; price: number; chg: number }[]>([]);
  const [m30, setM30] = useState<number[]>([]);
  const [hide, setHide] = useState(false);
  const [hi, setHi] = useState(-1);

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
  const todays = tasks.filter(t => t.repeat === 'none' ? t.date === today() && !t.done : t.repeat === 'daily').slice(0, 4);
  const invested = trades.reduce((s, t) => s + t.amount, 0);

  // nilai portofolio DCA sekarang
  const [value, setValue] = useState(0);
  useEffect(() => {
    (async () => {
      const qty: Record<string, number> = {};
      trades.forEach(t => (qty[t.symbol] = (qty[t.symbol] || 0) + t.qty));
      let v = 0;
      for (const [s, q] of Object.entries(qty)) v += q * (await getKv('px:' + s, 0));
      setValue(v);
    })();
  }, [trades.length]);
  const growth = invested > 0 ? ((value - invested) / invested) * 100 : null;

  // ── grafik area 30 hari BTC interaktif (hover/tap) ──
  const pts = useMemo(() => m30.length > 1
    ? m30.map((v, i) => [(i / (m30.length - 1)) * 100, 34 - ((v - Math.min(...m30)) / (Math.max(...m30) - Math.min(...m30) || 1)) * 30])
    : [], [m30]);
  const line = pts.map(p => p.map(n => +n.toFixed(2)).join(',')).join(' ');

  // tren pengeluaran 7 hari terakhir (mini bar)
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
  const weekOut = days7.reduce((s, v) => s + v, 0);

  const mask = (s: string) => hide ? '••••••' : s;

  return (
    <>
      {/* Kartu hero: total aset + grafik 30 hari + pertumbuhan */}
      <section className="hero" onClick={() => go('uang')}>
        <div className="heroTop">
          <div>
            <div className="mute">Halo, {name} 👋</div>
            <div className="big">{mask(idr(bal))}</div>
          </div>
          <button className="eye" onClick={e => { e.stopPropagation(); setHide(!hide); }}>{hide ? '🙈' : '👁️'}</button>
        </div>
        {pts.length > 1 && (
          <svg className="spark" viewBox="0 0 100 36" preserveAspectRatio="none"
            onMouseMove={e => {
              const r = (e.currentTarget as SVGElement).getBoundingClientRect();
              setHi(Math.min(m30.length - 1, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * (m30.length - 1)))));
            }}
            onMouseLeave={() => setHi(-1)}>
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
        )}
        {hi >= 0 && m30[hi] != null && <div className="heroTip">BTC · {m30.length - hi - 1} hari lalu: USD {Math.round(m30[hi]).toLocaleString('en-US')}</div>}
        {growth !== null ? (
          <div className="chip">▲ {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% · modal {mask(idr(invested))}</div>
        ) : (
          <div className="chip">Bulan ini: <span className="pos">+{idr(inc)}</span> · <span className="neg">-{idr(out)}</span></div>
        )}
      </section>

      {/* 4 aksi cepat */}
      <div className="quick">
        {QUICK.map(q => (
          <button key={q.go} className="tile" onClick={() => go(q.go)}>
            <span className="ticon" style={{ background: q.c + '22', color: q.c }}>{q.icon}</span>
            <span className="tlabel">{q.label}</span>
          </button>
        ))}
      </div>

      {/* Ringkasan: bulan ini + mini bar 7 hari */}
      <div className="stats">
        <div className="stat"><span className="mute">Pemasukan bulan ini</span><b className="pos">+{idr(inc)}</b></div>
        <div className="stat">
          <span className="mute">Pengeluaran 7 hari</span>
          <b className="neg">-{idr(weekOut)}</b>
          <div className="minibar">
            {days7.map((v, i) => <i key={i} style={{ height: Math.max(8, (v / spendMax) * 100) + '%' }} className={i === 6 ? 'now' : ''} />)}
          </div>
        </div>
      </div>

      {/* Agenda hari ini */}
      <section onClick={() => go('tugas')}>
        <h2>Hari ini</h2>
        {todays.length === 0 ? <div className="mute">Tidak ada agenda. Ketuk untuk menambah.</div>
          : todays.map(t => (
            <div className="row" key={t.id}>
              <span><span className="adot" />{t.title}</span>
              <span className="mute">{t.time}</span>
            </div>
          ))}
      </section>

      {/* Harga pasar live */}
      <section>
        <h2>Pasar</h2>
        {mkt.length === 0 && <div className="mute">Memuat harga pasar…</div>}
        {mkt.map(t => {
          const info = MKT.find(x => x.sym === t.sym)!;
          return (
            <div className="row mkt" key={t.sym}>
              <span className="mcoin" style={{ background: info.c + '22', color: info.c }}>{info.icon}</span>
              <div style={{ flex: 1 }}><div>{info.label}</div><div className="tag">USD {t.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div></div>
              <span className={'pill ' + (t.chg >= 0 ? 'pos' : 'neg')}>{t.chg >= 0 ? '+' : ''}{t.chg.toFixed(1)}%</span>
            </div>
          );
        })}
      </section>
    </>
  );
}
