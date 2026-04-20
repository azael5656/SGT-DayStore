import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useRealtimeIoT } from '../hooks/useRealtimeIoT';
import type { Role, SensorReading } from '../types';

interface CardProps {
  icono: string;
  titulo: string;
  sub: string;
  color: string;
  to: string;
  badge?: number;
}

function QuickCard({ icono, titulo, sub, color, to, badge }: CardProps) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav(to)}
      className="group bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md hover:border-gray-300 transition flex items-start gap-3 relative">
      <div
        className={`w-11 h-11 rounded-lg flex items-center justify-center text-2xl ${color}`}>
        {icono}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-gray-900 group-hover:text-primary transition">
          {titulo}
        </div>
        <div className="text-xs text-gray-500 mt-0.5 truncate">{sub}</div>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center absolute top-3 right-3">
          {badge}
        </span>
      )}
      <span className="text-gray-300 group-hover:text-gray-500 text-xl self-center">
        →
      </span>
    </button>
  );
}

interface LivePillProps {
  icono: string;
  label: string;
  valor: string;
  color: string;
}
function LivePill({ icono, label, valor, color }: LivePillProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
      <div className="text-2xl">{icono}</div>
      <div>
        <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wide">
          {label}
        </div>
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

  if (!user) return null;
  const esAdminOSuper = user.role === 'admin' || user.role === 'superadmin';
  const esSuper = user.role === 'superadmin';

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="text-sm text-gray-500">Hola,</div>
          <h1 className="text-3xl font-bold">{user.nombre || user.email}</h1>
          <div className="text-xs uppercase tracking-widest text-primary font-bold mt-1">
            {ROL_LABEL[user.role]}
          </div>
        </div>
        <span
          className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
            conectado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
          {conectado ? '● EN VIVO' : '○ desconectado'}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-bold text-gray-700">Estado de la tienda</h2>
          <VerDashboardLink />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <LivePill
            icono="🌡️"
            label="Temperatura"
            valor={r.temp !== undefined ? `${r.temp}°C` : '—'}
            color={r.temp !== undefined && r.temp > 28 ? 'text-red-600' : 'text-green-600'}
          />
          <LivePill
            icono="💧"
            label="Humedad"
            valor={r.hum !== undefined ? `${r.hum}%` : '—'}
            color="text-blue-600"
          />
          <LivePill
            icono="⚡"
            label="Corriente"
            valor={r.corriente === 0 ? 'CORTE' : r.corriente !== undefined ? `${r.corriente}W` : '—'}
            color={r.corriente === 0 ? 'text-red-600' : 'text-green-600'}
          />
          <LivePill
            icono="🚪"
            label="Puerta"
            valor={r.puerta ? 'Abierta' : 'Cerrada'}
            color={r.puerta ? 'text-red-600' : 'text-green-600'}
          />
        </div>
      </div>

      <h3 className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-3">
        Operacion
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <QuickCard
          icono="📦"
          titulo="Inventario"
          sub="Productos, stock, categorias"
          color="bg-blue-100 text-blue-700"
          to="/inventario"
        />
        <QuickCard
          icono="🔔"
          titulo="Alertas"
          sub={sinRevisar > 0 ? `${sinRevisar} sin revisar` : 'Todo tranquilo'}
          color="bg-orange-100 text-orange-700"
          to="/alertas"
          badge={sinRevisar}
        />
        <QuickCard
          icono="💰"
          titulo="Ventas"
          sub="Registro y reportes"
          color="bg-green-100 text-green-700"
          to="/ventas"
        />
      </div>

      {esAdminOSuper && (
        <>
          <h3 className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-3">
            Administracion
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <QuickCard
              icono="📋"
              titulo="Auditoria"
              sub="Quien hizo que y cuando"
              color="bg-yellow-100 text-yellow-700"
              to="/auditoria"
            />
            <QuickCard
              icono="📈"
              titulo="Historico IoT"
              sub="Tendencias de sensores"
              color="bg-sky-100 text-sky-700"
              to="/historico"
            />
            <QuickCard
              icono="👥"
              titulo={esSuper ? 'Usuarios' : 'Vendedores'}
              sub={esSuper ? 'CRUD total de cuentas' : 'Ver y crear vendedores'}
              color="bg-purple-100 text-purple-700"
              to="/usuarios"
            />
            <QuickCard
              icono="🕒"
              titulo="Horario de la tienda"
              sub="Horario, vacaciones y cierre temprano"
              color="bg-emerald-100 text-emerald-700"
              to="/horario-tienda"
            />
          </div>
        </>
      )}

      <div className="text-center text-xs text-gray-400 mt-8">DayStore · v0.2</div>
    </div>
  );
}

function VerDashboardLink() {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav('/dashboard-detalle')}
      className="text-xs font-semibold text-primary hover:underline">
      Ver dashboard completo →
    </button>
  );
}
