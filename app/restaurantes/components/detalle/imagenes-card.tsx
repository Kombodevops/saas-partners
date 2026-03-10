'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronRight } from 'lucide-react';
import { RestauranteImagesEditor } from '@/app/restaurantes/components/editors/images-editor';
import type { RestauranteDetalleDoc } from '@/lib/validators/restaurante-detalle';

interface ImagenesCardProps {
  restauranteId: string;
  data: RestauranteDetalleDoc;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdated: (next: RestauranteDetalleDoc) => void;
}

export function ImagenesCard({ restauranteId, data, onUpdated, isOpen, onOpenChange }: ImagenesCardProps) {
  const dialogOpen = isOpen;
  const setDialogOpen = onOpenChange;
  const images = data['Imagenes del restaurante'] ?? [];
  const logo = data['Logo del restaurante'] ?? [];

  return (
    <Card id="imagenes" className="border-none bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>Imagenes y logo</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </CardTitle>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {images.length}
        </span>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-2xl bg-slate-100">
              {logo[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo[0]}
                  alt={data['Nombre del restaurante']}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <p className="text-sm text-slate-500">Logo principal</p>
          </div>
          <div className="flex items-center gap-3">
            {images[0] ? (
              <div className="h-24 w-32 overflow-hidden rounded-2xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[0]}
                  alt="Imagen restaurante"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-24 w-32 rounded-2xl bg-slate-100" />
            )}
            {images.length > 1 && (
              <div className="rounded-2xl border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600">
                +{images.length - 1} imágenes
              </div>
            )}
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="mt-auto w-full hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
            >
              Editar imagenes
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar imagenes del restaurante</DialogTitle>
            </DialogHeader>
            <RestauranteImagesEditor
              restauranteId={restauranteId}
              images={images}
              logo={logo}
              onLogoChange={(nextLogo) =>
                onUpdated({
                  ...data,
                  'Logo del restaurante': nextLogo,
                })
              }
              onChange={(nextImages) =>
                onUpdated({
                  ...data,
                  'Imagenes del restaurante': nextImages,
                })
              }
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
