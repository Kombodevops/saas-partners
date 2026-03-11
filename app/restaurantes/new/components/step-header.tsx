import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
interface StepHeaderProps {
  currentStep: number;
  total: number;
  title: string;
  description: string;
  onBack: () => void;
}

export function StepHeader({ currentStep, total, title, description, onBack }: StepHeaderProps) {
  return (
    <Card className="border-none bg-white shadow-sm ring-1 ring-slate-100">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <Button variant="outline" className="mb-3 gap-2" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {Array.from({ length: total }).map((_, index) => (
            <div
              key={`step-dot-${index}`}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                index <= currentStep ? 'bg-[#7472fd] text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
