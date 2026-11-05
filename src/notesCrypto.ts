const ensureSalt = () => {
  let salt = localStorage.getItem('pinsalt');
  if (!salt) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    salt = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('pinsalt', salt);
  }
  return salt;
};

const derive = async (pin: string | null, salt: string) => {
  const base = pin ? pin : 'duitku-device:' + salt;
  const iterations = pin ? 150000 : 10000;
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(base), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode('duitku-notes:' + salt), iterations, hash: 'SHA-256' },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
};

export async function encryptSecretBody(plain: string, pin?: string | null): Promise<string> {
  const salt = ensureSalt();
  const key = await derive(pin === undefined ? sessionStorage.getItem('duitku-pin-session') : pin, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
  const bytes = new Uint8Array(12 + encrypted.byteLength);
  bytes.set(iv, 0);
  bytes.set(new Uint8Array(encrypted), 12);
  return 'enc:' + btoa(String.fromCharCode(...bytes));
}

export async function decryptSecretBody(stored: string, pins?: Array<string | null>): Promise<string> {
  if (!stored.startsWith('enc:')) return stored;
  const salt = ensureSalt();
  const raw = atob(stored.slice(4));
  if (raw.length < 29) throw new Error('Format catatan terenkripsi tidak valid.');
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const candidates = pins ?? [sessionStorage.getItem('duitku-pin-session'), null];
  let lastError: unknown;
  for (const pin of [...new Set(candidates)]) {
    try {
      const key = await derive(pin, salt);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
      return new TextDecoder().decode(plain);
    } catch (error) { lastError = error; }
  }
  throw new Error('Catatan rahasia tidak dapat dibuka dengan PIN perangkat yang tersedia.', { cause: lastError });
}
