'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, User, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthService } from '@/lib/services/auth.service';
import { useRouter } from 'next/navigation';
import type { Partner } from '@/lib/types/partner';

export default function PerfilPage() {
  const router = useRouter();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailDraft, setEmailDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const data = await AuthService.getCurrentPartner();
      if (!active) return;
      setPartner(data);
      const partnerEmail =
        data?.email ||
        (data as unknown as Record<string, string>)?.Email ||
        '';
      setEmailDraft(partnerEmail);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const display = useMemo(() => {
    const record = partner as unknown as Record<string, string> | null;
    const nombre =
      partner?.nombre ||
      record?.nombre ||
      '';
    const apellidos =
      partner?.apellidos ||
      record?.apellidos ||
      record?.Apellidos ||
      '';
    const email =
      partner?.email ||
      record?.Email ||
      '';
    const prefijo =
      partner?.prefijo ||
      record?.Prefijo ||
      '';
    const telefono =
      partner?.numeroTelefono ||
      record?.['Número de teléfono'] ||
      record?.numeroTelefono ||
      '';
    return {
      nombreCompleto: `${nombre} ${apellidos}`.trim() || 'Sin nombre',
      email,
      prefijo,
      telefono,
    };
  }, [partner]);

  const handleUpdateEmail = async () => {
    if (!emailDraft.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await AuthService.updatePartnerEmail(emailDraft);
      setSuccess(true);
      await AuthService.signOut();
      router.replace('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el email.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto w-full max-w-3xl">
          <div className="h-8 w-40 animate-pulse rounded-xl bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Perfil</p>
          <h1 className="text-2xl font-semibold text-slate-900">Datos de la cuenta</h1>
        </div>

        <Card className="border-none bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Información personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="flex items-center gap-3">
              <UserRound className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Nombre</p>
                <p className="font-semibold text-slate-900">{display.nombreCompleto}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</p>
                <p className="font-semibold text-slate-900">{display.email || 'Sin email'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Teléfono</p>
                <p className="font-semibold text-slate-900">
                  {display.prefijo || display.telefono ? `${display.prefijo} ${display.telefono}`.trim() : 'Sin teléfono'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {partner?.perfilMigrado === false && (
          <Card className="border border-amber-200 bg-amber-50/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-amber-600" />
                Cambiar correo electrónico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-amber-700">
                Tu perfil aún no está migrado. Actualiza el correo electrónico asociado a la cuenta.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-amber-700">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500">Email actual</p>
                  <p className="font-semibold text-amber-900">{display.email || 'Sin email'}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-amber-700">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500">Nuevo email</p>
                  <p className="font-semibold text-amber-900">{emailDraft || '—'}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={emailDraft}
                  onChange={(event) => setEmailDraft(event.target.value)}
                  placeholder="nuevo@email.com"
                  className="max-w-sm bg-white"
                />
                <Button
                  type="button"
                  className="bg-[#7472fd] text-white"
                  onClick={handleUpdateEmail}
                  disabled={saving || !emailDraft.trim()}
                >
                  {saving ? 'Guardando...' : 'Actualizar email'}
                </Button>
              </div>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              {success && <p className="text-xs text-emerald-600">Email actualizado correctamente.</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
