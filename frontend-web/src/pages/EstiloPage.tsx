import { ReactNode, useState } from 'react';
import {
  BellRing,
  Brush,
  CircleUserRound,
  Clock,
  DollarSign,
  Gem,
  HandCoins,
  Heart,
  Home,
  LayoutDashboard,
  LayoutGrid,
  type LucideIcon,
  Moon,
  Package,
  ScrollText,
  Shirt,
  ShoppingBag,
  Store,
  Sun,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Logo from '../components/ui/Logo';

const SWATCHES: { name: string; cls: string; light: string; dark: string; role: string }[] = [
  { name: 'bg', cls: 'bg-bg', light: '#FAFAFA', dark: '#0F0F12', role: 'Fondo base' },
  { name: 'surface', cls: 'bg-surface', light: '#FFFFFF', dark: '#17171C', role: 'Tarjetas / paneles' },
  { name: 'surface-alt', cls: 'bg-surface-alt', light: '#F2F2F4', dark: '#1F1F26', role: 'Superficie 2 / filas' },
  { name: 'border', cls: 'bg-border', light: '#E4E4E7', dark: '#2A2A31', role: 'Bordes / divisores' },
  { name: 'accent-fill', cls: 'bg-accent-fill', light: '#FF7A00', dark: '#FF7A00', role: 'Naranja de marca' },
  { name: 'success', cls: 'bg-success', light: '#16A34A', dark: '#22C55E', role: 'Éxito' },
  { name: 'warning', cls: 'bg-warning', light: '#B45309', dark: '#F59E0B', role: 'Aviso' },
  { name: 'danger', cls: 'bg-danger', light: '#DC2626', dark: '#EF4444', role: 'Error' },
];

const ICONS: { Icon: LucideIcon; label: string }[] = [
  { Icon: LayoutDashboard, label: 'Dashboard' },
  { Icon: ShoppingBag, label: 'Ventas' },
  { Icon: Package, label: 'Inventario' },
  { Icon: BellRing, label: 'Alertas' },
  { Icon: ScrollText, label: 'Auditoría' },
  { Icon: TrendingUp, label: 'Tendencias' },
  { Icon: Users, label: 'Usuarios' },
  { Icon: CircleUserRound, label: 'Perfil' },
  { Icon: DollarSign, label: 'Tasas' },
  { Icon: Store, label: 'Mi negocio' },
  { Icon: HandCoins, label: 'Clientes / Deudas' },
  { Icon: Heart, label: 'Clientes (IG)' },
  { Icon: Trophy, label: 'Concursos' },
  { Icon: Brush, label: 'Personalización' },
  { Icon: Gem, label: 'Pedrería' },
  { Icon: Shirt, label: 'Gorras' },
  { Icon: LayoutGrid, label: 'Colecciones' },
  { Icon: Clock, label: 'Horario' },
];

const MOBILE_CARDS: { Icon: LucideIcon; label: string; sub: string }[] = [
  { Icon: ShoppingBag, label: 'Ventas', sub: 'Registra una venta' },
  { Icon: Package, label: 'Inventario', sub: '142 productos' },
  { Icon: LayoutGrid, label: 'Colecciones', sub: 'Dragon Ball, JJK…' },
  { Icon: Gem, label: 'Pedrería', sub: 'Personalizados' },
];

const TABS: { Icon: LucideIcon; active?: boolean }[] = [
  { Icon: Home, active: true },
  { Icon: Package },
  { Icon: BellRing },
  { Icon: CircleUserRound },
];

const PRINCIPLES: string[] = [
  'Un solo naranja sobre negro/grises — sin degradados arcoíris (eso es lo que delata la IA).',
  'Neutros como base; el naranja solo en lo importante (acción, activo, marca).',
  'Jerarquía por peso y tamaño (Bricolage en títulos), no tiñendo todo de colores.',
  'Iconos Lucide de un solo estilo (trazo 1.75), siempre con su etiqueta.',
  'Microcopy y datos reales: nombres de anime, montos en Bs y USD, San Cristóbal.',
];

function Section({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="px-6 py-7 border-t border-border">
      <h2 className="font-heading text-xl font-bold">{title}</h2>
      {desc && <p className="text-sm text-text-muted mt-1 max-w-2xl">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PhoneMock() {
  return (
    <div
      className="flex flex-col rounded-[2rem] border-4 border-border bg-bg overflow-hidden shadow-sm"
      style={{ width: 272, height: 560 }}>
      <div className="flex justify-center py-2">
        <div className="h-1.5 w-16 rounded-full bg-border" />
      </div>
      <div className="px-4 pb-3 flex items-center gap-3 border-b border-border">
        <Logo size={34} />
        <div className="flex-1 min-w-0">
          <div className="font-heading font-extrabold text-sm leading-none truncate">Dayisaacstore</div>
          <div className="text-[10px] text-text-muted mt-1">Tienda anime</div>
        </div>
        <BellRing size={18} strokeWidth={1.75} className="text-accent" />
      </div>
      <div className="flex-1 px-4 pt-3 space-y-3 overflow-hidden">
        <div
          className="flex items-center gap-2 bg-surface border border-border rounded-xl px-2.5 py-2"
          style={{ borderLeftColor: 'var(--warning)', borderLeftWidth: 3 }}>
          <BellRing size={14} strokeWidth={2} style={{ color: 'var(--warning)' }} />
          <span className="text-[11px] text-text">2 alertas sin revisar</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MOBILE_CARDS.map(({ Icon, label, sub }) => (
            <div key={label} className="bg-surface border border-border rounded-xl p-2.5">
              <Icon size={18} strokeWidth={1.75} className="text-accent" />
              <div className="text-[11px] font-semibold mt-1.5">{label}</div>
              <div className="text-[9px] text-text-muted truncate">{sub}</div>
            </div>
          ))}
        </div>
        <div className="bg-surface border border-border rounded-xl p-3">
          <div className="text-[9px] uppercase tracking-wide text-text-muted">Ventas de hoy</div>
          <div className="font-heading text-lg font-extrabold mt-0.5">Bs 4.250</div>
        </div>
      </div>
      <div className="border-t border-border flex justify-around py-2.5">
        {TABS.map(({ Icon, active }, i) => (
          <Icon
            key={i}
            size={20}
            strokeWidth={1.75}
            className={active ? 'text-accent' : 'text-text-muted'}
          />
        ))}
      </div>
    </div>
  );
}

export default function EstiloPage() {
  const [dark, setDark] = useState(true);

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="bg-bg text-text font-body rounded-2xl border border-border overflow-hidden">
        {/* Aviso: página temporal */}
        <div className="px-6 py-2 text-[11px] text-text-muted text-center border-b border-border bg-surface-alt">
          Vista de marca · temporal (solo para revisar) · se elimina al aplicar el diseño
        </div>

        {/* Hero */}
        <div className="px-6 py-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo size={64} />
            <div>
              <h1 className="font-heading text-3xl font-extrabold leading-none">Dayisaacstore</h1>
              <p className="text-sm text-text-muted mt-2">
                Sistema de diseño · Tienda anime · San Cristóbal, Táchira
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={dark ? <Sun size={16} /> : <Moon size={16} />}
            onClick={() => setDark((d) => !d)}>
            {dark ? 'Ver claro' : 'Ver oscuro'}
          </Button>
        </div>

        {/* Color de marca */}
        <Section
          title="Color de marca"
          desc="Tu marca es UN naranja sobre negro, con los grises del personaje. Sin degradados de varios colores.">
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-2xl bg-black grid place-items-center" style={{ width: 120, height: 120 }}>
              <Logo size={84} />
            </div>
            <div className="rounded-2xl bg-accent-fill grid place-items-center text-black font-heading font-extrabold" style={{ width: 120, height: 120 }}>
              #FF7A00
            </div>
            <div className="text-sm text-text-muted max-w-xs">
              El naranja se usa en lo importante (acción, estado activo, marca). El resto: negro,
              grises y blanco. Limpio y reconocible.
            </div>
          </div>
        </Section>

        {/* Paleta */}
        <Section title="Paleta" desc="Tokens con valor claro y oscuro. El hex mostrado sigue el modo activo.">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {SWATCHES.map((s) => (
              <div key={s.name} className="rounded-xl border border-border overflow-hidden bg-surface">
                <div className={`${s.cls} h-16`} />
                <div className="p-3">
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="text-xs text-text-muted">{s.role}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Tipografía */}
        <Section title="Tipografía" desc="Bricolage Grotesque (títulos, con carácter) + Inter (cuerpo, legible en datos).">
          <p className="font-heading text-5xl font-extrabold tracking-tight">Aa Bb 123</p>
          <p className="text-text-muted text-xs mt-1">Títulos · Bricolage Grotesque</p>
          <p className="font-heading text-2xl font-bold mt-6">Lo último en anime para tu colección</p>
          <p className="font-body text-base mt-4 max-w-xl">
            Cuerpo · Inter. Texto legible para ventas, inventario y montos del día. Figuras,
            llaveros y gorras llegando cada semana a San Cristóbal.
          </p>
        </Section>

        {/* Botones */}
        <Section title="Botones">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" leftIcon={<ShoppingBag size={16} />}>Registrar venta</Button>
            <Button variant="secondary">Cancelar</Button>
            <Button variant="ghost">Ver más</Button>
            <Button variant="danger">Eliminar</Button>
          </div>
        </Section>

        {/* Estados */}
        <Section title="Estados" desc="Un solo componente Badge para todas las severidades.">
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">Venta confirmada</Badge>
            <Badge tone="warning">Stock bajo</Badge>
            <Badge tone="danger">Deuda vencida</Badge>
            <Badge tone="info">En vivo</Badge>
            <Badge tone="accent">Nuevo</Badge>
            <Badge tone="neutral">Borrador</Badge>
          </div>
        </Section>

        {/* Iconos */}
        <Section title="Iconografía · Lucide" desc="Un set, un trazo. Mapeado a tus módulos y a tus categorías de Instagram.">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {ICONS.map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-3 text-center">
                <Icon size={22} strokeWidth={1.75} className="text-accent" />
                <span className="text-xs text-text-muted">{label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Vista móvil */}
        <Section title="Vista móvil" desc="La app móvil con la marca aplicada (mismo sistema y tokens que la web). Cambia el tema arriba para verla en claro/oscuro.">
          <div className="flex flex-wrap items-start gap-8">
            <PhoneMock />
            <div className="text-sm text-text-muted max-w-xs space-y-2">
              <p>Mismo logo, mismo naranja, mismos iconos Lucide y la misma tipografía que la web.</p>
              <p>Web y móvil comparten un único sistema, así los dos se ven idénticos en marca y flujos.</p>
            </div>
          </div>
        </Section>

        {/* Componentes */}
        <Section title="Componentes" desc="Mismos tokens, ejemplos reales.">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <div className="text-xs uppercase tracking-wide text-text-muted">Ventas de hoy</div>
              <div className="font-heading text-2xl font-extrabold mt-1">
                Bs 4.250 <span className="text-text-muted text-base font-semibold">· $12,40</span>
              </div>
              <div className="mt-3">
                <Badge tone="success">+8% vs ayer</Badge>
              </div>
            </Card>
            <Card>
              <label className="text-sm font-medium">Buscar producto</label>
              <input
                className="mt-2 w-full bg-bg border border-border rounded-xl px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                placeholder="Figura, llavero, gorra…"
              />
              <div className="mt-3 flex gap-2">
                <Badge tone="accent">Gojo Satoru</Badge>
                <Badge tone="neutral">Luffy</Badge>
              </div>
            </Card>
          </div>
          <div className="mt-4 space-y-2">
            <Alert tone="warning" title="Stock bajo">Quedan 2 de “Figura Gojo Satoru”.</Alert>
            <Alert tone="success" title="Venta registrada">Bs 850 · contado · hace 2 min.</Alert>
          </div>
        </Section>

        {/* Principios */}
        <Section title="Principios · que NO se vea hecho con IA">
          <ul className="space-y-2 text-sm text-text-muted">
            {PRINCIPLES.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-accent">▸</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
