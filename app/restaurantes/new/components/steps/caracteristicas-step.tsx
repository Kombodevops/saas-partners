import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { CARACTERISTICAS_FIJAS } from '@/lib/validators/restaurante-caracteristicas';
import type { RestauranteNewForm } from '@/lib/validators/restaurante-new';
import { CharacteristicDialog } from '../characteristic-dialog';

export function CaracteristicasStep() {
  const form = useFormContext<RestauranteNewForm>();
  const [dialog, setDialog] = useState<string | null>(null);
  const caracteristicas = form.watch('caracteristicas') ?? {};

  const handleToggle = (item: string) => {
    const selected = Object.prototype.hasOwnProperty.call(caracteristicas, item);
    if (selected) {
      const next = { ...caracteristicas };
      delete next[item];
      form.setValue('caracteristicas', next, { shouldDirty: true });
      return;
    }
    setDialog(item);
  };

  const handleSave = (value: string) => {
    if (!dialog || !value.trim()) {
      setDialog(null);
      return;
    }
    form.setValue('caracteristicas', { ...caracteristicas, [dialog]: value }, { shouldDirty: true });
    setDialog(null);
  };

  return (
    <div className="space-y-4">
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
              onClick={() => handleToggle(item)}
            >
              {item}
            </button>
          );
        })}
      </div>
      {Object.keys(caracteristicas).length > 0 && (
        <div className="space-y-2">
          {Object.entries(caracteristicas).map(([item, description]) => (
            <div key={item} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold text-slate-700">{item}</p>
              <p className="text-xs text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      )}
      <CharacteristicDialog
        open={!!dialog}
        title={dialog ?? ''}
        description={dialog ? caracteristicas[dialog] : ''}
        onCancel={() => {
          if (dialog && !(dialog in caracteristicas)) {
            const next = { ...caracteristicas };
            delete next[dialog];
            form.setValue('caracteristicas', next, { shouldDirty: true });
          }
          setDialog(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
