'use client';

import { Copy, Mail, Phone, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

type Props = {
  nombre?: string;
  email?: string | null;
  telefono?: string | null;
  manageUrl?: string | null;
  userId?: string | null;
  onSendEmail?: () => void;
  sendingEmail?: boolean;
};

export function ClienteCard({ nombre, email, telefono, manageUrl, userId, onSendEmail, sendingEmail }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!manageUrl) return;
    try {
      await navigator.clipboard.writeText(manageUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card className="border-none bg-white shadow-sm">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Cliente</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600">
        <p className="text-sm font-semibold text-slate-900">{nombre || 'Cliente sin nombre'}</p>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-slate-400" />
          <span>{email || 'Sin email'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-slate-400" />
          <span>{telefono || 'Sin teléfono'}</span>
        </div>
        {manageUrl && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Compartir enlace</p>
            <p className="mt-2 break-all text-xs text-slate-600">{manageUrl}</p>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              {userId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onSendEmail}
                  className="gap-2"
                  disabled={!email || !onSendEmail || sendingEmail}
                >
                  <Send className="h-4 w-4" />
                  {sendingEmail ? 'Enviando...' : email ? 'Enviar por email' : 'Email no disponible'}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copiado' : 'Copiar enlace'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
