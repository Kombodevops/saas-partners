import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ReservasAnalyticsMonth {
  month: string;
  total?: number;
  byStatus?: Record<string, number>;
  byDay?: Record<
    string,
    {
      total?: number;
      byStatus?: Record<string, number>;
      byRestaurante?: Record<
        string,
        {
          total?: number;
          byStatus?: Record<string, number>;
          byResponsable?: Record<
            string,
            {
              total?: number;
              byStatus?: Record<string, number>;
            }
          >;
        }
      >;
      byResponsable?: Record<
        string,
        {
          total?: number;
          byStatus?: Record<string, number>;
        }
      >;
    }
  >;
  byRestaurante?: Record<
    string,
    {
      total?: number;
      byStatus?: Record<string, number>;
      byResponsable?: Record<
        string,
        {
          total?: number;
          byStatus?: Record<string, number>;
        }
      >;
    }
  >;
  byResponsable?: Record<
    string,
    {
      total?: number;
      byStatus?: Record<string, number>;
    }
  >;
}

export class ReservasAnalyticsService {
  static async getMonthAnalytics(partnerId: string, monthKey: string): Promise<ReservasAnalyticsMonth | null> {
    if (!partnerId || !monthKey) return null;
    const ref = doc(db, 'reservas_analytics', partnerId, 'months', monthKey);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as ReservasAnalyticsMonth;
  }
}
