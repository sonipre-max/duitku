import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Task } from './db';

export async function schedule(t: Task) {
  if (!Capacitor.isNativePlatform() || !t.time || !t.id) return;
  try {
    const p = await LocalNotifications.requestPermissions();
    if (p.display !== 'granted') return;
    const at = new Date(`${t.date}T${t.time}:00`);
    const every = ({ daily: 'day', weekly: 'week', monthly: 'month' } as any)[t.repeat];
    if (!every && at <= new Date()) return;
    await LocalNotifications.schedule({
      notifications: [{
        id: t.id, title: 'Pengingat', body: t.title,
        schedule: every ? { at, repeats: true, every } : { at, allowWhileIdle: true }
      }]
    });
  } catch { /* abaikan */ }
}
export async function cancel(id: number) {
  if (!Capacitor.isNativePlatform()) return;
  try { await LocalNotifications.cancel({ notifications: [{ id }] }); } catch { /* abaikan */ }
}
