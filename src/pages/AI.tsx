import { useState } from 'react';
import { loadCfg, Msg } from '../ai';
import { agentTurn } from '../agent';
import { Ic, Deco } from '../icons';

// Terinspirasi Lobe Chat: bubble chat, quick prompts, indikator mengetik
export default function AI() {
  // konfirmasi native sebelum AI menghapus data
  (globalThis as any).__duitkuConfirm = (q: string) => window.confirm(q);
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
    const push = (m: Msg) => setMsgs(cur => {
      // gabungkan chip tool berurutan jadi satu bubble
      const last = cur[cur.length - 1];
      if (m.content.startsWith('🔧') && last?.role === 'assistant' && last.content.startsWith('🔧')) {
        return [...cur.slice(0, -1), { ...last, content: last.content + '\n' + m.content }];
      }
      return [...cur, m];
    });
    try {
      if (mode === 'task') {
        await agentTurn([next[next.length - 1]], cfg, push);
      } else {
        await agentTurn(next, cfg, push);
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
