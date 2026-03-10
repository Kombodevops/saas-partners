import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CharacteristicDialogProps {
  open: boolean;
  title: string;
  description?: string;
  onCancel: () => void;
  onSave: (value: string) => void;
}

export function CharacteristicDialog({
  open,
  title,
  description,
  onCancel,
  onSave,
}: CharacteristicDialogProps) {
  const [value, setValue] = useState(description ?? '');

  useEffect(() => {
    if (open) {
      setValue(description ?? '');
    }
  }, [open, description]);

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onCancel() : null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Descripción de {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Añade una descripción clara para ayudar a los clientes a entender la característica.
          </p>
          <Textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Ej: Terraza amplia climatizada, con calefactores y zona lounge."
            rows={6}
          />
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => onSave(value.trim())} disabled={!value.trim()}>
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
