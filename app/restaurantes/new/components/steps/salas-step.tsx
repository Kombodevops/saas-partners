import { useMemo, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { CARACTERISTICAS_FIJAS } from '@/lib/validators/restaurante-caracteristicas';
import type { RestauranteNewForm } from '@/lib/validators/restaurante-new';
import { CharacteristicDialog } from '../characteristic-dialog';

export function SalasStep() {
  const form = useFormContext<RestauranteNewForm>();
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'salas' });
  const [dialogState, setDialogState] = useState<{ index: number; item: string } | null>(null);
  const [dialogDescription, setDialogDescription] = useState('');
  const restauranteCaracteristicas = form.watch('caracteristicas') ?? {};

  const handleToggle = (index: number, item: string) => {
    const current = form.getValues(`salas.${index}.caracteristicas`) ?? {};
    const selected = Object.prototype.hasOwnProperty.call(current, item);
    if (selected) {
      const next = { ...current };
      delete next[item];
      form.setValue(`salas.${index}.caracteristicas`, next, { shouldDirty: true });
      return;
    }
    setDialogDescription(
      String(form.getValues(`salas.${index}.caracteristicas.${item}`) ?? '')
    );
    setDialogState({ index, item });
  };

  const handleToggleFromRestaurant = (index: number, item: string) => {
    const current = form.getValues(`salas.${index}.caracteristicas`) ?? {};
    const selected = Object.prototype.hasOwnProperty.call(current, item);
    if (selected) {
      const next = { ...current };
      delete next[item];
      form.setValue(`salas.${index}.caracteristicas`, next, { shouldDirty: true });
      return;
    }
    setDialogDescription(String(restauranteCaracteristicas[item] ?? ''));
    setDialogState({ index, item });
  };

  const handleSaveDescripcion = (value: string) => {
    if (!dialogState) return;
    if (!value.trim()) {
      setDialogState(null);
      return;
    }
    const current = form.getValues(`salas.${dialogState.index}.caracteristicas`) ?? {};
    const next = { ...current, [dialogState.item]: value };
    form.setValue(`salas.${dialogState.index}.caracteristicas`, next, { shouldDirty: true });
    setDialogState(null);
  };

  return (
    <div className="space-y-4">
      {Object.keys(restauranteCaracteristicas).length > 0 && (
        <div className="rounded-2xl border border-[#7472fd]/20 bg-[#7472fd]/5 p-4 text-xs text-slate-600">
          <p className="font-semibold text-[#5f5bf2]">Características del restaurante</p>
          <p className="mt-1">
            Puedes heredar estas características en cada sala para agilizar la configuración.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.keys(restauranteCaracteristicas).map((item) => (
              <span key={item} className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
      {fields.map((field, index) => {
        const caracteristicas = form.watch(`salas.${index}.caracteristicas`) ?? {};
        return (
          <div key={field.id} className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">Sala {index + 1}</p>
              <Button
                type="button"
                variant="outline"
                className="border-rose-200 text-rose-600 hover:bg-rose-50"
                onClick={() => remove(index)}
              >
                Eliminar
              </Button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Nombre</p>
                <Input
                  placeholder="Nombre"
                  value={form.watch(`salas.${index}.nombre`) ?? ''}
                  onChange={(event) =>
                    form.setValue(`salas.${index}.nombre`, event.target.value, { shouldDirty: true })
                  }
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Precio privatización (€)</p>
                <NumberInput
                  placeholder="Precio privatización"
                  value={form.watch(`salas.${index}.precioPrivatizacion`) ?? 0}
                  onChangeValue={(value) =>
                    form.setValue(`salas.${index}.precioPrivatizacion`, value, { shouldDirty: true })
                  }
                />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-slate-600">Descripción</p>
              <Textarea
                placeholder="Descripción"
                value={form.watch(`salas.${index}.descripcion`) ?? ''}
                onChange={(event) =>
                  form.setValue(`salas.${index}.descripcion`, event.target.value, { shouldDirty: true })
                }
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Aforo mínimo</p>
                <NumberInput
                  placeholder="Aforo mínimo"
                  value={form.watch(`salas.${index}.aforoMinimo`) ?? 0}
                  onChangeValue={(value) =>
                    form.setValue(`salas.${index}.aforoMinimo`, value, { shouldDirty: true })
                  }
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Aforo máximo</p>
                <NumberInput
                  placeholder="Aforo máximo"
                  value={form.watch(`salas.${index}.aforoMaximo`) ?? 0}
                  onChangeValue={(value) =>
                    form.setValue(`salas.${index}.aforoMaximo`, value, { shouldDirty: true })
                  }
                />
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-[#7472fd]/30 bg-[#7472fd]/5 p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#4f4bd9]">
                <input
                  type="checkbox"
                  checked={form.watch(`salas.${index}.permiteReservaSinCompraAnticipada`) ?? false}
                  onChange={(event) =>
                    form.setValue(`salas.${index}.permiteReservaSinCompraAnticipada`, event.target.checked, {
                      shouldDirty: true,
                    })
                  }
                />
                Reserva sin compra anticipada
              </label>
              <p className="mt-2 text-xs text-[#5f5bf2]">
                Activa esta opción si la sala permite reservar sin pago previo. Después podrás solicitar anticipo según
                el grupo y el evento.
              </p>
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-slate-900">Características de la sala</p>
              {Object.keys(restauranteCaracteristicas).length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-white p-3">
                  <p className="text-xs font-semibold text-slate-700">Heredar del restaurante</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {Object.keys(restauranteCaracteristicas).map((item) => {
                      const selected = Object.prototype.hasOwnProperty.call(caracteristicas, item);
                      return (
                        <button
                          key={`heredar-${item}`}
                          type="button"
                          className={`rounded-xl border px-3 py-2 text-left text-sm ${
                            selected ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-600'
                          }`}
                          onClick={() => handleToggleFromRestaurant(index, item)}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {CARACTERISTICAS_FIJAS.map((item) => {
                  const selected = Object.prototype.hasOwnProperty.call(caracteristicas, item);
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-left text-sm ${
                        selected ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd]' : 'border-slate-200 text-slate-600'
                      }`}
                      onClick={() => handleToggle(index, item)}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
              {Object.keys(caracteristicas).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(caracteristicas).map(([item, description]) => (
                    <div key={`${field.id}-${item}`} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-700">{item}</p>
                      <p className="text-xs text-slate-500">{description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          append({
            nombre: '',
            descripcion: '',
            aforoMinimo: 0,
            aforoMaximo: 0,
            permiteReservaSinCompraAnticipada: false,
            precioPrivatizacion: 0,
            caracteristicas: {},
          })
        }
      >
        Añadir sala
      </Button>

      <CharacteristicDialog
        open={!!dialogState}
        title={dialogState?.item ?? ''}
        description={dialogDescription}
        onCancel={() => setDialogState(null)}
        onSave={handleSaveDescripcion}
      />
    </div>
  );
}
