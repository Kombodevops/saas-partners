'use client';

import { useMemo, useState } from 'react';
import { Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import type { PackCatalogItem } from '@/lib/services/pack-catalog.service';

type EditableElement = Record<string, unknown>;

type Props = {
  pack: PackCatalogItem | null;
  selectedElement: EditableElement | null;
  selectedInterval: EditableElement | null;
  restauranteId: string;
  onSave: (element: EditableElement, interval: EditableElement | null) => void;
};

const asString = (value: unknown) => (value == null ? '' : String(value));

const getIntervalsForRestaurante = (element: EditableElement, restauranteId: string) => {
  const disponibilidad = (element.disponibilidadPorRestaurante ?? []) as Array<Record<string, unknown>>;
  const match = disponibilidad.find((item) => item.restauranteId === restauranteId);
  const intervalos = (match?.intervalos ?? element.intervalos ?? []) as Array<Record<string, unknown>>;
  return intervalos;
};

export function ElementoEditor({
  pack,
  selectedElement,
  selectedInterval,
  restauranteId,
  onSave,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EditableElement | null>(null);
  const [intervalDraft, setIntervalDraft] = useState<EditableElement | null>(null);

  const hasInterval = useMemo(
    () => Boolean(pack?.Subcategoria === 'Barra Libre'),
    [pack?.Subcategoria]
  );

  if (!selectedElement) return null;

  const handleOpen = () => {
    setDraft({ ...selectedElement });
    setIntervalDraft(selectedInterval ? { ...selectedInterval } : null);
    setOpen(true);
  };

  const handleSave = () => {
    if (!draft) return;
    onSave(draft, intervalDraft);
    setOpen(false);
  };

  const intervalos = getIntervalsForRestaurante(selectedElement, restauranteId);
  const nombre = asString(selectedElement.Nombre);
  const descripcion = asString(selectedElement.Descripción);
  const precio = selectedElement.Precio;

  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{nombre}</p>
          {descripcion && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">{descripcion}</p>
          )}
          {precio != null && (
            <p className="mt-2 text-xs font-medium text-slate-600">€{asString(precio)}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleOpen}>
          <Edit3 className="h-4 w-4" />
          Editar
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar elemento</DialogTitle>
            <DialogDescription>
              Estos cambios solo afectan a esta reserva, no al plan global.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Nombre</label>
                <Input
                  value={asString(draft.Nombre)}
                  onChange={(event) => setDraft({ ...draft, Nombre: event.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Descripción</label>
                <Textarea
                  value={asString(draft.Descripción)}
                  onChange={(event) => setDraft({ ...draft, Descripción: event.target.value })}
                />
              </div>
              {draft.Precio != null && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Precio</label>
                  <NumberInput
                    value={Number(draft.Precio ?? 0)}
                    onChangeValue={(value) => setDraft({ ...draft, Precio: value })}
                  />
                </div>
              )}

              {hasInterval && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Intervalo seleccionado</p>
                  <div className="mt-3">
                    <label className="text-xs font-medium text-slate-600">Intervalo disponible</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={asString(intervalDraft?.duracionMin)}
                      onChange={(event) => {
                        const next = intervalos.find(
                          (item) => String(item.duracionMin) === event.target.value
                        );
                        setIntervalDraft(next ? { ...next } : null);
                      }}
                    >
                      <option value="">Selecciona un intervalo</option>
                      {intervalos.map((interval) => (
                        <option key={String(interval.duracionMin)} value={String(interval.duracionMin)}>
                          {asString(interval.duracionMin)} - {asString(interval.duracionMax)} (€{asString(interval.precio)})
                        </option>
                      ))}
                    </select>
                  </div>
                  {intervalDraft ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600">Duración mínima</label>
                        <Input
                          value={asString(intervalDraft.duracionMin)}
                          onChange={(event) =>
                            setIntervalDraft({ ...intervalDraft, duracionMin: event.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Duración máxima</label>
                        <Input
                          value={asString(intervalDraft.duracionMax)}
                          onChange={(event) =>
                            setIntervalDraft({ ...intervalDraft, duracionMax: event.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Precio</label>
                        <NumberInput
                          value={Number(intervalDraft.precio ?? 0)}
                          onChangeValue={(value) =>
                            setIntervalDraft({ ...intervalDraft, precio: value })
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      Selecciona un intervalo antes de editar sus valores.
                    </p>
                  )}
                  {intervalos.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">
                      Este restaurante tiene {intervalos.length} intervalo(s) disponibles.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-[#7472fd] text-white" onClick={handleSave}>
              Guardar cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
