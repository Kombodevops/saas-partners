import type { ComponentPropsWithoutRef } from 'react';

type QuickLinkKey =
  | 'info-general'
  | 'datos-fiscales'
  | 'responsable'
  | 'imagenes'
  | 'caracteristicas'
  | 'horario'
  | 'carta'
  | 'packs'
  | 'salas'
  | 'raciones'
  | 'extras'
  | 'barra';

const LINKS: { key: QuickLinkKey; label: string; href: string }[] = [
  { key: 'info-general', label: 'Información general', href: '#info-general' },
  { key: 'datos-fiscales', label: 'Datos fiscales', href: '#datos-fiscales' },
  { key: 'imagenes', label: 'Imágenes y logo', href: '#imagenes' },
  { key: 'horario', label: 'Horario', href: '#horario' },
  { key: 'responsable', label: 'Responsable', href: '#responsable' },
  { key: 'carta', label: 'Carta', href: '#carta' },
  { key: 'caracteristicas', label: 'Características', href: '#caracteristicas' },
  { key: 'salas', label: 'Salas', href: '#salas' },
  { key: 'barra', label: 'Consumiciones en barra', href: '#barra' },
  { key: 'extras', label: 'Extras', href: '#extras' },
  { key: 'raciones', label: 'Raciones', href: '#raciones' },
  { key: 'packs', label: 'Planes', href: '#packs' },
];

interface RestauranteQuickLinksProps extends ComponentPropsWithoutRef<'section'> {
  onOpen?: Partial<Record<QuickLinkKey, () => void>>;
  onNavigate?: Partial<Record<QuickLinkKey, () => void>>;
}

export function RestauranteQuickLinks({ onOpen, onNavigate, ...props }: RestauranteQuickLinksProps) {
  return (
    <section {...props} className={`space-y-2 ${props.className ?? ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Acceso rápido</p>
          <p className="text-xs text-slate-500">
            Entra directo a cada sección del restaurante.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {LINKS.map((item) => {
        const handler = onOpen?.[item.key];
        const navigate = onNavigate?.[item.key];
        if (handler) {
          return (
            <button
              key={item.key}
              type="button"
              onClick={handler}
              className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
            >
              {item.label}
            </button>
          );
        }
        if (navigate) {
          return (
            <button
              key={item.key}
              type="button"
              onClick={navigate}
              className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
            >
              {item.label}
            </button>
          );
        }
        return (
          <a
            key={item.key}
            href={item.href}
            className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
          >
            {item.label}
          </a>
        );
      })}
      </div>
    </section>
  );
}
