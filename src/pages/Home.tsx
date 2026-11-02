import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getKv } from '../db';
import { idr, today } from '../util';

export default function Home({ go }: { go: (t: string) => void }) {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) || [];
  const txs = useLiveQuery(() => db.txs.toArray(), []) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const trades = useLiveQuery(() => db.trades.toArray(), []) || [];
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

  const bal = accounts.reduce((s, a) => s + a.balance0, 0) + txs.reduce((s, t) => s + (t.type === 'in' ? t.amount : -t.amount), 0);
  const m = today().slice(0, 7);
  const real = txs.filter(t => t.date.startsWith(m) && t.category !== 'Transfer');
  const inc = real.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
  const out = real.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
  const todays = tasks.filter(t => t.repeat === 'none' ? t.date === today() && !t.done : t.repeat === 'daily');
  const invested = trades.reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <section className="hero" onClick={() => go('uang')}>
        <div className="mute">Total saldo</div>
        <div className="big">{idr(bal)}</div>
        <div className="chip">Bulan ini: <span className="pos">+{idr(inc)}</span> · <span className="neg">-{idr(out)}</span></div>
      </section>
      <section onClick={() => go('tugas')}>
        <h2>Hari ini</h2>
        {todays.length === 0 ? <div className="mute">Tidak ada tugas. Ketuk untuk menambah.</div>
          : todays.slice(0, 5).map(t => <div className="row" key={t.id}><span>{t.title}</span><span className="mute">{t.time}</span></div>)}
      </section>
      <section onClick={() => go('dca')}>
        <h2>Simulasi DCA</h2>
        {invested === 0 ? <div className="mute">Belum ada simulasi. Buat rencana DCA pertama.</div> : (
          <>
            <div className="big">{idr(value)}</div>
            <div className={value >= invested ? 'pos' : 'neg'}>
              {value >= invested ? '+' : ''}{(((value - invested) / invested) * 100).toFixed(2)}% dari modal {idr(invested)}
            </div>
          </>
        )}
      </section>
    </>
  );
}
