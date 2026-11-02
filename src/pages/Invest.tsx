import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ASSETS, label, latest } from '../market';
import { runAll } from '../dca';
import { idr, num, today } from '../util';

const PRESET = [1000, 10000, 100000, 1000000, 100000000, 1000000000];
const short = (n: number) => (n >= 1e9 ? n / 1e9 + ' M' : n >= 1e6 ? n / 1e6 + ' jt' : n / 1e3 + ' rb');

export default function Invest() {
  const plans = useLiveQuery(() => db.plans.toArray(), []) || [];
  const trades = useLiveQuery(() => db.trades.toArray(), []) || [];
  const [px, setPx] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState('');
  const [name, setName] = useState('DCA harian');
  const [daily, setDaily] = useState('10000');
  const [start, setStart] = useState(today());
  const [pct, setPct] = useState<Record<string, string>>({ 'bn:BTCUSDT': '50', 'bn:PAXGUSDT': '30', 'yf:BBCA.JK': '20' });
  const [custom, setCustom] = useState('');

  const syms = [...new Set(trades.map(t => t.symbol))];
  useEffect(() => { (async () => { const o: Record<string, number> = {}; for (const s of syms) o[s] = await latest(s); setPx(o); })(); }, [syms.join(',')]);

  const total = Object.values(pct).reduce((s, v) => s + num(v), 0);
  const d = Math.min(1e9, Math.max(1000, num(daily)));

  const create = async () => {
    if (total !== 100) return setMsg('Total alokasi harus 100%.');
    const alloc: Record<string, number> = {};
    Object.entries(pct).forEach(([k, v]) => { if (num(v) > 0) alloc[k] = num(v); });
    await db.plans.add({ name, daily: d, startDate: start, lastRun: '', alloc, active: true });
    setMsg('Menyinkronkan harga…');
    setMsg(await runAll());
  };
  const remove = async (id: number) => { await db.trades.where('planId').equals(id).delete(); await db.plans.delete(id); };

  return (
    <>
      <section>
        <div className="mute">Ini simulasi dengan harga pasar sungguhan. Tidak ada uang asli yang dipakai atau diinvestasikan.</div>
        <button className="btn alt" onClick={async () => { setMsg('Menyinkronkan…'); setMsg(await runAll()); }}>Sinkron sekarang</button>
        {msg && <div className="tag">{msg}</div>}
      </section>

      {plans.map(p => {
        const tr = trades.filter(t => t.planId === p.id);
        const by: Record<string, { q: number; c: number }> = {};
        tr.forEach(t => { by[t.symbol] = { q: (by[t.symbol]?.q || 0) + t.qty, c: (by[t.symbol]?.c || 0) + t.amount }; });
        const inv = tr.reduce((s, t) => s + t.amount, 0);
        const val = Object.entries(by).reduce((s, [k, v]) => s + v.q * (px[k] || 0), 0);
        const pl = val - inv;
        return (
          <section key={p.id}>
            <div className="row" style={{ border: 0 }}><h2>{p.name}</h2><span className="mute">{idr(p.daily)}/hari · sejak {p.startDate}</span></div>
            <div className="big">{idr(val)}</div>
            <div className={pl >= 0 ? 'pos' : 'neg'}>{pl >= 0 ? '+' : ''}{idr(pl)} ({inv ? ((pl / inv) * 100).toFixed(2) : '0.00'}%)</div>
            <div className="mute">Modal {idr(inv)} · {tr.length} pembelian</div>
            {Object.entries(by).map(([k, v]) => (
              <div className="row" key={k}>
                <div>{label(k)}<div className="tag">rata-rata {idr(v.c / v.q)}</div></div>
                <div style={{ textAlign: 'right' }}><b>{idr(v.q * (px[k] || 0))}</b><div className="tag">{v.q.toPrecision(5)} unit</div></div>
              </div>
            ))}
            <div className="g2">
              <button className="btn alt" onClick={() => db.plans.update(p.id!, { active: !p.active })}>{p.active ? 'Jeda' : 'Lanjutkan'}</button>
              <button className="btn alt" onClick={() => remove(p.id!)}>Hapus</button>
            </div>
          </section>
        );
      })}

      <section>
        <h2>Rencana DCA baru</h2>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama rencana" />
        <input inputMode="numeric" value={daily} onChange={e => setDaily(e.target.value)} placeholder="Dana per hari (Rp 1 rb – 1 M)" />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PRESET.map(n => <button key={n} className="btn alt" style={{ width: 'auto', padding: '6px 10px' }} onClick={() => setDaily(String(n))}>{short(n)}</button>)}
        </div>
        <div className="tag">Mulai dari tanggal (pilih tanggal lampau untuk backtest)</div>
        <input type="date" value={start} max={today()} onChange={e => setStart(e.target.value)} />
        <h2 style={{ marginTop: 12 }}>Alokasi (%)</h2>
        {[...ASSETS.map(a => a.id), ...Object.keys(pct).filter(k => !ASSETS.some(a => a.id === k))].map(id => (
          <div className="row" key={id}><span>{label(id)}</span><input style={{ width: 80 }} inputMode="numeric" value={pct[id] || ''} onChange={e => setPct({ ...pct, [id]: e.target.value })} /></div>
        ))}
        <div className="g2">
          <input placeholder="Aset lain, mis. bn:XRPUSDT" value={custom} onChange={e => setCustom(e.target.value)} />
          <button className="btn alt" onClick={() => { if (/^(bn|yf):.+/.test(custom)) { setPct({ ...pct, [custom]: '0' }); setCustom(''); } }}>Tambah aset</button>
        </div>
        <div className={total === 100 ? 'pos' : 'neg'}>Total {total}% · {idr(d)} per hari</div>
        <button className="btn" onClick={create}>Mulai simulasi</button>
        <div className="tag">bn: = Binance (USDT), yf: = Yahoo Finance (saham IDX berakhiran .JK). Akhir pekan/libur bursa dilewati.</div>
      </section>
    </>
  );
}
