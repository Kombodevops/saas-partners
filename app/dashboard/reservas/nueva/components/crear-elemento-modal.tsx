'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { PackEditService } from '@/lib/services/pack-edit.service';
import type { PackEditForm, MenuEditForm, TicketEditForm, BarraLibreEditForm } from '@/lib/validators/pack-edit';

type PackKind = 'Menú' | 'Tickets' | 'Barra Libre' | 'Cocktail';

type Props = {
  packId: string;
  packKind: PackKind;
  restauranteId: string;
  onCreated: (element: MenuEditForm | TicketEditForm | BarraLibreEditForm) => void;
};

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function CrearElementoModal({ packId, packKind, restauranteId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState<number>(0);
  const [duracionMin, setDuracionMin] = useState('2 horas');
  const [duracionMax, setDuracionMax] = useState('3 horas');
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<'reserva' | 'pack' | 'restaurante' | null>(null);
  const [diasDisponibles, setDiasDisponibles] = useState<string[]>(DIAS);

  const reset = () => {
    setNombre('');
    setDescripcion('');
    setPrecio(0);
    setDuracionMin('2 horas');
    setDuracionMax('3 horas');
    setDiasDisponibles(DIAS);
    setScope(null);
  };

  const handleSave = async () => {
    if (!packId || !nombre || !descripcion) return;
    if (scope === 'restaurante' && diasDisponibles.length === 0) return;
    setSaving(true);
    try {
      if (scope === 'reserva' || scope === null) {
        const entry = buildEntry({
          restaurantesIds: [],
          disponibilidad: [],
          packKind,
          nombre,
          descripcion,
          precio,
          duracionMin,
          duracionMax,
        });
        if (entry) onCreated(entry);
        reset();
        setOpen(false);
        return;
      }

      if (scope === 'pack') {
        const pack = await PackEditService.getPackById(packId);
        if (!pack) return;

        const toNumber = (value: unknown) => (typeof value === 'number' ? value : Number(value) || 0);
        const toBool = (value: unknown) => (typeof value === 'boolean' ? value : value === 'true');
        const ensureArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
        const asObject = (value: unknown): Record<string, unknown> =>
          value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
        const normalizeMenu = (value: unknown) => {
          const obj = asObject(value);
          return {
            Nombre: String(obj.Nombre ?? ''),
            Descripción: String(obj['Descripción'] ?? obj.Descripción ?? ''),
            Precio: toNumber(obj.Precio),
            tipoServicio: typeof obj.tipoServicio === 'string' ? obj.tipoServicio : undefined,
            restaurantesIds: ensureArray<string>(obj.restaurantesIds),
            disponibilidadPorRestaurante: ensureArray<{ restauranteId: string; diasDisponibles: string[] }>(
              obj.disponibilidadPorRestaurante
            ),
          };
        };
        const normalizeTicket = (value: unknown) => {
          const obj = asObject(value);
          return {
            Nombre: String(obj.Nombre ?? ''),
            Descripción: String(obj['Descripción'] ?? obj.Descripción ?? ''),
            Precio: toNumber(obj.Precio),
            restaurantesIds: ensureArray<string>(obj.restaurantesIds),
            disponibilidadPorRestaurante: ensureArray<{ restauranteId: string; diasDisponibles: string[] }>(
              obj.disponibilidadPorRestaurante
            ),
          };
        };
        const normalizeBarra = (value: unknown) => {
          const obj = asObject(value);
          return {
            Nombre: String(obj.Nombre ?? ''),
            Descripción: String(obj['Descripción'] ?? obj.Descripción ?? ''),
            restaurantesIds: ensureArray<string>(obj.restaurantesIds),
            disponibilidadPorRestaurante: ensureArray<{ restauranteId: string; diasDisponibles: string[] }>(
              obj.disponibilidadPorRestaurante
            ),
            intervalos: ensureArray(obj.intervalos).map((intervalo) => {
              const intervaloObj = asObject(intervalo);
              return {
                duracionMin: String(intervaloObj.duracionMin ?? ''),
                duracionMax: String(intervaloObj.duracionMax ?? ''),
                precio: toNumber(intervaloObj.precio),
              };
            }),
          };
        };

        let payload: PackEditForm = {
          'Nombre del pack': pack['Nombre del pack'],
          'Descripción': pack['Descripción'],
          Precio: toNumber(pack.Precio),
          activo: toBool(pack.activo),
          Categoria: pack.Categoria ?? '',
          Subcategoria: pack.Subcategoria ?? '',
          tipoPlan: ensureArray<string>(pack.tipoPlan),
          restaurantesIds: ensureArray<string>(pack.restaurantesIds),
          restaurantesPermiteComida: ensureArray<string>(pack.restaurantesPermiteComida),
          Menus: ensureArray(pack.Menus).map(normalizeMenu),
          Tickets: ensureArray(pack.Tickets).map(normalizeTicket),
          'Barra Libre': ensureArray(pack['Barra Libre']).map(normalizeBarra),
        };

        const entry = buildEntry({
          restaurantesIds: [],
          disponibilidad: [],
          packKind,
          nombre,
          descripcion,
          precio,
          duracionMin,
          duracionMax,
        });
        if (!entry) return;
        if (packKind === 'Menú' || packKind === 'Cocktail') {
          payload.Menus = [...(payload.Menus ?? []), entry as MenuEditForm];
        } else if (packKind === 'Tickets') {
          payload.Tickets = [...(payload.Tickets ?? []), entry as TicketEditForm];
        } else if (packKind === 'Barra Libre') {
          payload['Barra Libre'] = [...(payload['Barra Libre'] ?? []), entry as BarraLibreEditForm];
        }
        onCreated(entry);

        await PackEditService.updatePack(packId, payload);
        reset();
        setOpen(false);
        return;
      }

      const pack = await PackEditService.getPackById(packId);
      if (!pack) return;

      const toNumber = (value: unknown) => (typeof value === 'number' ? value : Number(value) || 0);
      const toBool = (value: unknown) => (typeof value === 'boolean' ? value : value === 'true');
      const ensureArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
      const asObject = (value: unknown): Record<string, unknown> =>
        value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
      const normalizeMenu = (value: unknown) => {
        const obj = asObject(value);
        return {
          Nombre: String(obj.Nombre ?? ''),
          Descripción: String(obj['Descripción'] ?? obj.Descripción ?? ''),
          Precio: toNumber(obj.Precio),
          tipoServicio: typeof obj.tipoServicio === 'string' ? obj.tipoServicio : undefined,
          restaurantesIds: ensureArray<string>(obj.restaurantesIds),
          disponibilidadPorRestaurante: ensureArray<{ restauranteId: string; diasDisponibles: string[] }>(
            obj.disponibilidadPorRestaurante
          ),
        };
      };
      const normalizeTicket = (value: unknown) => {
        const obj = asObject(value);
        return {
          Nombre: String(obj.Nombre ?? ''),
          Descripción: String(obj['Descripción'] ?? obj.Descripción ?? ''),
          Precio: toNumber(obj.Precio),
          restaurantesIds: ensureArray<string>(obj.restaurantesIds),
          disponibilidadPorRestaurante: ensureArray<{ restauranteId: string; diasDisponibles: string[] }>(
            obj.disponibilidadPorRestaurante
          ),
        };
      };
      const normalizeBarra = (value: unknown) => {
        const obj = asObject(value);
        return {
          Nombre: String(obj.Nombre ?? ''),
          Descripción: String(obj['Descripción'] ?? obj.Descripción ?? ''),
          restaurantesIds: ensureArray<string>(obj.restaurantesIds),
          disponibilidadPorRestaurante: ensureArray<{ restauranteId: string; diasDisponibles: string[] }>(
            obj.disponibilidadPorRestaurante
          ),
          intervalos: ensureArray(obj.intervalos).map((intervalo) => {
            const intervaloObj = asObject(intervalo);
            return {
              duracionMin: String(intervaloObj.duracionMin ?? ''),
              duracionMax: String(intervaloObj.duracionMax ?? ''),
              precio: toNumber(intervaloObj.precio),
            };
          }),
        };
      };

      const disponibilidad = [{ restauranteId, diasDisponibles }];
      const restaurantesIds = [restauranteId];
      let payload: PackEditForm = {
        'Nombre del pack': pack['Nombre del pack'],
        'Descripción': pack['Descripción'],
        Precio: toNumber(pack.Precio),
        activo: toBool(pack.activo),
        Categoria: pack.Categoria ?? '',
        Subcategoria: pack.Subcategoria ?? '',
        tipoPlan: ensureArray<string>(pack.tipoPlan),
        restaurantesIds: ensureArray<string>(pack.restaurantesIds),
        restaurantesPermiteComida: ensureArray<string>(pack.restaurantesPermiteComida),
        Menus: ensureArray(pack.Menus).map(normalizeMenu),
        Tickets: ensureArray(pack.Tickets).map(normalizeTicket),
        'Barra Libre': ensureArray(pack['Barra Libre']).map(normalizeBarra),
      };

      const entry = buildEntry({
        restaurantesIds,
        disponibilidad,
        packKind,
        nombre,
        descripcion,
        precio,
        duracionMin,
        duracionMax,
      });
      if (!entry) return;
      if (packKind === 'Menú' || packKind === 'Cocktail') {
        payload.Menus = [...(payload.Menus ?? []), entry as MenuEditForm];
      } else if (packKind === 'Tickets') {
        payload.Tickets = [...(payload.Tickets ?? []), entry as TicketEditForm];
      } else if (packKind === 'Barra Libre') {
        payload['Barra Libre'] = [...(payload['Barra Libre'] ?? []), entry as BarraLibreEditForm];
      }
      onCreated(entry);

      await PackEditService.updatePack(packId, payload);
      reset();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const label = packKind.toLowerCase();

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Crear {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Crear {label}</DialogTitle>
            <DialogDescription>
              Decide si quieres usarlo solo en esta reserva, guardarlo en el pack o dejarlo ya disponible en el restaurante.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Nombre</label>
              <Input value={nombre} onChange={(event) => setNombre(event.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Descripción</label>
              <Textarea value={descripcion} onChange={(event) => setDescripcion(event.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Precio</label>
              <NumberInput value={precio} onChangeValue={(value) => setPrecio(value)} />
            </div>

            {packKind === 'Barra Libre' && (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Duración mínima</label>
                  <Input value={duracionMin} onChange={(event) => setDuracionMin(event.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Duración máxima</label>
                  <Input value={duracionMax} onChange={(event) => setDuracionMax(event.target.value)} />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700">
                ¿Dónde quieres guardar este {packKind.toLowerCase()}?
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    scope === 'reserva'
                      ? 'border-[#7472fd]/40 bg-[#7472fd]/10 text-[#3b3af2]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setScope('reserva')}
                >
                  Solo esta reserva
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    scope === 'pack'
                      ? 'border-[#7472fd]/40 bg-[#7472fd]/10 text-[#3b3af2]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setScope('pack')}
                >
                  Reserva + pack
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    scope === 'restaurante'
                      ? 'border-[#7472fd]/40 bg-[#7472fd]/10 text-[#3b3af2]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setScope('restaurante')}
                >
                  Reserva + pack + restaurante
                </button>
              </div>

              {scope === 'reserva' && (
                <p className="text-xs text-slate-500">
                  Solo se usará en esta reserva. No se guarda en el pack ni en el restaurante.
                </p>
              )}

              {scope === 'pack' && (
                <p className="text-xs text-slate-500">
                  Se usará en esta reserva y quedará guardado en el pack, pero no se asigna a ningún restaurante.
                  Puedes publicarlo en un restaurante más adelante.
                </p>
              )}

              {scope === 'restaurante' && (
                <div>
                  <p className="text-xs text-slate-500">
                    Se usará en esta reserva y quedará disponible en el pack y en el restaurante. Al publicarlo en
                    el restaurante, los clientes podrán solicitarlo desde el marketplace.
                  </p>
                  <label className="mt-3 block text-sm font-medium text-slate-700">Días disponibles</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DIAS.map((dia) => {
                      const active = diasDisponibles.includes(dia);
                      return (
                        <button
                          key={dia}
                          type="button"
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                            active
                              ? 'border-[#7472fd]/40 bg-[#7472fd]/10 text-[#3b3af2]'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                          onClick={() => {
                            setDiasDisponibles((prev) =>
                              prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
                            );
                          }}
                        >
                          {dia}
                        </button>
                      );
                    })}
                  </div>
                  {diasDisponibles.length === 0 && (
                    <p className="mt-2 text-xs text-rose-600">Selecciona al menos un día.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#7472fd] text-white"
              onClick={handleSave}
              disabled={
                saving ||
                (scope === 'restaurante' && diasDisponibles.length === 0)
              }
            >
              {saving ? 'Guardando...' : `Crear ${label}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type BuildEntryParams = {
  restaurantesIds: string[];
  disponibilidad: { restauranteId: string; diasDisponibles: string[] }[];
  packKind: PackKind;
  nombre: string;
  descripcion: string;
  precio: number;
  duracionMin: string;
  duracionMax: string;
};

const buildEntry = ({
  restaurantesIds,
  disponibilidad,
  packKind,
  nombre,
  descripcion,
  precio,
  duracionMin,
  duracionMax,
}: BuildEntryParams): MenuEditForm | TicketEditForm | BarraLibreEditForm | null => {
  if (!nombre || !descripcion) return null;

  if (packKind === 'Barra Libre') {
    return {
      Nombre: nombre,
      Descripción: descripcion,
      intervalos: [{ duracionMin, duracionMax, precio }],
      disponibilidadPorRestaurante: disponibilidad,
      restaurantesIds,
    };
  }

  if (packKind === 'Tickets') {
    return {
      Nombre: nombre,
      Descripción: descripcion,
      Precio: precio,
      disponibilidadPorRestaurante: disponibilidad,
      restaurantesIds,
    };
  }

  return {
    Nombre: nombre,
    Descripción: descripcion,
    Precio: precio,
    tipoServicio: 'Ambos',
    disponibilidadPorRestaurante: disponibilidad,
    restaurantesIds,
  };
};
