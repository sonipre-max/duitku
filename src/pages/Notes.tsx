import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Note, Task } from '../db';
import { parse, today } from '../util';
import { Ic, Deco } from '../icons';

// Notes DuitKu — terinspirasi Joplin (57k★: notebook terpisah + catatan tertanggal)
// dan Standard Notes (6.7k★: vault utk sandi/key/API key yang tersembunyi).
// Dua tab terpisah: Catatan Umum & Notes To Do (per tugas/jadwal).
const fmtDate = (d: string) => d ? parse(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default function Notes() {
  const notes = useLiveQuery(() => db.notes.toArray(), []) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const [tab, setTab] = useState<'umum' | 'tugas'>('umum');
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState(false);
  const [reveal, setReveal] = useState<Set<number>>(new Set());
  const [f, setF] = useState({ title: '', body: '', secret: false, date: today(), taskId: 0 });

  // Integrasi To Do: tombol pena di tugas → buka sheet notes tugas langsung terisi
  useEffect(() => {
    const h = (e: any) => {
      const { taskId, date, title } = e.detail || {};
      setTab('tugas');
      setF(cur => ({ ...cur, taskId: taskId || 0, date: date || today(), title: 'Catatan: ' + (title || '') }));
      setSheet(true);
    };
    window.addEventListener('notefor', h);
    return () => window.removeEventListener('notefor', h);
  }, []);

  const list = useMemo(() => notes
    .filter(n => n.kind === tab)
    .filter(n => !q || (n.title + ' ' + n.body).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => +b.pinned - +a.pinned || b.updatedAt.localeCompare(a.updatedAt)), [notes, tab, q]);

  const save = async () => {
    if (!f.title.trim() && !f.body.trim()) return;
    const now = new Date().toISOString();
    await db.notes.add({
      title: f.title.trim() || f.body.slice(0, 30), body: f.body, kind: tab,
      secret: f.secret, date: f.date, taskId: f.taskId || undefined, pinned: false,
      createdAt: now, updatedAt: now,
    });
    setF({ title: '', body: '', secret: false, date: today(), taskId: 0 });
    setSheet(false);
  };
  const toggleReveal = (id: number) => setReveal(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const togglePin = (n: Note) => db.notes.update(n.id!, { pinned: !n.pinned });
  const del = (n: Note) => { if (confirm('Hapus catatan ini?')) db.notes.delete(n.id!); };

  const taskTitle = (id?: number) => tasks.find((t: Task) => t.id === id)?.title;

  return (
    <>
      {/* Segmented: Umum / Notes To Do */}
      <div className="modeSeg">
        <button className={tab === 'umum' ? 'on' : ''} onClick={() => setTab('umum')}><Deco.memo width={15} style={{ verticalAlign: '-2px' }} /> Catatan Umum</button>
        <button className={tab === 'tugas' ? 'on' : ''} onClick={() => setTab('tugas')}><Ic.todo size={15} style={{ verticalAlign: '-2px' }} /> Notes To Do</button>
      </div>

      <section>
        <input placeholder="Cari catatan…" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 10 }} />
        {list.length === 0 && (
          <div className="ivEmpty">
            <div className="ivEmptyIco"><Deco.memo width={40} /></div>
            <b>{tab === 'umum' ? 'Belum ada catatan umum' : 'Belum ada notes tugas'}</b>
            <span>{tab === 'umum'
              ? 'Simpan sandi, key wallet, API key, atau catatan biasa di sini. Ketuk tombol + untuk mulai.'
              : 'Catatan yang nempel ke jadwal/tugas harian. Pilih tugas & tanggalnya, biar gampang diinget pas jadwalnya.'}</span>
          </div>
        )}
        {list.map(n => {
          const hidden = n.secret && !reveal.has(n.id!);
          return (
            <div className="ntCard" key={n.id}>
              <div className="row" style={{ border: 0, padding: 0 }}>
                <b className="ntTitle">{n.pinned ? '📌 ' : ''}{n.title}</b>
                <span className="ntActs">
                  <button title="Pin" onClick={() => togglePin(n)}><Ic.star size={15} color={n.pinned ? '#f59e0b' : undefined} fill={n.pinned ? '#f59e0b' : 'none'} /></button>
                  <button title="Hapus" onClick={() => del(n)}><Ic.x size={15} /></button>
                </span>
              </div>
              {n.kind === 'tugas' && (
                <div className="ntRef">🎯 {taskTitle(n.taskId) || 'Tugas (sudah dihapus)'} · {fmtDate(n.date)}</div>
              )}
              <div className={'ntBody' + (hidden ? ' secret' : '')}>
                {hidden ? '••••••••••••' : n.body}
              </div>
              <div className="ntFoot">
                <span className="tag">{fmtDate(n.date)}</span>
                {n.secret && <button className="link" onClick={() => toggleReveal(n.id!)}>{hidden ? '👁 Tampilkan' : '🙈 Sembunyikan'}</button>}
              </div>
            </div>
          );
        })}
      </section>

      <button className="fab" onClick={() => setSheet(true)} aria-label="Catatan baru"><Ic.plus size={24} strokeWidth={2.5} /></button>
      {sheet && (
        <>
          <div className="sheetBk" onClick={() => setSheet(false)} />
          <div className="sheet">
            <div className="sheetBar" />
            <h2>{tab === 'umum' ? 'Catatan umum baru' : 'Notes tugas baru'}</h2>
            <form onSubmit={e => { e.preventDefault(); save(); }} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <input placeholder="Judul (mis. Seed phrase wallet / Tugas Matematika)" autoFocus value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
              <textarea rows={4} placeholder={tab === 'umum' ? 'Isi catatan… (sandi, key, apa aja)' : 'Catatan harian untuk jadwal/tugas ini…'} value={f.body} onChange={e => setF({ ...f, body: e.target.value })} />
              {tab === 'tugas' && (
                <>
                  <select value={f.taskId} onChange={e => setF({ ...f, taskId: +e.target.value })}>
                    <option value={0}>Pilih tugas/jadwal…</option>
                    {tasks.map((t: Task) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                  <input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
                  <div className="tag">Catatan disimpan pertanggal — muncul saat jadwal tersebut, biar gak lupa.</div>
                </>
              )}
              {tab === 'umum' && (
                <label className="ntSecretRow">
                  <input type="checkbox" checked={f.secret} onChange={e => setF({ ...f, secret: e.target.checked })} />
                  <span>🔒 Simpan sebagai rahasia (disembunyikan, ketuk untuk lihat)</span>
                </label>
              )}
              <button className="btn" type="submit">Simpan catatan</button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
