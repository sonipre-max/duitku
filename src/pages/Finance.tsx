import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import { db } from '../db';
import { idr, num, saveFile, today } from '../util';
import HomeExtra from './HomeExtra';

const OUT = ['Makan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya'];
const IN = ['Gaji', 'Bonus', 'Usaha', 'Investasi', 'Lainnya'];
const COL = ['#0e6b5c', '#b8862b', '#3f7cac', '#b3392f', '#7a5195', '#5f9e6e', '#d08c60', '#6b7b8c'];

export default function Finance() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) || [];
  const txs = useLiveQuery(() => db.txs.orderBy('date').reverse().toArray(), []) || [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) || [];
  const [f, setF] = useState({ type: 'out', amount: '', category: 'Makan', accountId: 0, toId: 0, note: '', date: today() });
  const [acc, setAcc] = useState({ name: '', balance0: '' });
  const [bd, setBd] = useState({ category: 'Makan', limit: '' });
  useEffect(() => { if (accounts.length && !f.accountId) setF(x => ({ ...x, accountId: accounts[0].id!, toId: accounts[0].id! })); }, [accounts.length]);

  const bal = (id: number) => accounts.find(a => a.id === id)!.balance0 +
    txs.filter(t => t.accountId === id).reduce((s, t) => s + (t.type === 'in' ? t.amount : -t.amount), 0);
  const m = today().slice(0, 7);
  const spent: Record<string, number> = {};
  txs.filter(t => t.date.startsWith(m) && t.type === 'out' && t.category !== 'Transfer')
    .forEach(t => (spent[t.category] = (spent[t.category] || 0) + t.amount));
  const pie = Object.entries(spent).map(([name, value]) => ({ name, value }));

  const add = async () => {
    const amount = num(f.amount);
    if (!amount) return;
    if (f.type === 'tf') {
      if (f.accountId === f.toId) return;
      await db.txs.bulkAdd([
        { date: f.date, type: 'out', amount, category: 'Transfer', accountId: f.accountId, note: f.note || 'Transfer keluar' },
        { date: f.date, type: 'in', amount, category: 'Transfer', accountId: f.toId, note: f.note || 'Transfer masuk' }
      ]);
    } else await db.txs.add({ date: f.date, type: f.type as 'in' | 'out', amount, category: f.category, accountId: f.accountId, note: f.note });
    setF({ ...f, amount: '', note: '' });
  };
  const csv = () => saveFile('transaksi.csv', 'tanggal,jenis,jumlah,kategori,akun,catatan\n' +
    txs.map(t => [t.date, t.type, t.amount, t.category, accounts.find(a => a.id === t.accountId)?.name, `"${t.note.replace(/"/g, '""')}"`].join(',')).join('\n'));

  return (
    <>
      <HomeExtra go={() => {}} theme="light" />
      <section>
        <h2>Rekening</h2>
        {accounts.map(a => <div className="row" key={a.id}><span>{a.name}</span><b>{idr(bal(a.id!))}</b></div>)}
        <div className="g2">
          <input placeholder="Nama rekening" value={acc.name} onChange={e => setAcc({ ...acc, name: e.target.value })} />
          <input placeholder="Saldo awal" inputMode="numeric" value={acc.balance0} onChange={e => setAcc({ ...acc, balance0: e.target.value })} />
        </div>
        <button className="btn alt" onClick={async () => { if (acc.name) { await db.accounts.add({ name: acc.name, balance0: num(acc.balance0) }); setAcc({ name: '', balance0: '' }); } }}>Tambah rekening</button>
      </section>

      <section>
        <h2>Catat transaksi</h2>
        <div className="g2">
          <select value={f.type} onChange={e => setF({ ...f, type: e.target.value, category: e.target.value === 'in' ? IN[0] : OUT[0] })}>
            <option value="out">Pengeluaran</option><option value="in">Pemasukan</option><option value="tf">Transfer</option>
          </select>
          <input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
        </div>
        <input placeholder="Jumlah (Rp)" inputMode="numeric" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
        {f.type !== 'tf' && (
          <select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>
            {(f.type === 'in' ? IN : OUT).map(c => <option key={c}>{c}</option>)}
          </select>
        )}
        <div className="g2">
          <select value={f.accountId} onChange={e => setF({ ...f, accountId: +e.target.value })}>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          {f.type === 'tf' && <select value={f.toId} onChange={e => setF({ ...f, toId: +e.target.value })}>{accounts.map(a => <option key={a.id} value={a.id}>ke {a.name}</option>)}</select>}
        </div>
        <input placeholder="Catatan" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
        <button className="btn" onClick={add}>Simpan transaksi</button>
      </section>

      {pie.length > 0 && (
        <section>
          <h2>Pengeluaran bulan ini</h2>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PieChart width={220} height={200}>
              <Pie data={pie} dataKey="value" nameKey="name" outerRadius={85} innerRadius={45}>{pie.map((_, i) => <Cell key={i} fill={COL[i % COL.length]} />)}</Pie>
              <Tooltip formatter={(v: number) => idr(v)} />
            </PieChart>
          </div>
          {pie.map((p, i) => <div className="row" key={p.name}><span style={{ color: COL[i % COL.length] }}>● {p.name}</span><b>{idr(p.value)}</b></div>)}
        </section>
      )}

      <section>
        <h2>Anggaran bulanan</h2>
        {budgets.length === 0 && <div className="mute">Belum ada anggaran. Tetapkan batas per kategori.</div>}
        {budgets.map(b => {
          const s = spent[b.category] || 0, p = Math.min(100, (s / b.limit) * 100);
          return (
            <div key={b.id} style={{ marginBottom: 10 }}>
              <div className="row" style={{ border: 0, padding: '4px 0' }}>
                <span>{b.category}</span><span className={s > b.limit ? 'neg' : 'mute'}>{idr(s)} / {idr(b.limit)}</span>
                <button className="link" onClick={() => db.budgets.delete(b.id!)}>Hapus</button>
              </div>
              <div className="bar"><i className={s > b.limit ? 'over' : ''} style={{ width: p + '%' }} /></div>
            </div>
          );
        })}
        <div className="g2">
          <select value={bd.category} onChange={e => setBd({ ...bd, category: e.target.value })}>{OUT.map(c => <option key={c}>{c}</option>)}</select>
          <input placeholder="Batas (Rp)" inputMode="numeric" value={bd.limit} onChange={e => setBd({ ...bd, limit: e.target.value })} />
        </div>
        <button className="btn alt" onClick={async () => { if (num(bd.limit)) { await db.budgets.add({ category: bd.category, limit: num(bd.limit) }); setBd({ ...bd, limit: '' }); } }}>Simpan anggaran</button>
      </section>

      <section>
        <h2>Riwayat</h2>
        {txs.length === 0 && <div className="mute">Belum ada transaksi.</div>}
        {txs.slice(0, 40).map(t => (
          <div className="row" key={t.id}>
            <div><div>{t.category}{t.note ? ` · ${t.note}` : ''}</div><div className="tag">{t.date} · {accounts.find(a => a.id === t.accountId)?.name}</div></div>
            <div style={{ textAlign: 'right' }}><b className={t.type === 'in' ? 'pos' : 'neg'}>{t.type === 'in' ? '+' : '-'}{idr(t.amount)}</b><br /><button className="link" onClick={() => db.txs.delete(t.id!)}>Hapus</button></div>
          </div>
        ))}
        <button className="btn alt" onClick={csv}>Ekspor CSV</button>
      </section>
    </>
  );
}
