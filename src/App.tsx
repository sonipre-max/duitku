import { Suspense, lazy, useEffect, useState } from 'react';
import Home from './pages/Home';
const Finance = lazy(() => import('./pages/Finance'));
const Todo = lazy(() => import('./pages/Todo'));
const Invest = lazy(() => import('./pages/Invest'));
const AI = lazy(() => import('./pages/AI'));
const Settings = lazy(() => import('./pages/Settings'));
import { db } from './db';
import { runAll } from './dca';

const sha = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map(b => b.toString(16).padStart(2, '0')).join('');

function Lock({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState(''); const [err, setErr] = useState('');
  const go = async () => {
    if ((await sha(pin)) === localStorage.getItem('pin')) onOk();
    else { setErr('PIN salah. Coba lagi.'); setPin(''); }
  };
  return (
    <div className="lock">
      <h1>DuitKu</h1>
      <input type="password" inputMode="numeric" value={pin} placeholder="Masukkan PIN" onChange={e => setPin(e.target.value)} />
      <div className="neg">{err}</div>
      <button className="btn" onClick={go}>Buka</button>
    </div>
  );
}

const TABS = [['home', 'Beranda', '🏠'], ['uang', 'Keuangan', '👛'], ['tugas', 'To Do', '✅'], ['dca', 'Investasi', '📈'], ['ai', 'Lainnya', '⋯']] as const;

export default function App() {
  const [locked, setLocked] = useState(!!localStorage.getItem('pin'));
  const [tab, setTab] = useState<string>('home');
  const [cfg, setCfg] = useState(false);

  useEffect(() => {
    (async () => {
      if ((await db.accounts.count()) === 0) await db.accounts.add({ name: 'Tunai', balance0: 0 });
      runAll(); // lanjutkan DCA otomatis saat aplikasi dibuka
    })();
  }, []);

  if (locked) return <Lock onOk={() => setLocked(false)} />;
  const title = cfg ? 'Setelan' : TABS.find(t => t[0] === tab)![1];
  return (
    <div className="app">
      <div className="top">
        <h1>{title}</h1>
        <div className="topbtns">
          <button className="icobtn" title="Setelan" onClick={() => setCfg(!cfg)}>⚙️</button>
        </div>
      </div>
      <main>
        <Suspense fallback={<div className="loading">…</div>}>
          {cfg ? <Settings /> : tab === 'home' ? <Home go={setTab} /> : tab === 'uang' ? <Finance />
            : tab === 'tugas' ? <Todo /> : tab === 'dca' ? <Invest /> : <AI />}
        </Suspense>
      </main>
      <nav className="floatnav">{TABS.map(([k, l, i]) => <button key={k} className={tab === k && !cfg ? 'on' : ''} onClick={() => { setTab(k); setCfg(false); }}><span className="nico">{i}</span><span className="nlab">{l}</span></button>)}</nav>
    </div>
  );
}
