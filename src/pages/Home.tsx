import { useEffect, useState } from 'react';
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
  const [spark, setSpark] = useState<number[]>([]);

  useEffect(() => {
    (async () => {
      const H = cfg.binanceKey ? { 'X-MBX-APIKEY': cfg.binanceKey } : undefined;
      try {
        const syms = encodeURIComponent(JSON.stringify(MKT.map(m => m.sym)));
        const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${syms}`, { headers: H });
        if (r.ok) setMkt((await r.json()).map((t: any) => ({ sym: t.symbol, price: +t.lastPrice, chg: +t.priceChangePercent })));
      } catch { /* offline */ }
      try {
        const r = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24', { headers: H });
        if (r.ok) setSpark((await r.json()).map((k: any[]) => +k[4]));
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

  // sparkline SVG dari 24 jam BTC (data nyata)
  const min = Math.min(...spark), max = Math.max(...spark);
  const pts = spark.length > 1
    ? spark.map((v, i) => `${(i / (spark.length - 1)) * 100},${34 - ((v - min) / (max - min || 1)) * 30}`).join(' ')
    : '';

  return (
    <>
      {/* Kartu hero: total aset + grafik + pertumbuhan */}
      <section className="hero" onClick={() => go('uang')}>
        <div className="mute">Halo, {name} 👋</div>
        <div className="big">{idr(bal)}</div>
        {pts && (
          <svg className="spark" viewBox="0 0 100 36" preserveAspectRatio="none">
            <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".85" />
          </svg>
        )}
        {growth !== null ? (
          <div className="chip">▲ {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% · modal {idr(invested)}</div>
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

      {/* Ringkasan bulan ini */}
      <div className="stats">
        <div className="stat"><span className="mute">Pemasukan</span><b className="pos">+{idr(inc)}</b></div>
        <div className="stat"><span className="mute">Pengeluaran</span><b className="neg">-{idr(out)}</b></div>
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
