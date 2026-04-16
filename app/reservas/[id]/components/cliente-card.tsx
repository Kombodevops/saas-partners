'use client';

import { Copy, Mail, Phone, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

type Props = {
  nombre?: string;
  email?: string | null;
  telefono?: string | null;
  showContact?: boolean;
  manageUrl?: string | null;
  userId?: string | null;
  onSendEmail?: () => void;
  sendingEmail?: boolean;
};

export function ClienteCard({
  nombre,
  email,
  telefono,
  showContact = true,
  manageUrl,
  userId,
  onSendEmail,
  sendingEmail,
}: Props) {
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
    <Card className="gap-2 border-none bg-white p-4 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 p-0">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Cliente</p>
        {manageUrl ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSendEmail}
              className="gap-2"
              disabled={!email || !onSendEmail || sendingEmail}
            >
              <Send className="h-4 w-4" />
              {sendingEmail ? 'Enviando...' : email ? 'Enviar recordatorio' : 'Email no disponible'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
              disabled={!manageUrl}
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copiado' : 'Copiar enlace'}
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 p-0 text-sm text-slate-600">
        <p className="text-sm font-semibold text-slate-900">{nombre || 'Cliente sin nombre'}</p>
        {showContact && email && (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-400" />
            <span>{email}</span>
          </div>
        )}
        {showContact && telefono && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-slate-400" />
            <span>{telefono}</span>
          </div>
        )}
        {manageUrl && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Enlace para el cliente</p>
            <p className="mt-1 break-all text-xs text-slate-600">{manageUrl}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
