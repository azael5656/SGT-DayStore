import { useMemo } from 'react';
import {
  ArrowRight,
  BellRing,
  Clock,
  DoorOpen,
  Droplet,
  type LucideIcon,
  Package,
  ScrollText,
  ShoppingBag,
  Thermometer,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useRealtimeIoT } from '../hooks/useRealtimeIoT';
import type { Role, SensorReading } from '../types';
import Badge from '../components/ui/Badge';

interface CardProps {
  Icon: LucideIcon;
  titulo: string;
  sub: string;
  to: string;
  badge?: number;
}

function QuickCard({ Icon, titulo, sub, to, badge }: CardProps) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav(to)}
      className="group bg-surface rounded-2xl border border-border p-4 text-left hover:border-accent hover:shadow-sm transition flex items-start gap-3 relative">
      <div className="w-11 h-11 rounded-xl bg-surface-alt flex items-center justify-center text-accent shrink-0">
        <Icon size={22} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-text group-hover:text-accent transition">{titulo}</div>
        <div className="text-xs text-text-muted mt-0.5 truncate">{sub}</div>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="bg-danger text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center absolute top-3 right-3">
          {badge}
        </span>
      )}
      <ArrowRight
        size={18}
        className="text-text-muted group-hover:text-accent self-center transition"
      />
    </button>
  );
}

type Tono = 'normal' | 'success' | 'danger' | 'info';

function LivePill({ Icon, label, valor, tono = 'normal' }: {
  Icon: LucideIcon;
  label: string;
  valor: string;
  tono?: Tono;
}) {
  const color =
    tono === 'success'
      ? 'text-success'
      : tono === 'danger'
      ? 'text-danger'
      : tono === 'info'
      ? 'text-info'
      : 'text-text';
  return (
    <div className="bg-surface rounded-xl border border-border p-3 flex items-center gap-3">
      <Icon size={20} strokeWidth={1.75} className="text-text-muted shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase font-bold text-text-muted tracking-wide">{label}</div>
        <div className={`text-lg font-bold ${color}`}>{valor}</div>
      </div>
    </div>
  );
}

function resumen(readings: SensorReading[]) {
  const porTipo: Record<string, SensorReading> = {};
  for (const r of readings) {
    const previa = porTipo[r.tipo];
    if (!previa || r.fecha > previa.fecha) porTipo[r.tipo] = r;
  }
  return {
    temp: porTipo.temperatura?.valor,
    hum: porTipo.humedad?.valor,
    corriente: porTipo.corriente?.valor,
    puerta: readings.some((x) => x.tipo === 'puerta' && x.valor === 1),
  };
}

const ROL_LABEL: Record<Role, string> = {
  superadmin: 'Super admin',
  admin: 'Administrador',
  vendedor: 'Vendedor',
};

export default function HomePage() {
  const { user } = useAuth();
  const { readings, alerts, conectado } = useRealtimeIoT();
  const r = useMemo(() => resumen(readings), [readings]);
  const sinRevisar = alerts.filter((a) => !a.reconocida).length;
  const nav = useNavigate();

  if (!user) return null;
  const esAdminOSuper = user.role === 'admin' || user.role === 'superadmin';
  const esSuper = user.role === 'superadmin';

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="text-sm text-text-muted">Hola,</div>
          <h1 className="font-heading text-3xl font-extrabold text-text">{user.nombre || user.email}</h1>
          <div className="text-xs uppercase tracking-widest text-accent font-bold mt-1">
            {ROL_LABEL[user.role]}
          </div>
        </div>
        <Badge tone={conectado ? 'success' : 'danger'}>
          {conectado ? '● EN VIVO' : '○ desconectado'}
        </Badge>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-bold text-text">Estado de la tienda</h2>
          <button
            onClick={() => nav('/dashboard-detalle')}
            className="text-xs font-semibold text-accent hover:underline">
            Ver dashboard completo →
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <LivePill
            Icon={Thermometer}
            label="Temperatura"
            valor={r.temp !== undefined ? `${r.temp}°C` : '—'}
            tono={r.temp !== undefined && r.temp > 28 ? 'danger' : 'success'}
          />
          <LivePill
            Icon={Droplet}
            label="Humedad"
            valor={r.hum !== undefined ? `${r.hum}%` : '—'}
            tono="info"
          />
          <LivePill
            Icon={Zap}
            label="Corriente"
            valor={r.corriente === 0 ? 'CORTE' : r.corriente !== undefined ? `${r.corriente}W` : '—'}
            tono={r.corriente === 0 ? 'danger' : 'success'}
          />
          <LivePill
            Icon={DoorOpen}
            label="Puerta"
            valor={r.puerta ? 'Abierta' : 'Cerrada'}
            tono={r.puerta ? 'danger' : 'success'}
          />
        </div>
      </div>

      <h3 className="text-xs uppercase tracking-widest font-bold text-text-muted mb-3">Operacion</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <QuickCard Icon={Package} titulo="Inventario" sub="Productos, stock, categorias" to="/inventario" />
        <QuickCard
          Icon={BellRing}
          titulo="Alertas"
          sub={sinRevisar > 0 ? `${sinRevisar} sin revisar` : 'Todo tranquilo'}
          to="/alertas"
          badge={sinRevisar}
        />
        <QuickCard Icon={ShoppingBag} titulo="Ventas" sub="Registro y reportes" to="/ventas" />
      </div>

      {esAdminOSuper && (
        <>
          <h3 className="text-xs uppercase tracking-widest font-bold text-text-muted mb-3">
            Administracion
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <QuickCard Icon={ScrollText} titulo="Auditoria" sub="Quien hizo que y cuando" to="/auditoria" />
            <QuickCard Icon={TrendingUp} titulo="Historico IoT" sub="Tendencias de sensores" to="/historico" />
            <QuickCard
              Icon={Users}
              titulo={esSuper ? 'Usuarios' : 'Vendedores'}
              sub={esSuper ? 'CRUD total de cuentas' : 'Ver y crear vendedores'}
              to="/usuarios"
            />
            <QuickCard
              Icon={Clock}
              titulo="Horario de la tienda"
              sub="Horario, vacaciones y cierre temprano"
              to="/horario-tienda"
            />
          </div>
        </>
      )}

      <div className="text-center text-xs text-text-muted mt-8">Dayisaacstore · v0.2</div>
    </div>
  );
}
