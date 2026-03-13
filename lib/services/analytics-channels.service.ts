import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type AnalyticsChannel = {
  name: string;
  color: string;
};

const DEFAULT_COLOR = '#7472fd';

const normalizeChannels = (raw: unknown): AnalyticsChannel[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') return { name: item, color: DEFAULT_COLOR };
      if (item && typeof item === 'object') {
        const record = item as { name?: unknown; color?: unknown };
        const name = typeof record.name === 'string' ? record.name : '';
        if (!name) return null;
        const color = typeof record.color === 'string' ? record.color : DEFAULT_COLOR;
        return { name, color };
      }
      return null;
    })
    .filter((item): item is AnalyticsChannel => Boolean(item));
};

export class AnalyticsChannelsService {
  static async getChannels(partnerId: string): Promise<string[]> {
    if (!partnerId) return [];
    const ref = doc(db, 'partners', partnerId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    const data = snap.data() as { canales?: unknown };
    return normalizeChannels(data.canales).map((item) => item.name);
  }

  static async getChannelsWithColors(partnerId: string): Promise<AnalyticsChannel[]> {
    if (!partnerId) return [];
    const ref = doc(db, 'partners', partnerId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    const data = snap.data() as { canales?: unknown };
    return normalizeChannels(data.canales);
  }

  static async addChannel(partnerId: string, channel: string, color = DEFAULT_COLOR): Promise<void> {
    if (!partnerId || !channel) return;
    const ref = doc(db, 'partners', partnerId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as { canales?: unknown };
    const current = normalizeChannels(data.canales);
    if (current.some((item) => item.name.toLowerCase() === channel.toLowerCase())) return;
    await updateDoc(ref, { canales: [...current, { name: channel, color }] });
  }

  static async removeChannel(partnerId: string, channel: string): Promise<void> {
    if (!partnerId || !channel) return;
    const ref = doc(db, 'partners', partnerId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as { canales?: unknown };
    const current = normalizeChannels(data.canales);
    const next = current.filter((item) => item.name !== channel);
    await updateDoc(ref, { canales: next });
  }

  static async updateChannelColor(partnerId: string, channel: string, color: string): Promise<void> {
    if (!partnerId || !channel || !color) return;
    const ref = doc(db, 'partners', partnerId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as { canales?: unknown };
    const current = normalizeChannels(data.canales);
    const next = current.map((item) => (item.name === channel ? { ...item, color } : item));
    await updateDoc(ref, { canales: next });
  }
}
