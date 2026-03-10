import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CartaEditor } from '@/app/restaurantes/components/editors/carta-editor';
import { ChevronRight } from 'lucide-react';
interface CartaCardProps {
  restauranteId: string;
  cartaItems: { key: string; Nombre: string; url: string }[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdated: (items: { key: string; Nombre: string; url: string }[]) => void;
}

export function CartaCard({ restauranteId, cartaItems, onUpdated, isOpen, onOpenChange }: CartaCardProps) {
  const [open, setOpen] = useState(false);
  const dialogOpen = isOpen ?? open;
  const setDialogOpen = onOpenChange ?? setOpen;

  const visibleItems = cartaItems.slice(0, 2);

  return (
    <Card id="carta" className="border-none bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>Carta</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </CardTitle>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {cartaItems.length}
        </span>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3 text-sm">
        <div className="space-y-3">
          {cartaItems.length === 0 ? (
            <p className="text-slate-500">Sin carta asociada.</p>
          ) : (
            visibleItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                <div>
                  <p className="font-medium text-slate-700">{item.Nombre}</p>
                  <p className="text-xs text-slate-400">{item.key}</p>
                </div>
                <a href={item.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#7472fd]">
                  Ver PDF
                </a>
              </div>
            ))
          )}
        </div>
        <Button
          variant="outline"
          className="mt-auto w-full hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
          onClick={() => setDialogOpen(true)}
        >
          Editar carta
        </Button>
        <CartaEditor
          restauranteId={restauranteId}
          items={cartaItems}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onUpdated={onUpdated}
        />
      </CardContent>
    </Card>
  );
}
