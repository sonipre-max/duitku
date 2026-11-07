import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Note, Task } from '../db';
import { parse, today } from '../util';
import { Ic, Deco } from '../icons';

// Notes FINTRA — terinspirasi Joplin (57k★: notebook terpisah + catatan tertanggal)
// dan Standard Notes (6.7k★: vault utk sandi/key/API key yang tersembunyi).
// Dua tab terpisah: Catatan Umum & Notes To Do (per tugas/jadwal).

// ── Enkripsi secret notes: AES-GCM ──
// Prefer PIN session (diset saat unlock di App.tsx) → benar-benar terikat PIN user.
// Fallback device-key (pinsalt) agar notes lama yang dienkripsi tanpa PIN tetap bisa dibaca.
const getKeyMaterial = async (preferPin: boolean) => {
  let salt = localStorage.getItem('pinsalt');
  if (!salt) {
    const x = crypto.getRandomValues(new Uint8Array(16));
    salt = [...x].map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('pinsalt', salt);
  }
  const sessionPin = sessionStorage.getItem('duitku-pin-session');
  const usePin = preferPin && !!sessionPin;
  const base = usePin ? sessionPin! : ('duitku-device:' + salt);
  const iter = usePin ? 150000 : 10000;
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(base), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode('duitku-notes:' + salt), iterations: iter, hash: 'SHA-256' },
    km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
};

const encBody = async (plain: string) => {
  // Prefer PIN-bound jika session PIN tersedia
  const k = await getKeyMaterial(true);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(plain));
  return 'enc:' + btoa(String.fromCharCode(...iv) + String.fromCharCode(...new Uint8Array(ct)));
};

const decBody = async (stored: string) => {
  if (!stored.startsWith('enc:')) return stored;
  const bin = atob(stored.slice(4));
  const iv = new Uint8Array(bin.slice(0, 12).split('').map(c => c.charCodeAt(0)));
  const ct = new Uint8Array(bin.slice(12).split('').map(c => c.charCodeAt(0)));
  // Coba PIN dulu, lalu device-key (kompatibel notes lama)
  for (const prefer of [true, false]) {
    try {
      const k = await getKeyMaterial(prefer);
      return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, k, ct));
    } catch { /* try next */ }
  }
  return '(tidak bisa didekripsi)';
};

const fmtDate = (d: string) => d ? parse(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';
const taskTitle = (id?: number, tasks?: Task[]) => tasks?.find(t => t.id === id)?.title;

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
      setEditing(null); // jangan sampai menimpa catatan lama yang lagi diedit
      setF({ title: 'Catatan: ' + (title || ''), body: '', secret: false, date: date || today(), taskId: taskId || 0 });
      setSheet(true);
    };
    window.addEventListener('notefor', h);
    return () => window.removeEventListener('notefor', h);
  }, []);

  // teks yang bisa dicari: title + body (secret didekripsi dulu via plainMap)
  const [plainMap, setPlainMap] = useState<Record<number, string>>({});
  useEffect(() => {
    let on = true;
    (async () => {
      const o: Record<number, string> = {};
      for (const n of notes) if (n.secret) o[n.id!] = await decBody(n.body);
      if (on) setPlainMap(o);
    })();
    return () => { on = false; };
  }, [notes]);
  const list = useMemo(() => notes
    .filter(n => n.kind === tab)
    .filter(n => { if (!q) return true; const hay = (n.title + ' ' + (n.secret ? (plainMap[n.id!] || '') : n.body)).toLowerCase(); return hay.includes(q.toLowerCase()); })
    .sort((a, b) => +b.pinned - +a.pinned || b.updatedAt.localeCompare(a.updatedAt)), [notes, tab, q, plainMap]);

  const save = async () => {
    if (!f.title.trim() && !f.body.trim()) return;
    const now = new Date().toISOString();
    const body = f.secret ? await encBody(f.body) : f.body;
    await db.notes.add({
      title: f.title.trim() || f.body.slice(0, 30), body, kind: tab,
      secret: f.secret, date: f.date, taskId: f.taskId || undefined, pinned: false,
      createdAt: now, updatedAt: now,
    });
    setF({ title: '', body: '', secret: false, date: today(), taskId: 0 });
    setSheet(false);
  };
  const toggleReveal = (id: number) => setReveal(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const togglePin = (n: Note) => db.notes.update(n.id!, { pinned: !n.pinned });
  const del = (n: Note) => { if (confirm('Hapus catatan ini?')) db.notes.delete(n.id!); };
  // edit: buka sheet terisi (body secret didekripsi dulu)
  const [editing, setEditing] = useState<Note | null>(null);
  const startEdit = async (n: Note) => {
    const body = n.secret ? await decBody(n.body) : n.body;
    setTab(n.kind); // edit harus di tab sesuai kind — kalau tidak, save masuk tab salah
    setEditing(n); setF({ title: n.title, body, secret: n.secret, date: n.date, taskId: n.taskId || 0 });
    setSheet(true);
  };
  const saveEdit = async () => {
    if (!editing) return save();
    if (!f.title.trim() && !f.body.trim()) return;
    const body = f.secret ? await encBody(f.body) : f.body;
    await db.notes.update(editing.id!, { title: f.title.trim() || f.body.slice(0, 30), body, secret: f.secret, date: f.date, taskId: f.taskId || undefined, updatedAt: new Date().toISOString() });
    setEditing(null); setF({ title: '', body: '', secret: false, date: today(), taskId: 0 }); setSheet(false);
  };



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
        {list.map(n => <NoteCard key={n.id} n={n} tref={n.kind === 'tugas' ? (taskTitle(n.taskId, tasks) || 'Tugas (sudah dihapus)') : ''} hidden={n.secret && !reveal.has(n.id!)} onReveal={toggleReveal} onPin={togglePin} onDel={del} onEdit={startEdit} />)}
      </section>

      <button className="fab" onClick={() => { setEditing(null); setF({ title: '', body: '', secret: false, date: today(), taskId: 0 }); setSheet(true); }} aria-label="Catatan baru"><Ic.plus size={24} strokeWidth={2.5} /></button>
      {sheet && (
        <>
          <div className="sheetBk" onClick={() => setSheet(false)} />
          <div className="sheet">
            <div className="sheetBar" />
            <div className="row" style={{ border: 0 }}>
            <h2 style={{ margin: 0 }}>{editing ? 'Edit catatan' : tab === 'umum' ? 'Catatan umum baru' : 'Notes tugas baru'}</h2>
            <button className="icobtn" onClick={() => setSheet(false)} aria-label="Tutup"><Ic.x size={18} /></button>
          </div>
            <form onSubmit={e => { e.preventDefault(); saveEdit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
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
              <button className="btn" type="submit">{editing ? 'Simpan perubahan' : 'Simpan catatan'}</button>
            </form>
          </div>
        </>
      )}
    </>
  );
}

// Kartu catatan terpisah biar hooks aman (reveal = decrypt on demand)
function NoteCard({ n, tref, hidden, onReveal, onPin, onDel, onEdit }: { n: Note; tref: string; hidden: boolean; onReveal: (id: number) => void; onPin: (n: Note) => void; onDel: (n: Note) => void; onEdit: (n: Note) => void }) {
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => { let on = true; if (!hidden && n.secret && shown === null) decBody(n.body).then(t => on && setShown(t)); return () => { on = false; }; }, [hidden, n.secret, n.body]);
  const body = n.secret ? (hidden ? '••••••••••••' : (shown ?? '…')) : n.body;
  return (
    <div className="ntCard">
      <div className="row" style={{ border: 0, padding: 0 }}>
        <b className="ntTitle">{n.pinned ? '📌 ' : ''}{n.title}</b>
        <span className="ntActs">
          <button title="Edit" onClick={() => onEdit(n)}><Ic.pencil size={15} /></button>
          <button title="Pin" onClick={() => onPin(n)}><Ic.star size={15} color={n.pinned ? '#f59e0b' : undefined} fill={n.pinned ? '#f59e0b' : 'none'} /></button>
          <button title="Hapus" onClick={() => onDel(n)}><Ic.x size={15} /></button>
        </span>
      </div>
      {n.kind === 'tugas' && (
        <div className="ntRef">🎯 {tref} · {fmtDate(n.date)}</div>
      )}
      <div className={'ntBody' + (hidden ? ' secret' : '')}>{body}</div>
      <div className="ntFoot">
        <span className="tag">{fmtDate(n.date)}</span>
        {n.secret && <button className="link" onClick={() => onReveal(n.id!)}>{hidden ? '👁 Tampilkan' : '🙈 Sembunyikan'}</button>}
      </div>
    </div>
  );
}
