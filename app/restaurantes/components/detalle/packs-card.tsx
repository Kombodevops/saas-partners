import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import type { RestauranteDetalleDoc } from '@/lib/validators/restaurante-detalle';
import type { PackDetalle } from '@/lib/services/pack-detalle.service';

interface PacksCardProps {
  packs: PackDetalle[];
  allPacks?: PackDetalle[];
  restauranteId?: string;
  salas?: RestauranteDetalleDoc['salas'];
  onOpenSalas?: () => void;
  onEditPack?: (packId: string) => void;
  onCreatePack?: (type: 'menus' | 'tickets' | 'barras') => void;
}

export function PacksCard({
  packs,
  allPacks,
  restauranteId,
  salas,
  onOpenSalas,
  onEditPack,
  onCreatePack,
}: PacksCardProps) {
  const consumoLibre = (salas ?? []).filter((sala) => sala.permiteReservaSinCompraAnticipada);
  const consumoLibreActivo = consumoLibre.length > 0;
  const packsList = allPacks && allPacks.length > 0 ? allPacks : packs;
  const hasMenus = packsList.some((pack) => pack.Categoria === 'Menú');
  const hasTickets = packsList.some((pack) => pack.Categoria === 'Tickets');
  const hasBarras = packsList.some((pack) => pack.Subcategoria === 'Barra Libre');

  return (
    <Card id="packs" className="border-none bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span>Planes vinculados</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex h-full flex-col rounded-xl border border-slate-100 px-3 py-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-slate-900">Consumo libre en el local</p>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    consumoLibreActivo ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {consumoLibreActivo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="text-sm text-slate-500">Salas con reserva sin compra anticipada.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            {consumoLibre.length === 0 ? (
              <p className="text-xs text-slate-600">
                Para ofrecer este tipo de reservas debes editar las salas y activar “Reserva sin compra anticipada”.
              </p>
            ) : (
              consumoLibre.map((sala, index) => (
                <div key={`${sala.nombre}-${index}`} className="rounded-xl px-3 py-2">
                  <p className="font-semibold text-slate-900">{sala.nombre || `Sala ${index + 1}`}</p>
                  <p className="text-xs text-slate-500">Aforo: {sala.aforoMinimo} - {sala.aforoMaximo}</p>
                </div>
              ))
            )}
          </div>
          {onOpenSalas ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-auto self-end hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
              onClick={onOpenSalas}
            >
              Editar salas
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="mt-auto self-end hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
              asChild
            >
              <a href="#salas">Editar salas</a>
            </Button>
          )}
        </div>

        {packsList.map((pack) => {
            const isLinked = restauranteId
              ? Boolean(
                  pack.restaurantesIds?.includes(restauranteId) ||
                    pack.Menus?.some((menu) => menu.restaurantesIds?.includes(restauranteId)) ||
                    pack.Tickets?.some((ticket) => ticket.restaurantesIds?.includes(restauranteId)) ||
                    pack['Barra Libre']?.some((barra) => barra.restaurantesIds?.includes(restauranteId))
                )
              : true;
            return (
              <div key={pack.id} className="flex h-full flex-col rounded-xl border border-slate-100 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-slate-900">{pack['Nombre del pack']}</p>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    pack.activo && isLinked ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {pack.activo && isLinked ? 'Activo' : 'Inactivo en este restaurante'}
                </span>
                {pack.Subcategoria && pack.Subcategoria !== 'Barra Libre' && (
                  <span className="rounded-full bg-[#7472fd]/10 px-2 py-1 text-xs font-semibold text-[#7472fd]">
                    {pack.Subcategoria}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-500">{pack['Descripción']}</p>
              {!isLinked && (
                <p className="mt-2 text-xs text-slate-500">
                  {pack.Categoria === 'Menú' && 'Entra al plan para añadir menús a este restaurante.'}
                  {pack.Categoria === 'Tickets' && 'Entra al plan para añadir tickets a este restaurante.'}
                  {pack.Subcategoria === 'Barra Libre' && 'Entra al plan para añadir barras libres a este restaurante.'}
                  {pack.Subcategoria === null && pack.Categoria === 'Best Deal' && 'Entra al plan para añadir menús, tickets y barras libres a este restaurante.'}
                </p>
              )}
              <div className="mt-3 text-xs text-slate-500">
                {pack.Categoria === 'Tickets' && `Incluye: ${pack.Tickets?.length ?? 0} tickets`}
                {pack.Categoria === 'Menú' && `Incluye: ${pack.Menus?.length ?? 0} menús`}
                {pack.Subcategoria === 'Barra Libre' && `Incluye: ${pack['Barra Libre']?.length ?? 0} barras libres`}
                {pack.Subcategoria === null && pack.Categoria === 'Best Deal' && (
                  <span>
                    Incluye: {pack.Menus?.length ?? 0} menús · {pack['Barra Libre']?.length ?? 0} barras libres ·{' '}
                    {pack.Tickets?.length ?? 0} tickets
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-auto self-end hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
                onClick={() => onEditPack?.(pack.id)}
              >
                {isLinked ? 'Editar plan' : 'Añadir a este restaurante'}
              </Button>
              </div>
            );
          })}

        {!hasMenus && (
          <div className="flex h-full flex-col rounded-xl border border-dashed border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-slate-900">Menús</p>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                Aún sin pack
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Crea un pack de menús para empezar a añadir opciones en este restaurante.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-auto self-end hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
              onClick={() => onCreatePack?.('menus')}
            >
              Crear pack de menús
            </Button>
          </div>
        )}

        {!hasBarras && (
          <div className="flex h-full flex-col rounded-xl border border-dashed border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-slate-900">Barras libres</p>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                Aún sin pack
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Crea un pack de barras libres para empezar a configurarlas en este restaurante.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-auto self-end hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
              onClick={() => onCreatePack?.('barras')}
            >
              Crear pack de barras libres
            </Button>
          </div>
        )}

        {!hasTickets && (
          <div className="flex h-full flex-col rounded-xl border border-dashed border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-slate-900">Tickets</p>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                Aún sin pack
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Crea un pack de tickets para empezar a configurarlos en este restaurante.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-auto self-end hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
              onClick={() => onCreatePack?.('tickets')}
            >
              Crear pack de tickets
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
