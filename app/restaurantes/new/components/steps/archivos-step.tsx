import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ArchivosStepProps {
  imagenes: File[];
  logo: File | null;
  pdfs: File[];
  pdfNames: string[];
  onImagenesChange: (files: File[]) => void;
  onLogoChange: (file: File | null) => void;
  onPdfsChange: (files: File[]) => void;
  onPdfNameChange: (names: string[]) => void;
}

export function ArchivosStep({
  imagenes,
  logo,
  pdfs,
  pdfNames,
  onImagenesChange,
  onLogoChange,
  onPdfsChange,
  onPdfNameChange,
}: ArchivosStepProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);

  const handleRemoveImagen = (index: number) => {
    const next = imagenes.filter((_, idx) => idx !== index);
    onImagenesChange(next);
  };

  const handleRemovePdf = (index: number) => {
    const nextFiles = pdfs.filter((_, idx) => idx !== index);
    const nextNames = pdfNames.filter((_, idx) => idx !== index);
    onPdfsChange(nextFiles);
    onPdfNameChange(nextNames);
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
    const blob = await createCroppedBlob(imageRef.current, completedCrop);
    const croppedFile = new File([blob], pendingLogoFile.name, { type: 'image/jpeg' });
    onLogoChange(croppedFile);
    setCropOpen(false);
    setPendingLogoFile(null);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-700">Imágenes</label>
          <span className="text-xs text-slate-500">JPEG, PNG o WebP</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={imageInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(event) => onImagenesChange(Array.from(event.target.files ?? []))}
          />
          <Button
            type="button"
            className={`gap-2 ${
              imagenes.length > 0
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-[#7472fd] text-white hover:bg-[#5f5bf2]'
            }`}
            onClick={() => imageInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            {imagenes.length > 0 ? 'Imágenes añadidas' : 'Añadir imágenes'}
          </Button>
        </div>
        {imagenes.length > 0 && (
          <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{imagenes.length} imágenes seleccionadas</p>
            <div className="space-y-2">
              {imagenes.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
                  <span className="truncate">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50"
                    onClick={() => handleRemoveImagen(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-700">Logo</label>
          <span className="text-xs text-slate-500">Solo 1 archivo</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = (event.target.files ?? [])[0] ?? null;
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
            }}
          />
          <Button
            type="button"
            className={`gap-2 ${
              logo ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-[#7472fd] text-white hover:bg-[#5f5bf2]'
            }`}
            onClick={() => logoInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {logo ? 'Logo añadido' : 'Subir logo'}
          </Button>
        </div>
        {logo && (
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span className="truncate">Logo seleccionado: {logo.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50"
              onClick={() => onLogoChange(null)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Dialog open={cropOpen} onOpenChange={setCropOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Recortar logo</DialogTitle>
            </DialogHeader>
            {cropSrc && (
              <div className="space-y-4">
                <ReactCrop
                  crop={crop}
                  onChange={(next) => setCrop(next)}
                  onComplete={(next) => setCompletedCrop(next)}
                  aspect={1}
                  className="max-h-[60vh] w-full"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cropSrc} onLoad={onImageLoad} alt="Recorte logo" />
                </ReactCrop>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCropOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" className="bg-[#7472fd] text-white" onClick={handleConfirmCrop}>
                    Confirmar recorte
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-700">PDFs de carta</label>
          <span className="text-xs text-slate-500">Puedes subir varios PDFs</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={pdfInputRef}
            type="file"
            multiple
            accept="application/pdf"
            className="hidden"
            onChange={(event) => onPdfsChange(Array.from(event.target.files ?? []))}
          />
          <Button
            type="button"
            className={`gap-2 ${
              pdfs.length > 0
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-[#7472fd] text-white hover:bg-[#5f5bf2]'
            }`}
            onClick={() => pdfInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {pdfs.length > 0 ? 'PDFs añadidos' : 'Añadir PDFs'}
          </Button>
        </div>
      </div>
      {pdfs.length > 0 && (
        <div className="space-y-2">
          {pdfs.map((file, index) => (
            <div key={`${file.name}-${index}`} className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:bg-rose-50"
                  onClick={() => handleRemovePdf(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                placeholder={`Nombre PDF ${index + 1}`}
                value={pdfNames[index] ?? ''}
                onChange={(event) => {
                  const next = [...pdfNames];
                  next[index] = event.target.value;
                  onPdfNameChange(next);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
