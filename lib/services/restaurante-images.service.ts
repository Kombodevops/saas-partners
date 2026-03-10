import { doc, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { db } from '@/lib/firebase';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 1920;

const isValidType = (file: File) => ACCEPTED_TYPES.includes(file.type);

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

const calcQuality = (bytes: number) => {
  const kb = bytes / 1024;
  if (kb > 5000) return 0.6;
  if (kb > 2000) return 0.65;
  if (kb > 1000) return 0.7;
  if (kb > 500) return 0.75;
  return 0.8;
};

const optimizeImage = async (file: File): Promise<Blob> => {
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

  const quality = calcQuality(file.size);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((result) => resolve(result), 'image/webp', quality)
  );
  if (!blob) throw new Error('No se pudo procesar la imagen');
  return blob;
};

export class RestauranteImagesService {
  static async uploadImages(restaurantId: string, files: File[], currentUrls: string[]): Promise<string[]> {
    if (!restaurantId || files.length === 0) return currentUrls;

    const invalid = files.filter((file) => !isValidType(file));
    if (invalid.length > 0) {
      throw new Error('Formato de imagen no admitido. Usa JPEG, PNG, GIF o WebP.');
    }

    const storage = getStorage();
    const urls: string[] = [];

    for (const file of files) {
      const optimized = await optimizeImage(file);
      const timestamp = Date.now();
      const fileName = `restaurant_${restaurantId}_${timestamp}.webp`;
      const fileRef = ref(storage, `restaurants/${restaurantId}/${fileName}`);
      await uploadBytes(fileRef, optimized, {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000',
      });
      const url = await getDownloadURL(fileRef);
      urls.push(url);
    }

    const nextUrls = [...currentUrls, ...urls];
    if (nextUrls.length > 0) {
      const docRef = doc(db, 'restaurants', restaurantId);
      await updateDoc(docRef, {
        'Imagenes del restaurante': nextUrls,
      });
    }

    return nextUrls;
  }

  static async reorderImages(restaurantId: string, urls: string[]): Promise<void> {
    const docRef = doc(db, 'restaurants', restaurantId);
    await updateDoc(docRef, {
      'Imagenes del restaurante': urls,
    });
  }

  static async deleteImage(restaurantId: string, urlToDelete: string, nextUrls: string[]): Promise<void> {
    const docRef = doc(db, 'restaurants', restaurantId);
    await updateDoc(docRef, {
      'Imagenes del restaurante': nextUrls,
    });

    if (urlToDelete) {
      const storage = getStorage();
      await deleteObject(ref(storage, urlToDelete));
    }
  }
}
