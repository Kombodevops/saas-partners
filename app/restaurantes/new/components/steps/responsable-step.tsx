import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { RestauranteNewForm } from '@/lib/validators/restaurante-new';

export function ResponsableStep() {
  const form = useFormContext<RestauranteNewForm>();

  return (
    <div className="grid gap-4">
      <FormField
        control={form.control}
        name="responsable.nombre"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre del responsable</FormLabel>
            <FormControl>
              <Input placeholder="Nombre del responsable" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="responsable.telefono"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Teléfono del responsable</FormLabel>
            <FormControl>
              <Input placeholder="Teléfono del responsable" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
