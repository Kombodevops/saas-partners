'use client';

import { useMemo, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RestauranteCartaService } from '@/lib/services/restaurante-carta.service';

interface CartaEditorProps {
  restauranteId: string;
  items: { key: string; Nombre: string; url: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (next: { key: string; Nombre: string; url: string }[]) => void;
}

const normalizeItems = (items: { key: string; Nombre: string; url: string }[]) =>
  items
    .slice()
    .sort((a, b) => {
      const indexA = Number(a.key.replace('pdf', ''));
      const indexB = Number(b.key.replace('pdf', ''));
      if (!Number.isNaN(indexA) && !Number.isNaN(indexB)) {
        return indexA - indexB;
      }
      return a.key.localeCompare(b.key);
    });

export function CartaEditor({ restauranteId, items, open, onOpenChange, onUpdated }: CartaEditorProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    key: string;
    url: string;
    nombre: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => normalizeItems(items), [items]);

  const handleSelectFiles = (files: FileList | null) => {
    if (!files) return;
    const nextFiles = Array.from(files).filter((file) => file.type === 'application/pdf');
    setSelectedFiles(nextFiles);
    setNames(nextFiles.map((file) => file.name.replace(/\.pdf$/i, '')));
  };

  const handleNameChange = (index: number, value: string) => {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) return;
    const trimmedNames = names.map((name) => name.trim());
    if (trimmedNames.some((name) => !name)) {
      setError('Todos los nombres son obligatorios.');
      return;
    }
    const uniqueOk = await RestauranteCartaService.verifyPdfNames(restauranteId, trimmedNames);
    if (!uniqueOk) {
      setError('Ya existe una carta con uno de estos nombres.');
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const cartaMap = await RestauranteCartaService.uploadPdfs(restauranteId, selectedFiles, trimmedNames);
      const nextItems = Object.entries(cartaMap).map(([key, value]) => ({ key, ...value }));
      onUpdated(nextItems);
      setSelectedFiles([]);
      setNames([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir los PDFs.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (item: { key: string; url: string; nombre: string }) => {
    setConfirmDelete(null);
    setIsDeleting(item.key);
    setError(null);
    try {
      const cartaMap = await RestauranteCartaService.deletePdf(restauranteId, item.key, item.url);
      const nextItems = Object.entries(cartaMap).map(([key, value]) => ({ key, ...value }));
      onUpdated(nextItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el PDF.');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar carta</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="border-dashed border-[#7472fd]/40 bg-[#7472fd]/5">
            <CardHeader>
              <CardTitle className="text-sm text-[#4b49c7]">Subir PDFs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="file"
                multiple
                accept="application/pdf"
                onChange={(event) => handleSelectFiles(event.target.files)}
              />
              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Edita el nombre que se mostrará en la carta.
                  </p>
                  {selectedFiles.map((file, index) => (
                    <div key={file.name} className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold text-slate-500">{file.name}</p>
                      <Input
                        value={names[index] ?? ''}
                        onChange={(event) => handleNameChange(index, event.target.value)}
                        placeholder="Ejemplo: Carta de postres"
                        className="mt-2"
                      />
                    </div>
                  ))}
                </div>
              )}
              <Button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || selectedFiles.length === 0}
                className="gap-2 bg-[#7472fd] text-white"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'Subiendo...' : 'Subir PDFs'}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-800">Archivos actuales</p>
            {list.length === 0 ? (
              <p className="text-sm text-slate-500">No hay PDFs cargados.</p>
            ) : (
              list.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.Nombre}</p>
                    <p className="text-xs text-slate-500">{item.key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#7472fd]"
                    >
                      Ver PDF
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => setConfirmDelete({ key: item.key, url: item.url, nombre: item.Nombre })}
                      disabled={isDeleting === item.key}
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {error && <p className="text-sm text-rose-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>

      <Dialog open={!!confirmDelete} onOpenChange={(value) => (!value ? setConfirmDelete(null) : null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar PDF</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            ¿Seguro que quieres eliminar &quot;{confirmDelete?.nombre}&quot;? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-rose-600 text-white"
              onClick={() =>
                confirmDelete &&
                handleDelete({
                  key: confirmDelete.key,
                  url: confirmDelete.url,
                  nombre: confirmDelete.nombre,
                })
              }
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
