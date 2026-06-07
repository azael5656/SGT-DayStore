import api from '../api/client';
import { useRealtimeIoT } from '../hooks/useRealtimeIoT';
import { labelTipoAlerta } from '../utils/labels';

const SEVERIDAD_COLOR: Record<string, string> = {
  baja: 'bg-blue-100 text-blue-700',
  media: 'bg-yellow-100 text-yellow-700',
  alta: 'bg-orange-100 text-orange-700',
  critica: 'bg-red-100 text-red-700',
};

export default function AlertasPage() {
  const { alerts } = useRealtimeIoT();

  const reconocer = async (id: string) => {
    try {
      await api.put(`/api/iot/alerts/${id}/acknowledge`);
    } catch (err) {
      alert('No se pudo reconocer: ' + (err as Error).message);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-5">Alertas en vivo</h1>
      <div className="space-y-3">
        {alerts.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            Sin alertas. Todo tranquilo.
          </div>
        )}
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`bg-white rounded-xl border-l-4 p-4 shadow-sm flex justify-between items-start ${
              a.reconocida ? 'border-gray-300 opacity-70' : 'border-red-500'
            }`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-bold uppercase px-2 py-0.5 rounded-md ${
                    SEVERIDAD_COLOR[a.severidad] ?? 'bg-gray-100 text-gray-700'
                  }`}>
                  {a.severidad}
                </span>
                <span className="text-sm font-semibold">{labelTipoAlerta(a.tipo)}</span>
              </div>
              <div className="text-sm text-gray-700">{a.mensaje}</div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(a.fecha).toLocaleString()}
              </div>
            </div>
            {!a.reconocida ? (
              <button
                onClick={() => reconocer(a.id)}
                className="bg-primary text-white text-sm px-3 py-1.5 rounded-md font-medium">
                Reconocer
              </button>
            ) : (
              <span className="text-xs text-gray-500">✓ reconocida</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
