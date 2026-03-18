'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MenuEditSchema, type MenuEditForm } from '@/lib/validators/pack-edit';

const MenusFormSchema = z.object({
  menus: MenuEditSchema.array(),
});
type MenusForm = MenuEditForm[];

interface MenusFormValues {
  menus: MenusForm;
}

interface MenusEditorProps {
  menus: MenuEditForm[];
  restaurantes: { id: string; nombre: string }[];
  restauranteId?: string;
  onSave: (menus: MenuEditForm[]) => Promise<void>;
}

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const SERVICIOS = ['Ambos', 'Sentados', 'De pie (Cocktail)'];

const normalizeMenuRestaurantes = (menu: MenuEditForm): MenuEditForm => {
  const ids = new Set<string>(
    (menu.restaurantesIds ?? []).filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    )
  );
  const disponibilidad = Array.isArray(menu.disponibilidadPorRestaurante)
    ? menu.disponibilidadPorRestaurante
    : [];
  disponibilidad.forEach((entry) => {
    const restId = (entry as { restauranteId?: unknown })?.restauranteId;
    if (typeof restId === 'string' && restId) ids.add(restId);
  });
  const nextDisponibilidad = [...disponibilidad].filter((entry) => {
    const restId = (entry as { restauranteId?: unknown })?.restauranteId;
    return typeof restId === 'string' && ids.has(restId);
  });
  ids.forEach((restId) => {
    if (!nextDisponibilidad.some((entry) => entry.restauranteId === restId)) {
      nextDisponibilidad.push({ restauranteId: restId, diasDisponibles: [] });
    }
  });
  return { ...menu, restaurantesIds: Array.from(ids), disponibilidadPorRestaurante: nextDisponibilidad };
};

export function MenusEditor({
  menus,
  onSave,
  restaurantes,
  restauranteId,
}: MenusEditorProps) {
  const restauranteNombre =
    restauranteId && restaurantes.length > 0
      ? restaurantes.find((rest) => rest.id === restauranteId)?.nombre ?? restauranteId
      : restauranteId ?? '';
  const [open, setOpen] = useState(false);
  const [focusedMenuIndex, setFocusedMenuIndex] = useState<number | null>(null);
  const [isAddingSingle, setIsAddingSingle] = useState(false);
  const [confirmImportAllOpen, setConfirmImportAllOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successText, setSuccessText] = useState('');
  const skipResetRef = useRef(false);
  const importRef = useRef<HTMLDivElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImportVisible, setIsImportVisible] = useState(false);
  const visible = useMemo(() => menus, [menus]);
  const hasImportables = useMemo(
    () => (restauranteId ? visible.some((menu) => !menu.restaurantesIds?.includes(restauranteId)) : false),
    [restauranteId, visible]
  );

  const form = useForm<MenusFormValues>({
    resolver: zodResolver(MenusFormSchema) as Resolver<MenusFormValues>,
    defaultValues: { menus: [] },
  });
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'menus',
  });

  useEffect(() => {
    if (!open) return;
    if (skipResetRef.current) {
      skipResetRef.current = false;
      return;
    }
    const safeMenus = (menus ?? []).map((menu) => ({
      Nombre: menu.Nombre ?? '',
      Descripción: menu['Descripción'] ?? '',
      Precio: Number(menu.Precio ?? 0),
      tipoServicio: menu.tipoServicio ?? 'Ambos',
      restaurantesIds: menu.restaurantesIds ?? [],
      disponibilidadPorRestaurante: menu.disponibilidadPorRestaurante ?? [],
    }));
    form.reset({ menus: safeMenus });
  }, [form, menus, open]);

  const addMenu = () => {
    append({
      Nombre: '',
      Descripción: '',
      Precio: 0,
      tipoServicio: 'Ambos',
      restaurantesIds: [],
      disponibilidadPorRestaurante: [],
    });
  };

  const openAddSingleMenu = () => {
    const safeMenus = (menus ?? []).map((menu) => ({
      Nombre: menu.Nombre ?? '',
      Descripción: menu['Descripción'] ?? '',
      Precio: Number(menu.Precio ?? 0),
      tipoServicio: menu.tipoServicio ?? 'Ambos',
      restaurantesIds: menu.restaurantesIds ?? [],
      disponibilidadPorRestaurante: menu.disponibilidadPorRestaurante ?? [],
    }));
    const nextIndex = safeMenus.length;
    const newMenu = {
      Nombre: '',
      Descripción: '',
      Precio: 0,
      tipoServicio: 'Ambos',
      restaurantesIds: [],
      disponibilidadPorRestaurante: [],
    };
    skipResetRef.current = true;
    form.reset({ menus: [...safeMenus, newMenu] });
    setFocusedMenuIndex(nextIndex);
    setIsAddingSingle(true);
    setOpen(true);
  };

  const removeMenu = (index: number) => {
    remove(index);
  };

  const ensureImportMenu = (menu: MenuEditForm) => {
    if (!restauranteId) return menu;
    const restaurantesIds = menu.restaurantesIds ?? [];
    const already = restaurantesIds.includes(restauranteId);
    const nextIds = already ? restaurantesIds : [...restaurantesIds, restauranteId];
    const disponibilidad = menu.disponibilidadPorRestaurante ?? [];
    const hasDisponibilidad = disponibilidad.some((item) => item.restauranteId === restauranteId);
    const nextDisponibilidad = hasDisponibilidad
      ? disponibilidad
      : [...disponibilidad, { restauranteId, diasDisponibles: [...DIAS] }];
    return { ...menu, restaurantesIds: nextIds, disponibilidadPorRestaurante: nextDisponibilidad };
  };

  const handleImportMenu = async (index: number) => {
    if (!restauranteId) return;
    const nextMenus = menus.map((menu, idx) =>
      idx === index ? ensureImportMenu(menu) : normalizeMenuRestaurantes(menu)
    );
    await onSave(nextMenus);
    const targetName = restauranteNombre || 'el restaurante';
    setSuccessText(`Se ha añadido el menú a ${targetName}.`);
    setSuccessDialogOpen(true);
  };

  const handleImportAll = async () => {
    if (!restauranteId) return;
    const addedCount = menus.filter((menu) => !(menu.restaurantesIds ?? []).includes(restauranteId)).length;
    const nextMenus = menus.map((menu) =>
      (menu.restaurantesIds ?? []).includes(restauranteId)
        ? normalizeMenuRestaurantes(menu)
        : ensureImportMenu(menu)
    );
    await onSave(nextMenus);
    const targetName = restauranteNombre || 'el restaurante';
    const label = addedCount === 1 ? 'Se ha añadido el menú a' : 'Se han añadido los menús a';
    setSuccessText(`${label} ${targetName}.`);
    setSuccessDialogOpen(true);
  };

  const handleSubmit = async (values: MenusFormValues) => {
    try {
      setIsSaving(true);
      const normalized = values.menus.map(normalizeMenuRestaurantes);
      await onSave(normalized);
      setOpen(false);
      if (isAddingSingle) {
        const targetName = restauranteNombre || '';
        const label = targetName ? `Se ha añadido el menú a ${targetName}.` : 'Se ha añadido el menú.';
        setSuccessText(label);
        setSuccessDialogOpen(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!restauranteId || !importRef.current) return;
    const target = importRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => setIsImportVisible(entry.isIntersecting),
      { threshold: 0.4 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [restauranteId]);

  if (restauranteId) {
    return (
      <div id="menus" className="space-y-4 text-sm">
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-semibold text-slate-900">Menús activos en {restauranteNombre}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {!isImportVisible && hasImportables && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-2"
                      onClick={() => {
                        importRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Importar menús existentes
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-8 gap-2" onClick={openAddSingleMenu}>
                    <Plus className="h-4 w-4" />
                    Añadir nuevo menú
                  </Button>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {visible
                  .map((menu, index) => ({ menu, index }))
                  .filter(({ menu }) => menu.restaurantesIds?.includes(restauranteId))
                  .map(({ menu, index }) => (
                    <div key={`${menu.Nombre}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <p className="font-semibold text-slate-900">{menu.Nombre || 'Menú'}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-2"
                          onClick={() => {
                            setFocusedMenuIndex(index);
                            setIsAddingSingle(false);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar menú
                        </Button>
                      </div>
                      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <p className="text-xs font-semibold text-slate-700">Contenido del menú</p>
                          <div className="mt-2 space-y-2 text-xs text-slate-600">
                            <div className="flex items-center justify-between rounded-lg border border-white bg-white px-2 py-1">
                              <span>Precio</span>
                              <span className="font-semibold text-slate-800">{menu.Precio ?? 0}€</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-white bg-white px-2 py-1">
                              <span>Servicio</span>
                              <span className="font-semibold text-slate-800">{menu.tipoServicio ?? 'Ambos'}</span>
                            </div>
                            <div className="rounded-lg border border-white bg-white px-2 py-1">
                              <p className="text-[11px] font-semibold text-slate-700">Descripción</p>
                              <p className="text-[11px] text-slate-500">
                                {menu['Descripción'] || 'Sin descripción.'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-700">Disponibilidad por restaurante</p>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {menu.restaurantesIds && menu.restaurantesIds.length > 0 ? (
                              menu.restaurantesIds.map((id) => {
                                const nombre = restaurantes.find((r) => r.id === id)?.nombre ?? id;
                                const dias = (menu.disponibilidadPorRestaurante ?? []).find(
                                  (item) => item.restauranteId === id
                                )?.diasDisponibles ?? [];
                                return (
                                  <div
                                    key={id}
                                    className="flex flex-wrap items-center gap-2 rounded-lg border border-white bg-white/80 px-2.5 py-1.5"
                                  >
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                      {nombre}
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {dias.length > 0 ? (
                                        dias.map((dia) => (
                                          <span
                                            key={`${id}-${dia}`}
                                            className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600"
                                          >
                                            {dia}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[11px] text-slate-400">Sin días</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-slate-400">Sin restaurantes asignados.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                {visible.filter((menu) => menu.restaurantesIds?.includes(restauranteId)).length === 0 && (
                  <p className="text-sm text-slate-500">No hay menús activos en este local.</p>
                )}
                {menus.length === 0 && (
                  <p className="text-sm text-slate-500">Sin menús configurados.</p>
                )}
              </div>
            </div>

            <div ref={importRef} className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-semibold text-slate-900">Importar menús de otros locales</p>
                {visible.some((menu) => !menu.restaurantesIds?.includes(restauranteId)) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2"
                  onClick={() => setConfirmImportAllOpen(true)}
                >
                  <Download className="h-4 w-4" />
                  Importar todos los menús a {restauranteNombre}
                </Button>
                )}
              </div>
              <div className="mt-4 space-y-3">
                {visible
                  .map((menu, index) => ({ menu, index }))
                  .filter(({ menu }) => !menu.restaurantesIds?.includes(restauranteId))
                  .map(({ menu, index }) => (
                    <div key={`${menu.Nombre}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-rose-500" />
                            <p className="font-semibold text-slate-900">{menu.Nombre || 'Menú'}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2"
                            onClick={() => {
                              setFocusedMenuIndex(index);
                              setIsAddingSingle(false);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar menú
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2"
                            onClick={() => handleImportMenu(index)}
                          >
                            <Download className="h-4 w-4" />
                            Importar menú a {restauranteNombre}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <p className="text-xs font-semibold text-slate-700">Contenido del menú</p>
                          <div className="mt-2 space-y-2 text-xs text-slate-600">
                            <div className="flex items-center justify-between rounded-lg border border-white bg-white px-2 py-1">
                              <span>Precio</span>
                              <span className="font-semibold text-slate-800">{menu.Precio ?? 0}€</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-white bg-white px-2 py-1">
                              <span>Servicio</span>
                              <span className="font-semibold text-slate-800">{menu.tipoServicio ?? 'Ambos'}</span>
                            </div>
                            <div className="rounded-lg border border-white bg-white px-2 py-1">
                              <p className="text-[11px] font-semibold text-slate-700">Descripción</p>
                              <p className="text-[11px] text-slate-500">
                                {menu['Descripción'] || 'Sin descripción.'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-700">Disponibilidad por restaurante</p>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {menu.restaurantesIds && menu.restaurantesIds.length > 0 ? (
                              menu.restaurantesIds.map((id) => {
                                const nombre = restaurantes.find((r) => r.id === id)?.nombre ?? id;
                                const dias = (menu.disponibilidadPorRestaurante ?? []).find(
                                  (item) => item.restauranteId === id
                                )?.diasDisponibles ?? [];
                                return (
                                  <div
                                    key={id}
                                    className="flex flex-wrap items-center gap-2 rounded-lg border border-white bg-white/80 px-2.5 py-1.5"
                                  >
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                      {nombre}
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {dias.length > 0 ? (
                                        dias.map((dia) => (
                                          <span
                                            key={`${id}-${dia}`}
                                            className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600"
                                          >
                                            {dia}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[11px] text-slate-400">Sin días</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-slate-400">Sin restaurantes asignados.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                {visible.filter((menu) => !menu.restaurantesIds?.includes(restauranteId)).length === 0 && (
                  <p className="text-sm text-slate-500">No hay menús pendientes de importar.</p>
                )}
              </div>
            </div>

            <Dialog open={confirmImportAllOpen} onOpenChange={setConfirmImportAllOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>¿Importar todos los menús?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-slate-600">
                  Se añadirán todos tus menús al restaurante seleccionado.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setConfirmImportAllOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]"
                    onClick={async () => {
                      await handleImportAll();
                      setConfirmImportAllOpen(false);
                    }}
                  >
                    Importar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
              <DialogContent className="max-w-md">
                <div className="flex flex-col items-center gap-4 py-2 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm animate-pulse">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                  <div className="space-y-1">
                    <DialogTitle>Actualización completada</DialogTitle>
                    <p className="text-sm text-slate-600">{successText}</p>
                  </div>
                  <Button className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]" onClick={() => setSuccessDialogOpen(false)}>
                    Entendido
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar menús</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {fields.map((field, index) => {
                  if (focusedMenuIndex != null && focusedMenuIndex !== index) return null;
                  return (
                    <div key={field.id} className="rounded-2xl border-2 border-slate-800 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">Menú {index + 1}</p>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => removeMenu(index)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`menus.${index}.Nombre` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`menus.${index}.Precio` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Precio</FormLabel>
                              <FormControl>
                                <NumberInput
                                  value={typeof field.value === 'number' ? field.value : Number(field.value ?? 0)}
                                  onChangeValue={field.onChange}
                                  onBlur={field.onBlur}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-3">
                        <FormField
                          control={form.control}
                          name={`menus.${index}.tipoServicio` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de servicio</FormLabel>
                              <FormControl>
                                <div className="flex flex-wrap gap-2">
                                  {SERVICIOS.map((servicio) => (
                                    <button
                                      key={servicio}
                                      type="button"
                                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                        field.value === servicio
                                          ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd]'
                                          : 'border-slate-200 text-slate-600 hover:border-[#7472fd]/40'
                                      }`}
                                      onClick={() => field.onChange(servicio)}
                                    >
                                      {servicio}
                                    </button>
                                  ))}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-3">
                        <FormField
                          control={form.control}
                          name={`menus.${index}.Descripción` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descripción</FormLabel>
                              <FormControl>
                                <Textarea {...field} value={field.value ?? ''} rows={4} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-900">Restaurantes incluidos</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {restaurantes.map((rest) => {
                            const current = form.getValues(`menus.${index}` as const);
                            const selected = Boolean(current?.restaurantesIds?.includes(rest.id));
                            return (
                              <button
                                type="button"
                                key={rest.id}
                                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                                  selected
                                    ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd]'
                                    : 'border-slate-200 text-slate-600 hover:border-[#7472fd]/40'
                                }`}
                                onClick={() => {
                                  const currentValue = form.getValues(`menus.${index}` as const);
                                  if (!currentValue) return;
                                  const restaurantesIds = currentValue.restaurantesIds ?? [];
                                  const disponibilidad = currentValue.disponibilidadPorRestaurante ?? [];
                                  const has = restaurantesIds.includes(rest.id);
                                  const nextIds = has
                                    ? restaurantesIds.filter((id) => id !== rest.id)
                                    : [...restaurantesIds, rest.id];
                                  const nextDisponibilidad = has
                                    ? disponibilidad.filter((item) => item.restauranteId !== rest.id)
                                    : [...disponibilidad, { restauranteId: rest.id, diasDisponibles: [] }];
                                  update(index, {
                                    ...currentValue,
                                    restaurantesIds: nextIds,
                                    disponibilidadPorRestaurante: nextDisponibilidad,
                                  });
                                }}
                              >
                                <span>{rest.nombre}</span>
                                <span className="text-xs">{selected ? 'Sí' : '+'}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-900">Días disponibles por restaurante</p>
                        {(form.watch(`menus.${index}.restaurantesIds` as const) ?? []).map((restId) => {
                          const nombre = restaurantes.find((r) => r.id === restId)?.nombre ?? restId;
                          const current = form.getValues(`menus.${index}` as const);
                          const disponibilidad = current?.disponibilidadPorRestaurante ?? [];
                          const entry = disponibilidad.find((item) => item.restauranteId === restId);
                          const selectedDays = entry?.diasDisponibles ?? [];
                          return (
                            <div key={restId} className="rounded-xl border border-slate-100 p-3">
                              <p className="text-xs font-semibold text-slate-700">{nombre}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {DIAS.map((dia) => {
                                  const isSelected = selectedDays.includes(dia);
                                  return (
                                    <button
                                      key={dia}
                                      type="button"
                                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                        isSelected
                                          ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd]'
                                          : 'border-slate-200 text-slate-600 hover:border-[#7472fd]/40'
                                      }`}
                                      onClick={() => {
                                        const currentValue = form.getValues(`menus.${index}` as const);
                                        if (!currentValue) return;
                                        const disponibilidadList = currentValue.disponibilidadPorRestaurante ?? [];
                                        const nextDisponibilidad = disponibilidadList.map((item) => {
                                          if (item.restauranteId !== restId) return item;
                                          const nextDias = isSelected
                                            ? item.diasDisponibles.filter((d) => d !== dia)
                                            : [...item.diasDisponibles, dia];
                                          return { ...item, diasDisponibles: nextDias };
                                        });
                                        update(index, {
                                          ...currentValue,
                                          disponibilidadPorRestaurante: nextDisponibilidad,
                                        });
                                      }}
                                    >
                                      {dia}
                                    </button>
                                  );
                                })}
                                <button
                                  type="button"
                                  className="ml-auto rounded-full border px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-[#7472fd]/40"
                                  onClick={() => {
                                    const currentValue = form.getValues(`menus.${index}` as const);
                                    if (!currentValue) return;
                                    const disponibilidadList = currentValue.disponibilidadPorRestaurante ?? [];
                                    const nextDisponibilidad = disponibilidadList.map((item) => {
                                      if (item.restauranteId !== restId) return item;
                                      return { ...item, diasDisponibles: [...DIAS] };
                                    });
                                    update(index, {
                                      ...currentValue,
                                      disponibilidadPorRestaurante: nextDisponibilidad,
                                    });
                                  }}
                                >
                                  Todos
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {focusedMenuIndex == null && !isAddingSingle && (
                  <Button type="button" variant="outline" onClick={addMenu} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Añadir menú
                  </Button>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving} className="bg-[#7472fd] text-white">
                    {isSaving ? 'Guardando...' : 'Guardar menús'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Card id="menus" className="border-none bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Menús</CardTitle>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {menus.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-2" onClick={openAddSingleMenu}>
            <Plus className="h-4 w-4" />
            Añadir menú
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={() => {
              setFocusedMenuIndex(null);
              setIsAddingSingle(false);
              setOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
            Editar menús
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {menus.length === 0 ? (
          <p className="text-slate-500">Sin menús configurados.</p>
        ) : (
          visible.map((menu, index) => {
            const included = restauranteId ? menu.restaurantesIds?.includes(restauranteId) : null;
            return (
              <div key={`${menu.Nombre}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {included === null ? null : included ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-500" />
                      )}
                      <p className="font-semibold text-slate-900">{menu.Nombre || 'Menú'}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setFocusedMenuIndex(index);
                      setIsAddingSingle(false);
                      setOpen(true);
                    }}
                  >
                    Editar menú
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold text-slate-700">Contenido del menú</p>
                    <div className="mt-2 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center justify-between rounded-lg border border-white bg-white px-2 py-1">
                        <span>Precio</span>
                        <span className="font-semibold text-slate-800">{menu.Precio ?? 0}€</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-white bg-white px-2 py-1">
                        <span>Servicio</span>
                        <span className="font-semibold text-slate-800">{menu.tipoServicio ?? 'Ambos'}</span>
                      </div>
                      <div className="rounded-lg border border-white bg-white px-2 py-1">
                        <p className="text-[11px] font-semibold text-slate-700">Descripción</p>
                        <p className="text-[11px] text-slate-500">
                          {menu['Descripción'] || 'Sin descripción.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-700">Disponibilidad por restaurante</p>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {menu.restaurantesIds && menu.restaurantesIds.length > 0 ? (
                        menu.restaurantesIds.map((id) => {
                          const nombre = restaurantes.find((r) => r.id === id)?.nombre ?? id;
                          const dias = (menu.disponibilidadPorRestaurante ?? []).find(
                            (item) => item.restauranteId === id
                          )?.diasDisponibles ?? [];
                          return (
                            <div
                              key={id}
                              className="flex flex-wrap items-center gap-2 rounded-lg border border-white bg-white/80 px-2.5 py-1.5"
                            >
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                {nombre}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {dias.length > 0 ? (
                                  dias.map((dia) => (
                                    <span
                                      key={`${id}-${dia}`}
                                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600"
                                    >
                                      {dia}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-400">Sin días</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400">Sin restaurantes asignados.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              setFocusedMenuIndex(null);
              setIsAddingSingle(false);
            }
          }}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar menús</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {fields.map((field, index) => {
                  if (focusedMenuIndex != null && focusedMenuIndex !== index) return null;
                  return (
                    <div key={field.id} className="rounded-2xl border-2 border-slate-800 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">Menú {index + 1}</p>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => removeMenu(index)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`menus.${index}.Nombre` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`menus.${index}.Precio` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Precio</FormLabel>
                              <FormControl>
                                <NumberInput
                                  value={typeof field.value === 'number' ? field.value : Number(field.value ?? 0)}
                                  onChangeValue={field.onChange}
                                  onBlur={field.onBlur}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-3 grid gap-4">
                        <FormField
                          control={form.control}
                          name={`menus.${index}.tipoServicio` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de servicio</FormLabel>
                              <FormControl>
                                <select
                                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                  value={field.value ?? 'Ambos'}
                                  onChange={(event) => field.onChange(event.target.value)}
                                >
                                  {SERVICIOS.map((servicio) => (
                                    <option key={servicio} value={servicio}>
                                      {servicio}
                                    </option>
                                  ))}
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`menus.${index}.Descripción` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descripción</FormLabel>
                              <FormControl>
                                <Textarea {...field} value={field.value ?? ''} rows={5} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-900">Restaurantes incluidos</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {restaurantes.map((rest) => {
                            const current = form.getValues(`menus.${index}` as const);
                            const selected = Boolean(current?.restaurantesIds?.includes(rest.id));
                            return (
                              <button
                                type="button"
                                key={rest.id}
                                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                                  selected
                                    ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd]'
                                    : 'border-slate-200 text-slate-600 hover:border-[#7472fd]/40'
                                }`}
                                onClick={() => {
                                  const currentValue = form.getValues(`menus.${index}` as const);
                                  if (!currentValue) return;
                                  const restaurantesIds = currentValue.restaurantesIds ?? [];
                                  const disponibilidad = currentValue.disponibilidadPorRestaurante ?? [];
                                  const has = restaurantesIds.includes(rest.id);
                                  const nextIds = has
                                    ? restaurantesIds.filter((id) => id !== rest.id)
                                    : [...restaurantesIds, rest.id];
                                  const nextDisponibilidad = has
                                    ? disponibilidad.filter((item) => item.restauranteId !== rest.id)
                                    : [...disponibilidad, { restauranteId: rest.id, diasDisponibles: [] }];
                                  update(index, {
                                    ...currentValue,
                                    restaurantesIds: nextIds,
                                    disponibilidadPorRestaurante: nextDisponibilidad,
                                  });
                                }}
                              >
                                <span>{rest.nombre}</span>
                                <span className="text-xs">{selected ? 'Sí' : '+'}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-900">Días disponibles por restaurante</p>
                        {(form.watch(`menus.${index}.restaurantesIds` as const) ?? []).map((restId) => {
                          const nombre = restaurantes.find((r) => r.id === restId)?.nombre ?? restId;
                          const current = form.getValues(`menus.${index}` as const);
                          const disponibilidad = current?.disponibilidadPorRestaurante ?? [];
                          const entry = disponibilidad.find((item) => item.restauranteId === restId);
                          const selectedDays = entry?.diasDisponibles ?? [];
                          return (
                            <div key={restId} className="rounded-xl border border-slate-100 p-3">
                              <p className="text-xs font-semibold text-slate-700">{nombre}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {DIAS.map((dia) => {
                                  const isSelected = selectedDays.includes(dia);
                                  return (
                                    <button
                                      key={dia}
                                      type="button"
                                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                        isSelected
                                          ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd]'
                                          : 'border-slate-200 text-slate-600 hover:border-[#7472fd]/40'
                                      }`}
                                      onClick={() => {
                                        const currentValue = form.getValues(`menus.${index}` as const);
                                        if (!currentValue) return;
                                        const disponibilidadList = currentValue.disponibilidadPorRestaurante ?? [];
                                        const nextDisponibilidad = disponibilidadList.map((item) => {
                                          if (item.restauranteId !== restId) return item;
                                          const nextDias = isSelected
                                            ? item.diasDisponibles.filter((d) => d !== dia)
                                            : [...item.diasDisponibles, dia];
                                          return { ...item, diasDisponibles: nextDias };
                                        });
                                        update(index, {
                                          ...currentValue,
                                          disponibilidadPorRestaurante: nextDisponibilidad,
                                        });
                                      }}
                                    >
                                      {dia}
                                    </button>
                                  );
                                })}
                                <button
                                  type="button"
                                  className="ml-auto rounded-full border px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-[#7472fd]/40"
                                  onClick={() => {
                                    const currentValue = form.getValues(`menus.${index}` as const);
                                    if (!currentValue) return;
                                    const disponibilidadList = currentValue.disponibilidadPorRestaurante ?? [];
                                    const nextDisponibilidad = disponibilidadList.map((item) => {
                                      if (item.restauranteId !== restId) return item;
                                      return { ...item, diasDisponibles: [...DIAS] };
                                    });
                                    update(index, {
                                      ...currentValue,
                                      disponibilidadPorRestaurante: nextDisponibilidad,
                                    });
                                  }}
                                >
                                  Todos
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {focusedMenuIndex == null && !isAddingSingle && (
                  <Button type="button" variant="outline" onClick={addMenu} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Añadir menú
                  </Button>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving} className="bg-[#7472fd] text-white">
                    {isSaving ? 'Guardando...' : 'Guardar menús'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
