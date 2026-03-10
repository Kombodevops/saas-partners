import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { RestauranteNewForm } from '@/lib/validators/restaurante-new';

interface ConsumicionesStepProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export function ConsumicionesStep({ files, onFilesChange }: ConsumicionesStepProps) {
  const form = useFormContext<RestauranteNewForm>();
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'consumiciones' });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">Consumición {index + 1}</p>
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
              value={form.watch(`consumiciones.${index}.nombre`) ?? ''}
              onChange={(event) =>
                form.setValue(`consumiciones.${index}.nombre`, event.target.value, { shouldDirty: true })
              }
            />
            <Input
              type="number"
              placeholder="Precio"
              value={form.watch(`consumiciones.${index}.precio`) ?? 0}
              onChange={(event) =>
                form.setValue(`consumiciones.${index}.precio`, Number(event.target.value), { shouldDirty: true })
              }
            />
          </div>
          <Textarea
            className="mt-3"
            placeholder="Descripción"
            value={form.watch(`consumiciones.${index}.descripcion`) ?? ''}
            onChange={(event) =>
              form.setValue(`consumiciones.${index}.descripcion`, event.target.value, { shouldDirty: true })
            }
          />
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => append({ nombre: '', descripcion: '', precio: 0 })}>
        Añadir consumición
      </Button>
    </div>
  );
}
