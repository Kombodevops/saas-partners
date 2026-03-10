import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { db } from '@/lib/firebase';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 1024;

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen'));
    };
    img.src = url;
  });

const optimizeLogo = async (file: File): Promise<Blob> => {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  let width = img.width;
  let height = img.height;

  if (width > MAX_SIZE || height > MAX_SIZE) {
    const aspect = width / height;
    if (width > height) {
      width = MAX_SIZE;
      height = Math.round(MAX_SIZE / aspect);
    } else {
      height = MAX_SIZE;
      width = Math.round(MAX_SIZE * aspect);
    }
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el contexto de canvas');
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((result) => resolve(result), 'image/webp', 0.85)
  );
  if (!blob) throw new Error('No se pudo procesar el logo');
  return blob;
};

export class RestauranteLogoService {
  static async uploadLogo(restaurantId: string, file: File): Promise<string[]> {
    if (!restaurantId) return [];
    if (!ACCEPTED_TYPES.includes(file.type)) {
      throw new Error('Formato de imagen no admitido. Usa JPEG, PNG, GIF o WebP.');
    }

    const optimized = await optimizeLogo(file);
    const storage = getStorage();
    const timestamp = Date.now();
    const fileName = `logo_${restaurantId}_${timestamp}.webp`;
    const fileRef = ref(storage, `restaurants/${restaurantId}/logo/${fileName}`);

    await uploadBytes(fileRef, optimized, {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000',
    });

    const url = await getDownloadURL(fileRef);
    const docRef = doc(db, 'restaurants', restaurantId);
    await updateDoc(docRef, {
      'Logo del restaurante': [url],
    });

    return [url];
  }
}
