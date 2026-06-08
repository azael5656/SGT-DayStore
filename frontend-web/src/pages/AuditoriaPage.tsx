import { useEffect, useState } from 'react';
import { ScrollText, FileText } from 'lucide-react';
import api from '../api/client';
import type { AuditLog, Page } from '../types';
import { downloadPdf } from '../utils/downloadPdf';
import { labelAccion } from '../utils/labels';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { ROLE_VARIANT, type Tone } from '../components/ui/variants';

const ACCIONES = [
  { label: 'Todo', value: '' },
  { label: 'Login', value: 'auth.login' },
  { label: 'Productos', value: 'products' },
  { label: 'Categorias', value: 'categories' },
  { label: 'Alertas', value: 'alert' },
  { label: 'Escenarios IoT', value: 'scenario' },
];

const toneAccion = (a: string): Tone => {
  if (a.includes('login')) return 'info';
  if (a.includes('delete')) return 'danger';
  if (a.includes('create')) return 'success';
  if (a.includes('update')) return 'warning';
  if (a.includes('alert')) return 'accent';
  if (a.includes('scenario')) return 'accent';
  return 'neutral';
};

export default function AuditoriaPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroEmail, setFiltroEmail] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;
  const [cargando, setCargando] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  const descargarPdf = async () => {
    setDescargandoPdf(true);
    try {
      await downloadPdf(
        '/api/negocio/audit/logs/export.pdf',
        {
          action: filtroAccion || undefined,
          userEmail: filtroEmail || undefined,
        },
        'bitacora-auditoria.pdf',
      );
    } catch (err) {
      alert('No se pudo generar el PDF.');
      console.error(err);
    } finally {
      setDescargandoPdf(false);
    }
  };

  const cargar = async () => {
    setCargando(true);
    try {
      const { data } = await api.get<Page<AuditLog>>('/api/negocio/audit/logs', {
        params: {
          action: filtroAccion || undefined,
          userEmail: filtroEmail || undefined,
          page,
          limit,
        },
      });
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroAccion, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <PageHeader
        title="Auditoria"
        icon={<ScrollText size={22} strokeWidth={1.75} />}
        actions={
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-muted">{total} eventos</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={descargarPdf}
              disabled={descargandoPdf}
              leftIcon={<FileText size={16} strokeWidth={1.75} />}>
              {descargandoPdf ? 'Generando…' : 'Descargar PDF'}
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 mb-3">
        {ACCIONES.map((c) => (
          <Chip
            key={c.value}
            active={filtroAccion === c.value}
            onClick={() => {
              setFiltroAccion(c.value);
              setPage(1);
            }}>
            {c.label}
          </Chip>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          type="text"
          value={filtroEmail}
          onChange={(e) => setFiltroEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setPage(1), cargar())}
          placeholder="Filtrar por email..."
          className="flex-1"
        />
        <Button variant="secondary" onClick={() => (setPage(1), cargar())}>
          Buscar
        </Button>
      </div>

      <Table className="min-w-[680px]">
        <THead>
          <TR className="hover:bg-transparent">
            <TH>Cuando</TH>
            <TH>Usuario</TH>
            <TH>Rol</TH>
            <TH>Accion</TH>
            <TH>Recurso</TH>
            <TH>IP</TH>
          </TR>
        </THead>
        <TBody>
          {cargando && (
            <TR className="hover:bg-transparent">
              <TD colSpan={6} className="py-6 text-center text-text-muted">
                Cargando...
              </TD>
            </TR>
          )}
          {!cargando && items.length === 0 && (
            <TR className="hover:bg-transparent">
              <TD colSpan={6} className="py-6 text-center text-text-muted">
                Sin eventos.
              </TD>
            </TR>
          )}
          {items.map((it) => {
            const actor = it.userEmail
              ? it.userEmail.split('@')[0]
              : 'El sistema';
            const rolLabel =
              it.userRole === 'superadmin'
                ? 'Super admin'
                : it.userRole === 'admin'
                ? 'Administrador'
                : it.userRole === 'vendedor'
                ? 'Vendedor'
                : '-';
            const rolTone = it.userRole
              ? ROLE_VARIANT[it.userRole.toLowerCase()]?.tone ?? 'neutral'
              : 'neutral';
            return (
              <TR key={it.id}>
                <TD className="text-xs text-text-muted whitespace-nowrap">
                  {new Date(it.createdAt).toLocaleString()}
                </TD>
                <TD>
                  <div className="font-semibold">{actor}</div>
                  {it.userEmail && (
                    <div className="text-xs text-text-muted">{it.userEmail}</div>
                  )}
                </TD>
                <TD className="text-xs">
                  {rolLabel === '-' ? (
                    <span className="text-text-muted">{rolLabel}</span>
                  ) : (
                    <Badge tone={rolTone}>{rolLabel}</Badge>
                  )}
                </TD>
                <TD>
                  <Badge tone={toneAccion(it.action)}>
                    {labelAccion(it.action)}
                  </Badge>
                </TD>
                <TD className="text-xs text-text-muted">
                  {it.resource ?? '-'}
                </TD>
                <TD className="text-xs text-text-muted">
                  {it.ip ?? '-'}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>

      <div className="flex justify-between items-center mt-4 text-sm">
        <span className="text-text-muted">
          Pagina {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}>
            Anterior
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
