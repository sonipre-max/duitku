import { useState } from 'react';
import { ask, loadCfg, Msg } from '../ai';
import { db } from '../db';
import { schedule } from '../notif';
import { today } from '../util';
import { Ic, Deco } from '../icons';

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

// Terinspirasi Lobe Chat: bubble chat, quick prompts, indikator mengetik
export default function AI() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'chat' | 'task'>('chat');
  const [busy, setBusy] = useState(false);

  const QUICK = mode === 'task'
    ? ['Bayar listrik 5 November jam 19:00', 'Gym tiap hari jam 6 sore', 'Meeting besok jam 10 pagi']
    : ['Ringkas pengeluaran bulan ini', 'Kategori apa paling boros?', 'Sisa uang aman gak sampai akhir bulan?'];

  const send = async (preset?: string) => {
    const val = (preset ?? text).trim();
    if (!val || busy) return;
    const cfg = loadCfg();
    const next: Msg[] = [...msgs, { role: 'user', content: val }];
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
      <div className="modeSeg">
        <button className={mode === 'chat' ? 'on' : ''} onClick={() => setMode('chat')}><Ic.ai size={15} style={{ verticalAlign: '-2px' }} /> Tanya AI</button>
        <button className={mode === 'task' ? 'on' : ''} onClick={() => setMode('task')}><Ic.todo size={15} style={{ verticalAlign: '-2px' }} /> Buat tugas</button>
      </div>

      <section className="chatWrap">
        {msgs.length === 0 && (
          <div className="chatEmpty">
            <Deco.avatar width={44} />
            <b>{mode === 'task' ? 'Mau diingetin apa, Bos?' : 'Tanya apa saja soal uang & hari lo, Bos!'}</b>
            <span>AI butuh internet dan API key (Setelan){mode === 'chat' ? ' — aktifkan kirim data di Setelan biar bisa baca angka lo.' : '.'}</span>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={'chatRow ' + m.role}>
            {m.role === 'assistant' && <span className="chatAva"><Deco.avatar width={26} /></span>}
            <div className={'msg ' + m.role}>{m.content}</div>
          </div>
        ))}
        {busy && (
          <div className="chatRow assistant"><span className="chatAva"><Deco.avatar width={26} /></span>
            <div className="msg assistant typing"><i /><i /><i /></div>
          </div>
        )}
      </section>

      <div className="chipWrap" style={{ marginBottom: 10 }}>
        {QUICK.map(q => <button key={q} className="chip" onClick={() => send(q)}>{q}</button>)}
      </div>

      <section className="chatInput">
        <textarea rows={2} value={text} onChange={e => setText(e.target.value)} placeholder={mode === 'task' ? 'Tulis tugasnya…' : 'Tulis pertanyaan…'} />
        <button className="btn" style={{ width: 'auto', padding: '0 18px' }} onClick={() => send()} disabled={busy}><Ic.arrow size={18} /></button>
      </section>
    </>
  );
}
