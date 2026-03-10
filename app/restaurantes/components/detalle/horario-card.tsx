'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronRight } from 'lucide-react';
import { RestauranteHorarioEditor } from '@/app/restaurantes/components/editors/horario-editor';
import { Timestamp } from 'firebase/firestore';
import type { RestauranteHorarioForm } from '@/lib/validators/restaurante-horario';
import type { RestauranteDetalleDoc } from '@/lib/validators/restaurante-detalle';

interface HorarioCardProps {
  restauranteId: string;
  horarioEntries: [string, { cerrado: boolean; intervalos: { horaInicio: Timestamp; horaFin: Timestamp }[] }][];
  horarioForm: RestauranteHorarioForm;
  onUpdated: (next: RestauranteDetalleDoc) => void;
  data: RestauranteDetalleDoc;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const formatTimestamp = (value: Timestamp) => {
  const date = value.toDate();
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

export function HorarioCard({
  restauranteId,
  horarioEntries,
  horarioForm,
  onUpdated,
  data,
  isOpen,
  onOpenChange,
}: HorarioCardProps) {
  const dialogOpen = isOpen;
  const setDialogOpen = onOpenChange;
  const visibleItems = horarioEntries.slice(0, 2);

  return (
    <Card id="horario" className="border-none bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>Horario</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </CardTitle>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {horarioEntries.length}
        </span>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3 text-sm">
        <div className="space-y-3">
          {horarioEntries.length === 0 ? (
            <p className="text-slate-500">Sin horarios configurados.</p>
          ) : (
            visibleItems.map(([dia, info]) => (
              <div key={dia} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                <span className="font-medium text-slate-700">{dia}</span>
                {info.cerrado ? (
                  <span className="text-xs text-rose-500">Cerrado</span>
                ) : (
                  <div className="text-xs text-slate-500">
                    {info.intervalos.map((intervalo, index) => (
                      <span key={`${dia}-${index}`} className="ml-2">
                        {formatTimestamp(intervalo.horaInicio)} - {formatTimestamp(intervalo.horaFin)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="mt-auto w-full hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
            >
              Editar horario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar horario</DialogTitle>
            </DialogHeader>
            <RestauranteHorarioEditor
              restauranteId={restauranteId}
              initialHorario={horarioForm}
              onChange={(nextHorario) =>
                onUpdated({
                  ...data,
                  horario: Object.fromEntries(
                    Object.entries(nextHorario.dias).map(([dia, value]) => [
                      dia,
                      {
                        cerrado: value.cerrado,
                        intervalos: value.intervalos.map((intervalo) => ({
                          horaInicio: new Timestamp(
                            Math.floor(new Date(`2023-01-01T${intervalo.horaInicio}:00`).getTime() / 1000),
                            0
                          ),
                          horaFin: new Timestamp(
                            Math.floor(new Date(`2023-01-01T${intervalo.horaFin}:00`).getTime() / 1000),
                            0
                          ),
                        })),
                      },
                    ])
                  ),
                })
              }
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
