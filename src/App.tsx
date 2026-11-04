import { Suspense, lazy, useEffect, useState } from 'react';
import Home from './pages/Home';
const Finance = lazy(() => import('./pages/Finance'));
const Todo = lazy(() => import('./pages/Todo'));
const Invest = lazy(() => import('./pages/Invest'));
const AI = lazy(() => import('./pages/AI'));
const Settings = lazy(() => import('./pages/Settings'));
const Notes = lazy(() => import('./pages/Notes'));
import { db } from './db';
import { runAll } from './dca';
import { Ic } from './icons';

// sama dgn Settings: salt + iterasi (kompatibel — PIN lama tanpa salt tidak valid, user set ulang PIN sekali)
const sha = async (s: string) => {
  const enc = new TextEncoder();
  const salt = localStorage.getItem('pinsalt') || '';
  let data = enc.encode(s + ':' + salt);
  for (let i = 0; i < 50000; i++) data = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return [...data].map(b => b.toString(16).padStart(2, '0')).join('');
};

function Lock({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState(''); const [err, setErr] = useState('');
  const [wait, setWait] = useState(0);
  const go = async () => {
    if (wait > 0) return;
    if ((await sha(pin)) === localStorage.getItem('pin')) {
      localStorage.removeItem('pinfails');
      // Session-only: dipakai Notes vault agar secret notes benar-benar terikat PIN user
      sessionStorage.setItem('duitku-pin-session', pin);
      onOk();
      return;
    }
    const fails = (+localStorage.getItem('pinfails') || 0) + 1;
    localStorage.setItem('pinfails', String(fails));
    // jeda progresif: 3x salah → 10d, 5x → 30d, 8x → 2m, 12x → 5 menit
    const w = fails >= 12 ? 300 : fails >= 8 ? 120 : fails >= 5 ? 30 : fails >= 3 ? 10 : 0;
    if (w) { setWait(w); const iv = setInterval(() => setWait(x => { if (x <= 1) { clearInterval(iv); return 0; } return x - 1; }), 1000); }
    setErr(w ? `PIN salah. Tunggu ${w} detik.` : 'PIN salah. Coba lagi.');
    setPin('');
  };
  return (
    <div className="lock">
      <h1>DuitKu</h1>
      <input type="password" inputMode="numeric" value={pin} placeholder="Masukkan PIN" onChange={e => setPin(e.target.value)} />
      <div className="neg">{err}</div>
      <button className="btn" onClick={go} disabled={wait > 0}>{wait > 0 ? `Terkunci ${wait}s` : 'Buka'}</button>
    </div>
  );
}

const TABS = [['home', 'Beranda', 'home'], ['uang', 'Keuangan', 'wallet'], ['tugas', 'To Do', 'todo'], ['dca', 'Investasi', 'invest'], ['ai', 'Lainnya', 'ai'], ['notes', 'Catatan', 'note']] as const;

export default function App() {
  const [locked, setLocked] = useState(!!localStorage.getItem('pin'));
  const [tab, setTab] = useState<string>('home');
  const [cfg, setCfg] = useState(false);

  useEffect(() => {
    // konfirmasi delete AI: selalu tersedia selama app hidup
    (globalThis as any).__duitkuConfirm = (q: string) => window.confirm(q);
    (async () => {
      if ((await db.accounts.count()) === 0) await db.accounts.add({ name: 'Tunai', balance0: 0 });
      try { const r = await runAll(); if (r && r !== 'Sudah terbaru.') console.log('[DCA]', r); } catch (e) { console.warn('[DCA] auto-run gagal:', e); }
    })();
    // jalankan ulang tiap 6 jam selama app terbuka — cleanup benar dikembalikan ke React
    const iv = setInterval(async () => { try { await runAll(); } catch { /* offline */ } }, 6 * 60 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  if (locked) return <Lock onOk={() => setLocked(false)} />;
  const title = cfg ? 'Setelan' : TABS.find(t => t[0] === tab)![1];
  return (
    <div className="app">
      <div className="top">
        <h1>{title}</h1>
        <div className="topbtns">
          <button className={'icobtn' + (tab === 'ai' && !cfg ? ' on' : '')} title="Chat AI" onClick={() => { setTab('ai'); setCfg(false); }}><Ic.ai size={20} /></button>
        </div>
      </div>
      <main>
        <Suspense fallback={<div className="loading">…</div>}>
          {cfg ? <Settings /> : tab === 'home' ? <Home go={setTab} /> : tab === 'uang' ? <Finance />
            : tab === 'tugas' ? <Todo /> : tab === 'dca' ? <Invest /> : tab === 'notes' ? <Notes /> : <AI />}
        </Suspense>
      </main>
      <nav className="floatnav">{TABS.map(([k, l, ico]) => { const NI = (Ic as any)[ico]; return (
        <button key={k} className={tab === k && !cfg ? 'on' : ''} onClick={() => { setTab(k); setCfg(false); }}><span className="nico"><NI size={19} strokeWidth={2.2} /></span><span className="nlab">{l}</span></button>
      ); })}
        <button className={cfg ? 'on' : ''} onClick={() => setCfg(!cfg)} aria-label="Setelan"><span className="nico"><Ic.settings size={19} strokeWidth={2.2} /></span><span className="nlab">Setelan</span></button>
      </nav>
    </div>
  );
}
