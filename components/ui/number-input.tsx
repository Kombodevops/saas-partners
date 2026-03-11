'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

type Props = Omit<React.ComponentProps<typeof Input>, 'type' | 'value' | 'onChange'> & {
  value?: number | null;
  onChangeValue: (value: number) => void;
  emptyValue?: number;
};

export function NumberInput({ value, onChangeValue, emptyValue = 1, onBlur, ...props }: Props) {
  const [text, setText] = useState(value == null ? '' : String(value));

  useEffect(() => {
    setText(value == null ? '' : String(value));
  }, [value]);

  return (
    <Input
      {...props}
      type="number"
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={(event) => {
        const raw = event.target.value.trim();
        if (!raw) {
          setText(String(emptyValue));
          onChangeValue(emptyValue);
          onBlur?.(event);
          return;
        }
        const parsed = Number(raw);
        if (!Number.isNaN(parsed)) {
          setText(String(parsed));
          onChangeValue(parsed);
        }
        onBlur?.(event);
      }}
    />
  );
}
