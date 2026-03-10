import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { db } from '@/lib/firebase';

export interface CartaItem {
  Nombre: string;
  url: string;
}

type CartaMap = Record<string, CartaItem>;

const buildCartaMap = (value: unknown): CartaMap => {
  if (!value || typeof value !== 'object') return {};
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.reduce<CartaMap>((acc, [key, item]) => {
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      const nombre = typeof record.Nombre === 'string' ? record.Nombre : '';
      const url = typeof record.url === 'string' ? record.url : '';
      if (nombre && url) {
        acc[key] = { Nombre: nombre, url };
      }
    }
    return acc;
  }, {});
};

const getNextPdfIndex = (carta: CartaMap): number => {
  const existing = Object.keys(carta)
    .filter((key) => key.startsWith('pdf'))
    .map((key) => Number(key.replace('pdf', '')))
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);

  for (let i = 0; i < existing.length; i += 1) {
    if (existing[i] !== i) return i;
  }
  return existing.length;
};

const reorganizePdfs = (carta: CartaMap): CartaMap => {
  const pdfEntries = Object.entries(carta)
    .filter(([key]) => key.startsWith('pdf'))
    .map(([key, value]) => [key, value] as const)
    .sort((a, b) => Number(a[0].replace('pdf', '')) - Number(b[0].replace('pdf', '')));

  const next: CartaMap = {};
  Object.entries(carta).forEach(([key, value]) => {
    if (!key.startsWith('pdf')) {
      next[key] = value;
    }
  });

  pdfEntries.forEach(([, value], index) => {
    next[`pdf${index}`] = value;
  });

  return next;
};

export class RestauranteCartaService {
  static async verifyPdfNames(restauranteId: string, names: string[]): Promise<boolean> {
    if (!restauranteId) return false;
    const refDoc = doc(db, 'restaurants', restauranteId);
    const snapshot = await getDoc(refDoc);
    if (!snapshot.exists()) return true;
    const carta = buildCartaMap(snapshot.data().Carta);
    const existingNames = new Set(Object.values(carta).map((item) => item.Nombre));
    return names.every((name) => !existingNames.has(name));
  }

  static async uploadPdfs(
    restauranteId: string,
    files: File[],
    names: string[]
  ): Promise<CartaMap> {
    if (!restauranteId) return {};
    const refDoc = doc(db, 'restaurants', restauranteId);
    const snapshot = await getDoc(refDoc);
    const carta = buildCartaMap(snapshot.data()?.Carta);

    let nextIndex = getNextPdfIndex(carta);
    const storage = getStorage();

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const name = names[i];
      const timestamp = Date.now();
      const fileName = `carta_${restauranteId}_${timestamp}_${i}.pdf`;
      const storageRef = ref(storage, `cartas/${restauranteId}/${fileName}`);
      await uploadBytes(storageRef, file, { contentType: 'application/pdf' });
      const url = await getDownloadURL(storageRef);
      carta[`pdf${nextIndex}`] = { Nombre: name, url };
      nextIndex += 1;
    }

    await updateDoc(refDoc, { Carta: carta });
    return carta;
  }

  static async deletePdf(
    restauranteId: string,
    cartaKey: string,
    pdfUrl: string
  ): Promise<CartaMap> {
    if (!restauranteId) return {};
    const refDoc = doc(db, 'restaurants', restauranteId);
    const snapshot = await getDoc(refDoc);
    const carta = buildCartaMap(snapshot.data()?.Carta);
    const next = { ...carta };
    delete next[cartaKey];
    const reorganized = reorganizePdfs(next);
    await updateDoc(refDoc, { Carta: reorganized });

    try {
      const storage = getStorage();
      const urlRef = ref(storage, pdfUrl);
      await deleteObject(urlRef);
    } catch {
      // Ignore storage delete failures.
    }

    return reorganized;
  }
}
