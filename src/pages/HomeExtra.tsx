import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Cell, Pie, PieChart } from 'recharts';
import { db, getKv } from '../db';
import { idr, today } from '../util';
import { useTheme } from '../theme';

const MKT = [
  { sym: 'BTCUSDT', t: 'BTC', label: 'Bitcoin', icon: '₿', c: '#f7931a' },
  { sym: 'ETHUSDT', t: 'ETH', label: 'Ethereum', icon: '◆', c: '#627eea' },
  { sym: 'SOLUSDT', t: 'SOL', label: 'Solana', icon: '◎', c: '#14f195' },
  { sym: 'PAXGUSDT', t: 'PAXG', label: 'Emas (PAXG)', icon: 'Au', c: '#d4af37' },
];

const cls = (sym: string) => sym.startsWith('yf:') ? 'Saham' : sym.includes('PAXG') || sym.includes('XAU') ? 'Emas' : 'Crypto';
const DONUT_C: Record<string, string> = { Crypto: '#f97316', Saham: '#3b82f6', Emas: '#22c55e' };

// Konten home yang dipindah dari bawah banner: agenda, portofolio, to-do, harga pasar
export default function HomeExtra({ go, theme }: { go: (t: string) => void; theme: string }) {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const trades = useLiveQuery(() => db.trades.toArray(), []) || [];
  const [mkt, setMkt] = useState<{ sym: string; price: number; chg: number }[]>([]);
  const [px, setPx] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      try {
        const syms = encodeURIComponent(JSON.stringify(MKT.map(m => m.sym)));
        const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${syms}`);
        if (r.ok) setMkt((await r.json()).map((t: any) => ({ sym: t.symbol, price: +t.lastPrice, chg: +t.priceChangePercent })));
      } catch { /* offline */ }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const qty: Record<string, number> = {};
      trades.forEach(t => (qty[t.symbol] = (qty[t.symbol] || 0) + t.qty));
      const o: Record<string, number> = {};
      for (const [s, q] of Object.entries(qty)) o[s] = q * (await getKv('px:' + s, 0));
      setPx(o);
    })();
  }, [trades.length]);

  const todays = tasks.filter(t => t.repeat === 'none' ? t.date === today() && !t.done : t.repeat === 'daily');
  const doneToday = tasks.filter(t => t.date === today() && t.done);
  const invested = trades.reduce((s, t) => s + t.amount, 0);
  const value = Object.values(px).reduce((s, v) => s + v, 0);
  const growth = invested > 0 ? ((value - invested) / invested) * 100 : null;
  const donut = useMemo(() => {
    const by: Record<string, number> = {};
    Object.entries(px).forEach(([s, v]) => (by[cls(s)] = (by[cls(s)] || 0) + v));
    const tot = Object.values(by).reduce((s, v) => s + v, 0);
    return Object.entries(by).map(([k, v]) => ({ name: k, value: v, pct: tot ? Math.round((v / tot) * 100) : 0 })).filter(d => d.value > 0);
  }, [px]);

  return (
    <>
      <section onClick={() => go('tugas')}>
        <h2>Agenda Hari Ini</h2>
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
