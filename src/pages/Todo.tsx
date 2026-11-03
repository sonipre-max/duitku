import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Task } from '../db';
import { parse, today, ymd } from '../util';
import { cancel, schedule } from '../notif';

const occurs = (t: Task, d: string) => {
  if (d < t.date) return false;
  if (t.repeat === 'none') return t.date === d;
  if (t.repeat === 'daily') return true;
  const a = parse(t.date), b = parse(d);
  return t.repeat === 'weekly' ? a.getDay() === b.getDay() : a.getDate() === b.getDate();
};
const isDone = (t: Task, d: string) => (t.repeat === 'none' ? t.done : t.doneOn.includes(d));
const PRI = ['', 'Tinggi', 'Sedang', 'Rendah'];

export default function Todo() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const [sel, setSel] = useState(today());
  const [cur, setCur] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [f, setF] = useState({ title: '', time: '', repeat: 'none', priority: 2 });

  const y = cur.getFullYear(), mo = cur.getMonth();
  const lead = cur.getDay(), days = new Date(y, mo + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => ymd(new Date(y, mo, i + 1)))];
  const list = tasks.filter(t => occurs(t, sel)).sort((a, b) => +isDone(a, sel) - +isDone(b, sel) || a.priority - b.priority || (a.time || '99').localeCompare(b.time || '99'));

  const add = async () => {
    if (!f.title.trim()) return;
    const t: Task = { title: f.title.trim(), date: sel, time: f.time, repeat: f.repeat as any, priority: f.priority as any, done: false, doneOn: [] };
    t.id = await db.tasks.add(t);
    schedule(t);
    setF({ ...f, title: '', time: '' });
  };
  const toggle = (t: Task) => t.repeat === 'none'
    ? db.tasks.update(t.id!, { done: !t.done })
    : db.tasks.update(t.id!, { doneOn: t.doneOn.includes(sel) ? t.doneOn.filter(x => x !== sel) : [...t.doneOn, sel] });

  return (
    <>
      <section>
        <div className="row" style={{ border: 0 }}>
          <button className="btn alt" style={{ width: 'auto' }} onClick={() => setCur(new Date(y, mo - 1, 1))}>‹</button>
          <b>{cur.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</b>
          <button className="btn alt" style={{ width: 'auto' }} onClick={() => setCur(new Date(y, mo + 1, 1))}>›</button>
        </div>
        <div className="cal">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(h => <span key={h}>{h}</span>)}
          {cells.map((d, i) => d ? (
            <button key={d} className={[d === sel && 'sel', d === today() && 'now', tasks.some(t => occurs(t, d)) && 'dot'].filter(Boolean).join(' ')} onClick={() => setSel(d)}>{+d.slice(8)}</button>
          ) : <i key={'e' + i} />)}
        </div>
      </section>

      <section>
        <h2>{parse(sel).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        {list.length === 0 && <div className="mute">Belum ada tugas di tanggal ini. Tambahkan di bawah.</div>}
        {list.map(t => (
          <div className="row" key={t.id}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1 }}>
              <input type="checkbox" style={{ width: 22, margin: 0 }} checked={isDone(t, sel)} onChange={() => toggle(t)} />
              <span className={isDone(t, sel) ? 'done' : ''}>{t.title}<div className="tag">{[t.time, PRI[t.priority], t.repeat !== 'none' && { daily: 'tiap hari', weekly: 'tiap minggu', monthly: 'tiap bulan' }[t.repeat]].filter(Boolean).join(' · ')}</div></span>
            </label>
            <button className="link" onClick={() => { cancel(t.id!); db.tasks.delete(t.id!); }}>Hapus</button>
          </div>
        ))}
      </section>

      <section>
        <h2>Tugas baru</h2>
        <form onSubmit={e => { e.preventDefault(); add(); }}>
        <input placeholder="Apa yang perlu dilakukan?" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
        <div className="g2">
          <input type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} />
          <select value={f.priority} onChange={e => setF({ ...f, priority: +e.target.value })}><option value={1}>Prioritas tinggi</option><option value={2}>Sedang</option><option value={3}>Rendah</option></select>
        </div>
        <select value={f.repeat} onChange={e => setF({ ...f, repeat: e.target.value })}>
          <option value="none">Sekali</option><option value="daily">Tiap hari</option><option value="weekly">Tiap minggu</option><option value="monthly">Tiap bulan</option>
        </select>
        <button className="btn" type="submit">Tambah tugas</button>
        <div className="tag">Isi jam untuk mendapat pengingat notifikasi.</div>
        </form>
      </section>
    </>
  );
}
