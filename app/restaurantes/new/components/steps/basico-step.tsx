import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { RestauranteNewForm } from '@/lib/validators/restaurante-new';

export function BasicoStep() {
  const form = useFormContext<RestauranteNewForm>();

  return (
    <div className="grid gap-4">
      <FormField
        control={form.control}
        name="basico.nombre"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre del restaurante</FormLabel>
            <FormControl>
              <Input placeholder="Nombre del restaurante" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="basico.descripcion"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción</FormLabel>
            <FormControl>
              <Textarea placeholder="Describe el restaurante" rows={4} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="basico.telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="Teléfono" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="basico.tipoCocina"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de cocina</FormLabel>
              <FormControl>
                <Input placeholder="Tipo de cocina" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="basico.aforoMin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aforo mínimo</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={field.value ?? 0}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="basico.aforoMax"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aforo máximo</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={field.value ?? 0}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="basico.presupuesto"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Presupuesto</FormLabel>
            <FormControl>
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  className={`rounded-xl border px-4 py-3 text-left text-sm ${
                    field.value === '1' ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd]' : 'border-slate-200 text-slate-600'
                  }`}
                  onClick={() => field.onChange('1')}
                >
                  <p className="font-semibold">€ - Económico</p>
                  <p className="text-xs text-slate-500">
                    Lugares muy baratos. Comidas sencillas o precios bajos.
                  </p>
                </button>
                <button
                  type="button"
                  className={`rounded-xl border px-4 py-3 text-left text-sm ${
                    field.value === '2' ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd]' : 'border-slate-200 text-slate-600'
                  }`}
                  onClick={() => field.onChange('2')}
                >
                  <p className="font-semibold">€€ - Moderado</p>
                  <p className="text-xs text-slate-500">
                    Rango medio, la mayoría de restaurantes normales.
                  </p>
                </button>
                <button
                  type="button"
                  className={`rounded-xl border px-4 py-3 text-left text-sm ${
                    field.value === '3' ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd]' : 'border-slate-200 text-slate-600'
                  }`}
                  onClick={() => field.onChange('3')}
                >
                  <p className="font-semibold">€€€ - Premium</p>
                  <p className="text-xs text-slate-500">
                    Restaurantes de gama alta o con precios elevados.
                  </p>
                </button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
