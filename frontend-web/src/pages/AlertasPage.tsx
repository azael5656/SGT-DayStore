import { BellRing, AlertTriangle, Check } from 'lucide-react';
import api from '../api/client';
import { useRealtimeIoT } from '../hooks/useRealtimeIoT';
import { labelTipoAlerta } from '../utils/labels';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { SEVERITY_VARIANT } from '../components/ui/variants';

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
      <h1 className="flex items-center gap-2 text-2xl font-heading font-extrabold text-text mb-5">
        <BellRing size={24} strokeWidth={1.75} className="text-accent" />
        Alertas en vivo
      </h1>
      <div className="space-y-3">
        {alerts.length === 0 && (
          <div className="bg-surface rounded-2xl border border-border p-8 text-center text-text-muted">
            Sin alertas. Todo tranquilo.
          </div>
        )}
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`bg-surface rounded-2xl border-l-4 p-4 shadow-sm flex justify-between items-start ${
              a.reconocida ? 'border-border opacity-70' : 'border-danger'
            }`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge tone={SEVERITY_VARIANT[a.severidad?.toLowerCase()] ?? 'neutral'}>
                  <AlertTriangle size={12} strokeWidth={1.75} />
                  {a.severidad}
                </Badge>
                <span className="text-sm font-semibold text-text">{labelTipoAlerta(a.tipo)}</span>
              </div>
              <div className="text-sm text-text">{a.mensaje}</div>
              <div className="text-xs text-text-muted mt-1">
                {new Date(a.fecha).toLocaleString()}
              </div>
            </div>
            {!a.reconocida ? (
              <Button size="sm" onClick={() => reconocer(a.id)}>
                Reconocer
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                <Check size={14} strokeWidth={1.75} />
                reconocida
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
