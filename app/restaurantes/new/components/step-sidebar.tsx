import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { STEPS, type StepKey } from './constants';

interface StepSidebarProps {
  currentStep: number;
  completedSteps: boolean[];
  onSelect: (index: number) => void;
}

export function StepSidebar({ currentStep, completedSteps, onSelect }: StepSidebarProps) {
  return (
    <Card className="border-none bg-white shadow-sm ring-1 ring-slate-100">
      <CardHeader>
        <CardTitle className="text-base">Pasos</CardTitle>
        <CardDescription>Completa cada sección para continuar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {STEPS.map((step, index) => (
          <button
            key={step.key}
            type="button"
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
              index === currentStep
                ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd]'
                : 'border-slate-100 text-slate-600 hover:border-[#7472fd]/40'
            }`}
            onClick={() => onSelect(index)}
          >
            <span>{step.title}</span>
            {completedSteps[index] && <CheckCircle2 className="h-4 w-4" />}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
