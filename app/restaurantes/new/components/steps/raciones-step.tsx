import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import type { RestauranteNewForm } from '@/lib/validators/restaurante-new';

export function RacionesStep() {
  const form = useFormContext<RestauranteNewForm>();
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'raciones' });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">Ración {index + 1}</p>
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
            <Input
              placeholder="Nombre"
              value={form.watch(`raciones.${index}.nombre`) ?? ''}
              onChange={(event) => form.setValue(`raciones.${index}.nombre`, event.target.value, { shouldDirty: true })}
            />
            <NumberInput
              placeholder="Precio"
              value={form.watch(`raciones.${index}.precio`) ?? 0}
              onChangeValue={(value) =>
                form.setValue(`raciones.${index}.precio`, value, { shouldDirty: true })
              }
            />
          </div>
          <Textarea
            className="mt-3"
            placeholder="Descripción"
            value={form.watch(`raciones.${index}.descripcion`) ?? ''}
            onChange={(event) =>
              form.setValue(`raciones.${index}.descripcion`, event.target.value, { shouldDirty: true })
            }
          />
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => append({ nombre: '', descripcion: '', precio: 0 })}>
        Añadir ración
      </Button>
    </div>
  );
}
