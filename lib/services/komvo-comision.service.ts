import { doc, getDoc } from 'firebase/firestore';
import { z } from 'zod';
import { db } from '@/lib/firebase';

const KomvoComisionDocSchema = z
  .object({
    ck: z.union([z.number(), z.string()]),
  })
  .passthrough();

const normalizeCk = (value: unknown): number | null => {
  const raw = typeof value === 'string' ? Number(value) : value;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  if (raw <= 0 || raw > 100) return null;
  return raw;
};

export class KomvoComisionService {
  static async getMarketplaceComisionPercentByPartnerId(partnerId: string): Promise<number | null> {
    if (!partnerId) return null;
    const ref = doc(db, 'komvo_comision', partnerId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;
    const parsed = KomvoComisionDocSchema.safeParse(snapshot.data());
    if (!parsed.success) return null;
    return normalizeCk(parsed.data.ck);
  }
}

