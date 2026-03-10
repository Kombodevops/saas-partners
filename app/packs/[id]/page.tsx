'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PackEditService, type PackEdit } from '@/lib/services/pack-edit.service';
import { useRestaurantes } from '@/components/shared/restaurantes-context';
import { MenusEditor } from '@/app/packs/components/menus-editor';
import { TicketsEditor } from '@/app/packs/components/tickets-editor';
import { BarrasLibresEditor } from '@/app/packs/components/barras-libres-editor';
import type { PackEditForm, MenuEditForm, TicketEditForm, BarraLibreEditForm } from '@/lib/validators/pack-edit';

interface PackEditPageProps {
  params: Promise<{ id: string }>;
}

export default function PackEditPage({ params }: PackEditPageProps) {
  const { id } = use(params);
  const [pack, setPack] = useState<PackEdit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { restaurantes, isLoading: restaurantesLoading } = useRestaurantes();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await PackEditService.getPackById(id);
        if (!active) return;
        if (!result) {
          setError('No se encontró el plan');
          return;
        }
        setPack(result);

      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Error al cargar el plan');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [id]);

  const baseForm = useMemo<PackEditForm | null>(() => {
    if (!pack) return null;
    return {
      'Nombre del pack': pack['Nombre del pack'],
      'Descripción': pack['Descripción'],
      Precio: Number(pack.Precio ?? 0),
      activo: Boolean(pack.activo),
      Categoria: pack.Categoria ?? '',
      Subcategoria: pack.Subcategoria ?? '',
      tipoPlan: pack.tipoPlan ?? [],
      restaurantesIds: pack.restaurantesIds ?? [],
      restaurantesPermiteComida: (pack as PackEditForm).restaurantesPermiteComida ?? [],
      Menus: (pack.Menus ?? []) as MenuEditForm[],
      Tickets: (pack.Tickets ?? []) as TicketEditForm[],
      'Barra Libre': (pack['Barra Libre'] ?? []) as BarraLibreEditForm[],
    };
  }, [pack]);

  const searchParams = useSearchParams();
  const restauranteId = searchParams.get('restauranteId') ?? '';

  const hasRestauranteInMenus = useMemo(() => {
    if (!restauranteId || !baseForm?.Menus) return false;
    return baseForm.Menus.some((menu) => menu.restaurantesIds?.includes(restauranteId));
  }, [baseForm?.Menus, restauranteId]);

  const hasRestauranteInTickets = useMemo(() => {
    if (!restauranteId || !baseForm?.Tickets) return false;
    return baseForm.Tickets.some((ticket) => ticket.restaurantesIds?.includes(restauranteId));
  }, [baseForm?.Tickets, restauranteId]);

  const hasRestauranteInBarras = useMemo(() => {
    if (!restauranteId || !baseForm?.['Barra Libre']) return false;
    return baseForm['Barra Libre'].some((barra) => barra.restaurantesIds?.includes(restauranteId));
  }, [baseForm?.['Barra Libre'], restauranteId]);

  const restauranteNombre = useMemo(() => {
    if (!restauranteId) return '';
    return restaurantes.find((rest) => rest.id === restauranteId)?.nombreRestaurante ?? 'este restaurante';
  }, [restauranteId, restaurantes]);

  const updatePack = async (payload: Partial<PackEditForm>) => {
    if (!baseForm) return;
    const next = { ...baseForm, ...payload } as PackEditForm;
    setIsSaving(true);
    try {
      await PackEditService.updatePack(id, next);
      setPack((prev) => (prev ? ({ ...prev, ...payload } as PackEdit) : prev));
    } finally {
      setIsSaving(false);
    }
  };

  const applyRestaurantesFromItems = (
    restauranteIds: string[],
    payload: Partial<PackEditForm>
  ) => {
    const uniqueIds = Array.from(new Set(restauranteIds));
    const nextPermite = (baseForm?.restaurantesPermiteComida ?? []).filter((id) => uniqueIds.includes(id));
    return updatePack({ ...payload, restaurantesIds: uniqueIds, restaurantesPermiteComida: nextPermite });
  };

  if (isLoading || restaurantesLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <div className="h-12 w-48 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-40 w-full animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  if (error || !pack || !baseForm) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto w-full max-w-4xl">
          <Card className="border-dashed border-rose-200 bg-rose-50">
            <CardHeader>
              <CardTitle className="text-base text-rose-600">{error ?? 'Error inesperado'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => history.back()}>
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <Card className="border-none bg-white shadow-sm ring-1 ring-slate-100">
          <CardContent className="flex flex-wrap items-start justify-between gap-6 p-6">
            <div className="min-w-[240px]">
              <Button variant="outline" className="mb-4 gap-2" onClick={() => history.back()}>
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <h1 className="text-2xl font-semibold text-slate-900">{pack['Nombre del pack']}</h1>
              <p className="mt-2 text-sm text-slate-500">
                Usa nombres claros y descripciones atractivas para destacar en el marketplace.
              </p>
              {restauranteId && (
                <div className="mt-3 text-xs text-slate-600">
                  {pack.Categoria === 'Menú' && !hasRestauranteInMenus && (
                    <p>
                      En "{restauranteNombre}" no tienes menús asignados. Asigna uno en el apartado de{' '}
                      <button
                        type="button"
                        className="text-[#7472fd] underline underline-offset-4"
                        onClick={() => document.getElementById('menus')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        Menús
                      </button>
                      .
                    </p>
                  )}
                  {pack.Categoria === 'Tickets' && !hasRestauranteInTickets && (
                    <p>
                      En "{restauranteNombre}" no tienes tickets asignados. Asigna uno en el apartado de{' '}
                      <button
                        type="button"
                        className="text-[#7472fd] underline underline-offset-4"
                        onClick={() => document.getElementById('tickets')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        Tickets
                      </button>
                      .
                    </p>
                  )}
                  {pack.Subcategoria === 'Barra Libre' && !hasRestauranteInBarras && (
                    <p>
                      En "{restauranteNombre}" no tienes barras libres asignadas. Asigna una en el apartado de{' '}
                      <button
                        type="button"
                        className="text-[#7472fd] underline underline-offset-4"
                        onClick={() => document.getElementById('barras-libres')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        Barras libres
                      </button>
                      .
                    </p>
                  )}
                  {pack.Subcategoria === null &&
                    pack.Categoria === 'Best Deal' &&
                    !hasRestauranteInMenus &&
                    !hasRestauranteInTickets &&
                    !hasRestauranteInBarras && (
                      <p>
                        En "{restauranteNombre}" no tienes menús, tickets ni barras libres asignados. Asigna contenido en{' '}
                        <button
                          type="button"
                          className="text-[#7472fd] underline underline-offset-4"
                          onClick={() => document.getElementById('menus')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          Menús
                        </button>
                        ,{' '}
                        <button
                          type="button"
                          className="text-[#7472fd] underline underline-offset-4"
                          onClick={() => document.getElementById('tickets')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          Tickets
                        </button>{' '}
                        y{' '}
                        <button
                          type="button"
                          className="text-[#7472fd] underline underline-offset-4"
                          onClick={() => document.getElementById('barras-libres')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          Barras libres
                        </button>
                        .
                      </p>
                    )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className={`flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold shadow-sm transition ${
                  pack.activo
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    pack.activo ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                {pack.activo ? 'Activo' : 'Inactivo'}
                <span className="text-xs text-slate-500">Toca para cambiar</span>
              </button>
            </div>
          </CardContent>
        </Card>

        <div className={`grid gap-6 ${pack.Categoria === 'Menú' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
          <Card className="border-none bg-white shadow-sm ring-1 ring-slate-100">
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Información general</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Nombre</label>
                <Input value={baseForm['Nombre del pack']} readOnly className="bg-slate-50 text-slate-600" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Descripción</label>
              <Textarea
                defaultValue={baseForm['Descripción']}
                rows={4}
                onBlur={(event) => updatePack({ 'Descripción': event.target.value })}
              />
              <p className="mt-2 text-xs text-slate-500">
                Esta descripción se comparte en todos los restaurantes donde esté incluido este pack.
              </p>
            </div>
            {isSaving && <p className="text-xs text-slate-500">Guardando cambios...</p>}
            </CardContent>
          </Card>

          {pack.Categoria !== 'Menú' && (
            <Card className="border-none bg-white shadow-sm ring-1 ring-slate-100">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Permite llevar su propia comida al cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm pt-1">
                <p className="text-xs text-slate-500">
                  {pack.Categoria === 'Tickets' &&
                    'Actívalo solo en los restaurantes en los que permites que, en planes de tickets, el cliente traiga su propia comida al local.'}
                  {pack.Subcategoria === 'Barra Libre' &&
                    'Actívalo solo en los restaurantes en los que permites que, en planes de barras libres, el cliente traiga su propia comida al local.'}
                  {pack.Subcategoria === null && pack.Categoria === 'Best Deal' &&
                    'Actívalo solo en los restaurantes en los que permites que, en planes de tickets o barras libres, el cliente traiga su propia comida al local.'}
                </p>
                {restaurantes.length === 0 ? (
                  <p className="text-slate-500">Sin restaurantes asociados.</p>
                ) : (
                  <div className="grid gap-3">
                    {restaurantes.map((rest) => {
                      const included = (baseForm.restaurantesIds ?? []).includes(rest.id);
                      const permits = (baseForm.restaurantesPermiteComida ?? []).includes(rest.id);
                      return (
                        <button
                          key={rest.id}
                          type="button"
                          disabled={!included}
                          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                            included
                              ? permits
                                ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd] shadow-sm'
                                : 'border-slate-200 text-slate-700 hover:border-[#7472fd]/40'
                              : 'border-slate-100 bg-slate-50 text-slate-400'
                          }`}
                          onClick={() => {
                            if (!included) return;
                            const next = permits
                              ? (baseForm.restaurantesPermiteComida ?? []).filter((id) => id !== rest.id)
                              : [...(baseForm.restaurantesPermiteComida ?? []), rest.id];
                            updatePack({ restaurantesPermiteComida: next });
                          }}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold">{rest.nombreRestaurante}</span>
                            <span className="text-xs text-slate-500">
                              {included ? 'Pulsa para activar o desactivar' : 'Incluye el restaurante en el plan'}
                            </span>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              included
                                ? permits
                                  ? 'bg-[#7472fd] text-white'
                                  : 'bg-slate-100 text-slate-600'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {included ? (permits ? 'Activado' : 'Desactivado') : 'No incluido'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {pack.Categoria === 'Menú' && (
          <MenusEditor
            menus={baseForm.Menus ?? []}
            restaurantes={restaurantes.map((item) => ({ id: item.id, nombre: item.nombreRestaurante }))}
            restauranteId={restauranteId}
            onSave={(menus) => {
              const ids = menus.flatMap((menu) => menu.restaurantesIds ?? []);
              return applyRestaurantesFromItems(ids, { Menus: menus });
            }}
          />
        )}

        {pack.Categoria === 'Tickets' && (
          <TicketsEditor
            tickets={baseForm.Tickets ?? []}
            restaurantes={restaurantes.map((item) => ({ id: item.id, nombre: item.nombreRestaurante }))}
            restauranteId={restauranteId}
            onSave={(tickets) => {
              const ids = tickets.flatMap((ticket) => ticket.restaurantesIds ?? []);
              return applyRestaurantesFromItems(ids, { Tickets: tickets });
            }}
          />
        )}

        {pack.Subcategoria === 'Barra Libre' && (
          <BarrasLibresEditor
            barras={baseForm['Barra Libre'] ?? []}
            restaurantes={restaurantes.map((item) => ({ id: item.id, nombre: item.nombreRestaurante }))}
            restauranteId={restauranteId}
            onSave={(barras) => {
              const ids = barras.flatMap((barra) => barra.restaurantesIds ?? []);
              return applyRestaurantesFromItems(ids, { 'Barra Libre': barras });
            }}
          />
        )}
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Quieres desactivar este plan?</DialogTitle>
            <DialogDescription>
              Al desactivarlo quedará inactivo en todos los restaurantes.
              Si solo quieres desactivarlo en un restaurante, edita ese menú/ticket/barra libre y
              quita el restaurante desde allí.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                await updatePack({ activo: !pack.activo });
                setConfirmOpen(false);
              }}
              className="bg-[#7472fd] text-white"
            >
              {pack.activo ? 'Desactivar plan' : 'Activar plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
