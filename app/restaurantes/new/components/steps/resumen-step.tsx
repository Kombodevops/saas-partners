import { useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import type { RestauranteNewForm } from '@/lib/validators/restaurante-new';

interface ResumenStepProps {
  imagenesCount: number;
  logoSelected: boolean;
  pdfsCount: number;
  onNavigate: (stepIndex: number) => void;
}

export function ResumenStep({ imagenesCount, logoSelected, pdfsCount, onNavigate }: ResumenStepProps) {
  const form = useFormContext<RestauranteNewForm>();
  const basico = useWatch({ control: form.control, name: 'basico' });
  const ubicacion = useWatch({ control: form.control, name: 'ubicacion' });
  const horarios = useWatch({ control: form.control, name: 'horarios' }) as RestauranteNewForm['horarios'] | undefined;
  const raciones = useWatch({ control: form.control, name: 'raciones' });
  const salas = useWatch({ control: form.control, name: 'salas' });
  const consumiciones = useWatch({ control: form.control, name: 'consumiciones' });
  const extras = useWatch({ control: form.control, name: 'extras' });
  const caracteristicas = useWatch({ control: form.control, name: 'caracteristicas' });
  const responsable = useWatch({ control: form.control, name: 'responsable' });

  return (
    <div className="space-y-5 text-sm text-slate-600">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Resumen completo</h3>
        <p className="text-xs text-slate-500">Accede a cualquier paso para editar</p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-900">Información básica</p>
          <Button type="button" variant="outline" size="sm" onClick={() => onNavigate(0)}>
            Editar
          </Button>
        </div>
        <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
          <p><span className="font-semibold">Nombre:</span> {basico?.nombre}</p>
          <p><span className="font-semibold">Teléfono:</span> {basico?.telefono}</p>
          <p><span className="font-semibold">Tipo de cocina:</span> {basico?.tipoCocina}</p>
          <p><span className="font-semibold">Presupuesto:</span> {basico?.presupuesto}</p>
          <p><span className="font-semibold">Aforo:</span> {basico?.aforoMin} - {basico?.aforoMax}</p>
        </div>
        <p className="mt-2 text-xs"><span className="font-semibold">Descripción:</span> {basico?.descripcion}</p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-900">Ubicación</p>
          <Button type="button" variant="outline" size="sm" onClick={() => onNavigate(1)}>
            Editar
          </Button>
        </div>
        <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
          <p><span className="font-semibold">Dirección:</span> {ubicacion?.direccion}</p>
          <p><span className="font-semibold">Ciudad:</span> {ubicacion?.ciudad}</p>
          <p><span className="font-semibold">Código postal:</span> {ubicacion?.codigoPostal}</p>
          <p><span className="font-semibold">Zona:</span> {ubicacion?.ubicacion}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-900">Horarios</p>
          <Button type="button" variant="outline" size="sm" onClick={() => onNavigate(2)}>
            Editar
          </Button>
        </div>
        <div className="mt-3 space-y-2 text-xs text-slate-600">
          {Object.entries(horarios ?? {}).map(([dia, info]) => {
            const infoData = info as { cerrado: boolean; intervalos: Array<{ horaInicio: string; horaFin: string }> };
            return (
            <div key={dia} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
              <p className="font-semibold text-slate-700">{dia}</p>
              <p className="text-slate-500">
                {infoData.cerrado || infoData.intervalos.length === 0
                  ? 'Cerrado'
                  : infoData.intervalos
                      .map((i) => `${i.horaInicio} - ${i.horaFin}`)
                      .join(', ')}
              </p>
            </div>
          );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-900">Raciones</p>
          <Button type="button" variant="outline" size="sm" onClick={() => onNavigate(3)}>
            Editar
          </Button>
        </div>
        <div className="mt-3 space-y-2 text-xs text-slate-600">
          {raciones && raciones.length > 0 ? (
            raciones.map((racion, index) => (
              <div key={`racion-${index}`} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <p className="font-semibold text-slate-700">{racion.nombre} · €{racion.precio}</p>
                <p className="text-slate-500">{racion.descripcion}</p>
              </div>
            ))
          ) : (
            <p className="text-slate-500">Sin raciones añadidas.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-900">Salas</p>
          <Button type="button" variant="outline" size="sm" onClick={() => onNavigate(5)}>
            Editar
          </Button>
        </div>
        <div className="mt-3 space-y-2 text-xs text-slate-600">
          {salas && salas.length > 0 ? (
            salas.map((sala, index) => (
              <div key={`sala-${index}`} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <p className="font-semibold text-slate-700">
                  {sala.nombre} · Aforo {sala.aforoMinimo}-{sala.aforoMaximo}
                </p>
                <p className="text-slate-500">{sala.descripcion}</p>
                <p className="text-slate-500">Privatización: €{sala.precioPrivatizacion}</p>
                <p className="text-slate-500">
                  Reserva sin compra anticipada: {sala.permiteReservaSinCompraAnticipada ? 'Sí' : 'No'}
                </p>
                <p className="text-slate-500">
                  Características: {Object.keys(sala.caracteristicas || {}).join(', ') || 'Sin características'}
                </p>
              </div>
            ))
          ) : (
            <p className="text-slate-500">Sin salas añadidas.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-900">Consumiciones</p>
          <Button type="button" variant="outline" size="sm" onClick={() => onNavigate(6)}>
            Editar
          </Button>
        </div>
        <div className="mt-3 space-y-2 text-xs text-slate-600">
          {consumiciones && consumiciones.length > 0 ? (
            consumiciones.map((item, index) => (
              <div key={`cons-${index}`} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <p className="font-semibold text-slate-700">{item.nombre} · €{item.precio}</p>
                <p className="text-slate-500">{item.descripcion}</p>
              </div>
            ))
          ) : (
            <p className="text-slate-500">Sin consumiciones añadidas.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-900">Extras</p>
          <Button type="button" variant="outline" size="sm" onClick={() => onNavigate(7)}>
            Editar
          </Button>
        </div>
        <div className="mt-3 space-y-2 text-xs text-slate-600">
          {extras && extras.length > 0 ? (
            extras.map((extra, index) => (
              <div key={`extra-${index}`} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <p className="font-semibold text-slate-700">{extra.nombre} · €{extra.precio}</p>
                <p className="text-slate-500">{extra.descripcion}</p>
                <p className="text-slate-500">Tipo de precio: {extra.tipoPrecio}</p>
              </div>
            ))
          ) : (
            <p className="text-slate-500">Sin extras añadidos.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-900">Características</p>
          <Button type="button" variant="outline" size="sm" onClick={() => onNavigate(4)}>
            Editar
          </Button>
        </div>
        <div className="mt-3 space-y-2 text-xs text-slate-600">
          {caracteristicas && Object.keys(caracteristicas).length > 0 ? (
            Object.entries(caracteristicas).map(([item, description]) => (
              <div key={item} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <p className="font-semibold text-slate-700">{item}</p>
                <p className="text-slate-500">{description}</p>
              </div>
            ))
          ) : (
            <p className="text-slate-500">Sin características añadidas.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-900">Archivos</p>
          <Button type="button" variant="outline" size="sm" onClick={() => onNavigate(8)}>
            Editar
          </Button>
        </div>
        <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
          <p><span className="font-semibold">Imágenes:</span> {imagenesCount}</p>
          <p><span className="font-semibold">Logo:</span> {logoSelected ? 'Sí' : 'No'}</p>
          <p><span className="font-semibold">PDFs:</span> {pdfsCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-900">Responsable</p>
          <Button type="button" variant="outline" size="sm" onClick={() => onNavigate(9)}>
            Editar
          </Button>
        </div>
        <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
          <p><span className="font-semibold">Nombre:</span> {responsable?.nombre}</p>
          <p><span className="font-semibold">Teléfono:</span> {responsable?.telefono}</p>
        </div>
      </div>
    </div>
  );
}
