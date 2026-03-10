import {
  collection,
  doc,
  FieldValue,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, deleteUser, signOut } from 'firebase/auth';
import { db, workerAuth } from '@/lib/firebase';
import type { Worker, WorkerRole } from '@/lib/types/worker';

interface WorkerPayload {
  partnerId: string;
  email: string;
  nombre: string;
  role: WorkerRole;
  active: boolean;
  createdAt?: Timestamp | FieldValue;
  lastLoginAt?: Timestamp | null;
}

const mapWorker = (id: string, data: WorkerPayload): Worker => ({
  id,
  partnerId: data.partnerId,
  email: data.email,
  nombre: data.nombre,
  role: data.role,
  active: data.active,
  createdAt: data.createdAt as Timestamp | undefined,
  lastLoginAt: data.lastLoginAt ?? null,
});

export class WorkersService {
  static async listWorkers(partnerId: string): Promise<Worker[]> {
    const workersRef = collection(db, 'workers');
    const q = query(workersRef, where('partnerId', '==', partnerId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => mapWorker(docSnap.id, docSnap.data() as WorkerPayload));
  }

  static async getWorkerById(workerId: string): Promise<Worker | null> {
    const workerDoc = await getDoc(doc(db, 'workers', workerId));
    if (!workerDoc.exists()) return null;
    return mapWorker(workerDoc.id, workerDoc.data() as WorkerPayload);
  }

  static async createWorker(params: {
    partnerId: string;
    email: string;
    password: string;
    nombre: string;
    role: WorkerRole;
  }): Promise<Worker> {
    const { partnerId, email, password, nombre, role } = params;
    const credential = await createUserWithEmailAndPassword(workerAuth, email, password);
    const user = credential.user;

    const payload: WorkerPayload = {
      partnerId,
      email,
      nombre,
      role,
      active: true,
      createdAt: serverTimestamp(),
      lastLoginAt: null,
    };

    try {
      await setDoc(doc(db, 'workers', user.uid), payload);
      return mapWorker(user.uid, payload);
    } catch (error) {
      await deleteUser(user);
      throw error;
    } finally {
      await signOut(workerAuth);
    }
  }

  static async setWorkerActive(workerId: string, active: boolean): Promise<void> {
    await updateDoc(doc(db, 'workers', workerId), { active });
  }
}
