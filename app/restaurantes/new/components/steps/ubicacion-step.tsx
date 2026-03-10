import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UBICACIONES } from '../constants';
import type { RestauranteNewForm } from '@/lib/validators/restaurante-new';

export function UbicacionStep() {
  const form = useFormContext<RestauranteNewForm>();

  return (
    <div className="grid gap-4">
      <FormField
        control={form.control}
        name="ubicacion.direccion"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Dirección</FormLabel>
            <FormControl>
              <Input placeholder="Dirección" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="ubicacion.ciudad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ciudad</FormLabel>
              <FormControl>
                <Input placeholder="Ciudad" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ubicacion.codigoPostal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código postal</FormLabel>
              <FormControl>
                <Input placeholder="Código postal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="ubicacion.ubicacion"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Zona</FormLabel>
            <FormControl>
              <div className="grid gap-3 sm:grid-cols-2">
                {UBICACIONES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`rounded-xl border px-4 py-3 text-left text-sm ${
                      field.value === item ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd]' : 'border-slate-200 text-slate-600'
                    }`}
                    onClick={() => field.onChange(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
