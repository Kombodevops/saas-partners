import type { Timestamp } from 'firebase/firestore';

export type WorkerRole = 'admin' | 'gestor';

export interface Worker {
  id: string;
  partnerId: string;
  email: string;
  nombre: string;
  role: WorkerRole;
  active: boolean;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp | null;
}
