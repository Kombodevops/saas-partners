'use client';

import { useMemo, useRef, useState } from 'react';
import { GripVertical, ImagePlus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RestauranteImagesService } from '@/lib/services/restaurante-images.service';
import { RestauranteLogoService } from '@/lib/services/restaurante-logo.service';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface RestauranteImagesEditorProps {
  restauranteId: string;
  images: string[];
  logo: string[];
  onLogoChange: (nextLogo: string[]) => void;
  onChange: (nextImages: string[]) => void;
}

export function RestauranteImagesEditor({ restauranteId, images, logo, onLogoChange, onChange }: RestauranteImagesEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const hasImages = images.length > 0;
  const visibleImages = useMemo(() => images, [images]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    try {
      setError(null);
      setIsSaving(true);
      const nextUrls = await RestauranteImagesService.uploadImages(restauranteId, files, images);
      onChange(nextUrls);
    } catch (err) {
      console.error('Error subiendo imagenes:', err);
      setError(err instanceof Error ? err.message : 'No se pudieron subir las imagenes');
    } finally {
      setIsSaving(false);
      event.target.value = '';
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setPendingLogoFile(file);
      setCrop(undefined);
      setCompletedCrop(null);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const onImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = event.currentTarget;
    imageRef.current = event.currentTarget;
    const nextCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width,
      height
    );
    setCrop(nextCrop);
  };

  const createCroppedBlob = async (sourceImage: HTMLImageElement, pixelCrop: PixelCrop) => {
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo preparar el recorte');

    const scaleX = sourceImage.naturalWidth / sourceImage.width;
    const scaleY = sourceImage.naturalHeight / sourceImage.height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      sourceImage,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar el recorte'));
      }, 'image/jpeg', 0.92);
    });
  };

  const handleConfirmCrop = async () => {
    if (!cropSrc || !pendingLogoFile || !completedCrop || !imageRef.current) return;
    try {
      setError(null);
      setIsSaving(true);
      const blob = await createCroppedBlob(imageRef.current, completedCrop);
      const croppedFile = new File([blob], pendingLogoFile.name, { type: 'image/jpeg' });
      const nextLogo = await RestauranteLogoService.uploadLogo(restauranteId, croppedFile);
      onLogoChange(nextLogo);
    } catch (err) {
      console.error('Error subiendo logo:', err);
      setError(err instanceof Error ? err.message : 'No se pudo subir el logo');
    } finally {
      setIsSaving(false);
      setCropOpen(false);
      setPendingLogoFile(null);
    }
  };

  const handleDelete = async (index: number) => {
    const next = images.filter((_, idx) => idx !== index);
    const urlToDelete = images[index];
    setIsSaving(true);
    try {
      await RestauranteImagesService.deleteImage(restauranteId, urlToDelete, next);
      onChange(next);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrop = async (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const reordered = [...images];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setDragIndex(null);
    setIsSaving(true);
    try {
      await RestauranteImagesService.reorderImages(restauranteId, reordered);
      onChange(reordered);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-slate-500">
            {hasImages ? 'Arrastra para reordenar.' : 'Sube imagenes para mostrar el restaurante.'}
          </p>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Star className="h-4 w-4 text-amber-500" />
            La primera imagen es la primera impresión del restaurante para los clientes. Pon tu mejor foto.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            className="gap-2"
            onClick={() => logoInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            {isSaving ? 'Guardando...' : logo[0] ? 'Cambiar logo' : 'Subir logo'}
          </Button>
          <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            className="gap-2"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            {isSaving ? 'Guardando...' : 'Subir imagenes'}
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-rose-500">{error}</p>}

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Logo</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-2xl bg-white">
            {logo[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo[0]} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">Sin logo</div>
            )}
          </div>
          <p className="text-sm text-slate-500">Este logo se muestra en el perfil publico.</p>
        </div>
      </div>

      {hasImages ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleImages.map((url, index) => (
            <div
              key={`${url}-${index}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(index)}
              className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Imagen restaurante" className="h-44 w-full object-cover" />
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-white/90 px-2 py-1 text-xs text-slate-600">
                <GripVertical className="h-3 w-3" />
                {index === 0 ? (
                  <>
                    <Star className="h-3 w-3 text-amber-500" />
                    Foto estrella
                  </>
                ) : (
                  index + 1
                )}
              </div>
              <button
                type="button"
                className="absolute right-3 top-3 rounded-full border border-rose-200 bg-rose-50 p-2 text-rose-600 opacity-0 transition group-hover:opacity-100"
                onClick={() => {
                  const confirmed = window.confirm('Eliminar esta imagen? Esta accion no se puede deshacer.');
                  if (confirmed) handleDelete(index);
                }}
              >
                <Trash2 className="h-4 w-4 text-rose-600" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          No hay imagenes.
        </div>
      )}

      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Recortar logo</DialogTitle>
            <DialogDescription>
              Ajusta la imagen para que el logo quede perfectamente cuadrado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                {cropSrc && (
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(pixel) => setCompletedCrop(pixel)}
                    aspect={1}
                    minWidth={120}
                    className="max-h-[320px] max-w-[320px]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cropSrc} alt="Recorte logo" onLoad={onImageLoad} />
                  </ReactCrop>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCropOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]" onClick={handleConfirmCrop} disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar logo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
