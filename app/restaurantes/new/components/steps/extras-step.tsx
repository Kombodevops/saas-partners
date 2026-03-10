import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { RestauranteNewForm } from '@/lib/validators/restaurante-new';

export function ExtrasStep() {
  const form = useFormContext<RestauranteNewForm>();
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'extras' });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => {
        const tipoPrecio = form.watch(`extras.${index}.tipoPrecio`) ?? 'fijo';
        return (
          <div key={field.id} className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">Extra {index + 1}</p>
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
                  value={form.watch(`extras.${index}.nombre`) ?? ''}
                  onChange={(event) =>
                    form.setValue(`extras.${index}.nombre`, event.target.value, { shouldDirty: true })
                  }
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Precio (€)</p>
                <Input
                  type="number"
                  placeholder="Precio"
                  value={form.watch(`extras.${index}.precio`) ?? 0}
                  onChange={(event) =>
                    form.setValue(`extras.${index}.precio`, Number(event.target.value), { shouldDirty: true })
                  }
                />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-slate-600">Descripción</p>
              <Textarea
                placeholder="Descripción"
                value={form.watch(`extras.${index}.descripcion`) ?? ''}
                onChange={(event) =>
                  form.setValue(`extras.${index}.descripcion`, event.target.value, { shouldDirty: true })
                }
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { value: 'fijo', label: 'Precio fijo' },
                { value: 'porHora', label: 'Por hora' },
                { value: 'porUnidad', label: 'Por unidad' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    tipoPrecio === option.value
                      ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd]'
                      : 'border-slate-200 text-slate-600'
                  }`}
                  onClick={() => {
                    form.setValue(`extras.${index}.tipoPrecio`, option.value as 'fijo' | 'porHora' | 'porUnidad', {
                      shouldDirty: true,
                    });
                    if (option.value === 'porHora') {
                      form.setValue(`extras.${index}.tiempoMinimoHoras`, 1, { shouldDirty: true });
                      form.setValue(`extras.${index}.tipoIncremento`, 'porHora', { shouldDirty: true });
                    }
                    if (option.value === 'porUnidad') {
                      form.setValue(`extras.${index}.unidadesMinimas`, 1, { shouldDirty: true });
                    }
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {tipoPrecio === 'porHora' && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Tiempo mínimo (horas)</p>
                  <Input
                    type="number"
                    placeholder="Tiempo mínimo (horas)"
                    value={form.watch(`extras.${index}.tiempoMinimoHoras`) ?? 1}
                    onChange={(event) =>
                      form.setValue(`extras.${index}.tiempoMinimoHoras`, Number(event.target.value), { shouldDirty: true })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Tipo de incremento</p>
                  <select
                    className="h-10 rounded-md border border-slate-200 px-3 text-sm"
                    value={form.watch(`extras.${index}.tipoIncremento`) ?? 'porHora'}
                    onChange={(event) =>
                      form.setValue(`extras.${index}.tipoIncremento`, event.target.value as 'porHora' | 'porMediaHora', {
                        shouldDirty: true,
                      })
                    }
                  >
                    <option value="porHora">Por hora</option>
                    <option value="porMediaHora">Por media hora</option>
                  </select>
                </div>
              </div>
            )}
            {tipoPrecio === 'porUnidad' && (
              <div className="mt-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Unidades mínimas</p>
                  <Input
                    type="number"
                    placeholder="Unidades mínimas"
                    value={form.watch(`extras.${index}.unidadesMinimas`) ?? 1}
                    onChange={(event) =>
                      form.setValue(`extras.${index}.unidadesMinimas`, Number(event.target.value), { shouldDirty: true })
                    }
                  />
                </div>
              </div>
            )}
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
            precio: 0,
            tipoPrecio: 'fijo',
          })
        }
      >
        Añadir extra
      </Button>
    </div>
  );
}
