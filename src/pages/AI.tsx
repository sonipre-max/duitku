import { useState } from 'react';
import { ask, loadCfg, Msg } from '../ai';
import { db } from '../db';
import { schedule } from '../notif';
import { today } from '../util';

async function context() {
  const m = today().slice(0, 7);
  const txs = (await db.txs.toArray()).filter(t => t.date.startsWith(m) && t.category !== 'Transfer');
  const by: Record<string, number> = {};
  let i = 0, o = 0;
  txs.forEach(t => { if (t.type === 'out') { o += t.amount; by[t.category] = (by[t.category] || 0) + t.amount; } else i += t.amount; });
  const accounts = await db.accounts.toArray();
  const trades = await db.trades.toArray();
  const inv = trades.reduce((s, t) => s + t.amount, 0);
  const open = (await db.tasks.toArray()).filter(t => !t.done).slice(0, 20).map(t => `${t.title} (${t.date})`);
  const acc = accounts.map(a => a.name).join(', ');
  return `Data pengguna bulan ${m}: pemasukan Rp${i}, pengeluaran Rp${o}, per kategori ${JSON.stringify(by)}. Rekening: ${acc}. Total dibelanjakan untuk simulasi DCA sejauh ini: Rp${inv}. Tugas terbuka: ${open.join('; ') || '-'}. Jawab pertanyaan tentang angka-angka ini dengan hitungan yang benar.`;
}

export default function AI() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'chat' | 'task'>('chat');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!text.trim() || busy) return;
    const cfg = loadCfg();
    const next: Msg[] = [...msgs, { role: 'user', content: text }];
    setMsgs(next); setText(''); setBusy(true);
    try {
      if (mode === 'task') {
        const sys = `Hari ini ${today()}. Ubah kalimat pengguna menjadi satu objek JSON {"title":string,"date":"YYYY-MM-DD","time":"HH:MM" atau "","repeat":"none"|"daily"|"weekly"|"monthly"}. "besok" = ${today()} +1 hari, "lusa" = +2 hari. Jika jam disebut "pagi" pakai 08:00, "siang" 12:00, "sore" 16:00, "malam" 19:00. Balas HANYA JSON tanpa teks lain.`;
        let r = '';
        for (let att = 0; att < 2; att++) {
          r = (await ask([next[next.length - 1]], cfg, sys)).trim();
          const m = r.match(/\{[\s\S]*\}/);
          if (m) {
            try {
              const j = JSON.parse(m[0]);
              if (j?.title && /^\d{4}-\d{2}-\d{2}$/.test(j.date || '')) {
                const t = { title: String(j.title), date: j.date, time: /^\d{2}:\d{2}$/.test(j.time || '') ? j.time : '', repeat: (['none', 'daily', 'weekly', 'monthly'].includes(j.repeat) ? j.repeat : 'none') as any, priority: 2 as const, done: false, doneOn: [] };
                const id = await db.tasks.add(t);
                schedule({ ...t, id });
                setMsgs([...next, { role: 'assistant', content: `✅ Tugas dibuat: ${t.title} pada ${t.date}${t.time ? ' pukul ' + t.time : ''}${t.repeat !== 'none' ? ` (diulang ${t.repeat === 'daily' ? 'tiap hari' : t.repeat === 'weekly' ? 'tiap minggu' : 'tiap bulan'})` : ''}.` }]);
                return;
              }
            } catch { /* JSON rusak → coba lagi */ }
          }
        }
        setMsgs([...next, { role: 'assistant', content: `Gagal memahami tugas. Coba tulis lebih eksplisit, mis. "bayar listrik 5 November jam 19:00". Jawaban AI: ${r.slice(0, 120)}` }]);
      } else {
        const sys = 'Kamu asisten keuangan dan produktivitas pribadi. Jawab singkat, jelas, dalam bahasa Indonesia. Hitung dengan akurat; tunjukkan perhitungan singkat jika relevan. Simulasi investasi bukan nasihat keuangan.' + (cfg.withData ? ' ' + await context() : '');
        setMsgs([...next, { role: 'assistant', content: await ask(next, cfg, sys) }]);
      }
    } catch (e: any) {
      setMsgs([...next, { role: 'assistant', content: 'Gagal: ' + (e?.message || e) + (navigator.onLine ? '' : ' (kamu sedang offline)') }]);
    }
    setBusy(false);
  };

  return (
    <>
      <section>
        <div className="g2">
          <button className={'btn' + (mode === 'chat' ? '' : ' alt')} onClick={() => setMode('chat')}>Tanya AI</button>
          <button className={'btn' + (mode === 'task' ? '' : ' alt')} onClick={() => setMode('task')}>Buat tugas</button>
        </div>
        <div className="tag">{mode === 'task' ? 'Contoh: ingatkan bayar listrik tiap tanggal 5 jam 9 pagi' : 'AI butuh internet dan API key (Setelan).'}</div>
        {msgs.length === 0 && <div className="mute" style={{ marginTop: 8 }}>Tanyakan sesuatu, mis. "Ringkas pengeluaran bulan ini" (aktifkan kirim data di Setelan).</div>}
        {msgs.map((m, i) => <div key={i} className={'msg ' + m.role}>{m.content}</div>)}
        {busy && <div className="mute">Memproses…</div>}
        <textarea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder={mode === 'task' ? 'Tulis tugasnya…' : 'Tulis pertanyaan…'} />
        <button className="btn" onClick={send} disabled={busy}>Kirim</button>
      </section>
    </>
  );
}
