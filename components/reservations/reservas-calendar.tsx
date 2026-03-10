'use client';

import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import type { Locale } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ReservasCalendarRange {
  from?: Date;
  to?: Date;
}

interface ReservasCalendarProps {
  selected: ReservasCalendarRange;
  onSelect: (range?: ReservasCalendarRange) => void;
  locale: Locale;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  dayStats?: Record<string, Array<{ color: string; count: number }>>;
}

const WEEKDAY_KEYS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];

const clampRange = (current: ReservasCalendarRange, date: Date): ReservasCalendarRange => {
  const { from, to } = current;
  if (!from || (from && to)) {
    return { from: date, to: undefined };
  }
  if (isBefore(date, from)) {
    return { from: date, to: from };
  }
  return { from, to: date };
};

export function ReservasCalendar({
  selected,
  onSelect,
  locale,
  month: controlledMonth,
  onMonthChange,
  dayStats = {},
}: ReservasCalendarProps) {
  const initialMonth = controlledMonth ?? selected.from ?? new Date();
  const [internalMonth, setInternalMonth] = useState<Date>(startOfMonth(initialMonth));
  const month = controlledMonth ?? internalMonth;

  const setMonth = (next: Date) => {
    setInternalMonth(next);
    onMonthChange?.(next);
  };

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const result: Date[] = [];
    let cursor = start;
    while (cursor <= end) {
      result.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return result;
  }, [month]);

  const isInRange = (date: Date) => {
    if (!selected.from || !selected.to) return false;
    if (isSameDay(date, selected.from) || isSameDay(date, selected.to)) return true;
    return isAfter(date, selected.from) && isBefore(date, selected.to);
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(startOfMonth(subMonths(month, 1)))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-[#7472fd]/40 hover:text-[#3b3af2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7472fd]/40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-base font-semibold text-slate-900">
          {format(month, 'MMMM yyyy', { locale })}
        </div>
        <button
          type="button"
          onClick={() => setMonth(startOfMonth(addMonths(month, 1)))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-[#7472fd]/40 hover:text-[#3b3af2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7472fd]/40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
        {WEEKDAY_KEYS.map((key) => (
          <div key={key} className="py-1 font-medium uppercase tracking-wide">
            {key}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const outside = !isSameMonth(day, month);
          const isSelectedStart = selected.from && isSameDay(day, selected.from);
          const isSelectedEnd = selected.to && isSameDay(day, selected.to);
          const inRange = isInRange(day);
          const isSelected = isSelectedStart || isSelectedEnd;
          const isRangeMiddle = inRange && !isSelected;

          const dayKey = format(day, 'yyyy-MM-dd');
          const bars = dayStats[dayKey] ?? [];

          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => onSelect(clampRange(selected, day))}
              className={[
                'relative flex flex-col items-center justify-center rounded-xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7472fd]/30',
                'h-12 md:h-12 lg:h-12 xl:h-14 2xl:h-16',
                outside ? 'text-slate-300' : 'text-slate-800',
                isRangeMiddle ? 'bg-[#7472fd]/10 text-[#3b3af2]' : 'bg-white',
                isSelected ? 'bg-[#7472fd]/10 text-slate-900 ring-2 ring-[#7472fd]/30' : '',
                !outside ? 'hover:border hover:border-[#7472fd]/40' : '',
              ].join(' ')}
            >
              <span>{format(day, 'd', { locale })}</span>
              {bars.length > 0 && (
                <span className="mt-1 flex w-full items-center justify-center px-2">
                  {bars.map((bar, index) => (
                    <span
                      key={`${dayKey}-bar-${index}`}
                      className={`h-1.5 flex-1 ${bar.color} ${
                        index === 0 ? 'rounded-l-full' : ''
                      } ${index === bars.length - 1 ? 'rounded-r-full' : ''}`}
                      title={`${bar.count} reservas`}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
