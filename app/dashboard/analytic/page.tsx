'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthService } from '@/lib/services/auth.service';
import { AnalyticsChannelsService, type AnalyticsChannel } from '@/lib/services/analytics-channels.service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AnalyticsPage() {
  const [channels, setChannels] = useState<AnalyticsChannel[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AnalyticsChannel | null>(null);

  const normalizedInput = useMemo(() => input.trim(), [input]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const id = await AuthService.getCurrentPartnerId();
      if (!active) return;
      setPartnerId(id);
      if (!id) {
        setChannels([]);
        setLoading(false);
        return;
      }
      const list = await AnalyticsChannelsService.getChannelsWithColors(id);
      if (!active) return;
      setChannels(list);
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const handleAdd = async () => {
    if (!partnerId || !normalizedInput) return;
    if (channels.some((c) => c.name.toLowerCase() === normalizedInput.toLowerCase())) {
      setInput('');
      return;
    }
    setSaving(true);
    try {
      await AnalyticsChannelsService.addChannel(partnerId, normalizedInput);
      setChannels((prev) => [...prev, { name: normalizedInput, color: '#7472fd' }]);
      setInput('');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (channel: AnalyticsChannel) => {
    if (!partnerId) return;
    setSaving(true);
    try {
      await AnalyticsChannelsService.removeChannel(partnerId, channel.name);
      setChannels((prev) => prev.filter((item) => item.name !== channel.name));
    } finally {
      setSaving(false);
    }
  };

  // color handling stored for future use, no UI editing for now

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Analítica</p>
          <h1 className="text-xl font-semibold text-slate-900">Canales</h1>
          <p className="text-sm text-slate-500">
            Gestiona los canales por donde llegan las reservas para etiquetar el origen.
          </p>
        </div>
      </div>

      <Card className="border-none bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <BarChart3 className="h-4 w-4" />
                Canales
              </div>
              <CardTitle className="text-[14px]">Añadir canales</CardTitle>
              <CardDescription>
                Guarda los canales que usarás para clasificar reservas.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Ej: Instagram, WhatsApp, Referidos"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="max-w-sm"
            />
            <Button
              type="button"
              className="bg-[#7472fd] text-white"
              onClick={handleAdd}
              disabled={!normalizedInput || saving}
            >
              <Plus className="mr-2 h-4 w-4" />
              Añadir canal
            </Button>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Cargando canales...
            </div>
          ) : channels.length === 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Aún no tienes canales guardados.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {channels.map((channel) => (
                <div
                  key={channel.name}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <span className="font-medium">{channel.name}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => setRemoveTarget(channel)}
                    disabled={saving}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(removeTarget)} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitar canal</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el canal seleccionado de tu lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!removeTarget) return;
                await handleRemove(removeTarget);
                setRemoveTarget(null);
              }}
            >
              Quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
