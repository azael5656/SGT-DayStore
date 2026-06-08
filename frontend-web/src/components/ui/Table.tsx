import {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  ThHTMLAttributes,
  TdHTMLAttributes,
} from 'react';

// Props base: children + className opcional. Cada componente extiende ademas
// los atributos nativos de su elemento para pasar ...rest sin perder tipos.
interface BaseProps {
  children?: ReactNode;
  className?: string;
}

/** Contenedor tokenizado con scroll horizontal. Envuelve la <table>. */
export function Table({
  children,
  className = '',
  ...rest
}: BaseProps & TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-x-auto">
      <table className={`w-full text-sm ${className}`} {...rest}>
        {children}
      </table>
    </div>
  );
}

/** Encabezado: superficie alterna, texto chico en mayusculas y atenuado. */
export function THead({
  children,
  className = '',
  ...rest
}: BaseProps & HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`bg-surface-alt text-xs uppercase text-text-muted ${className}`} {...rest}>
      {children}
    </thead>
  );
}

/** Cuerpo: filas separadas por divisores del token border. */
export function TBody({
  children,
  className = '',
  ...rest
}: BaseProps & HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-border ${className}`} {...rest}>
      {children}
    </tbody>
  );
}

/** Fila con hover sobre superficie alterna. */
export function TR({
  children,
  className = '',
  ...rest
}: BaseProps & HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`hover:bg-surface-alt transition ${className}`} {...rest}>
      {children}
    </tr>
  );
}

/** Celda de encabezado: alineada a la izquierda, semibold. */
export function TH({
  children,
  className = '',
  ...rest
}: BaseProps & ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`text-left font-semibold px-4 py-2.5 ${className}`} {...rest}>
      {children}
    </th>
  );
}

/** Celda de datos con color de texto base. */
export function TD({
  children,
  className = '',
  ...rest
}: BaseProps & TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-2.5 text-text ${className}`} {...rest}>
      {children}
    </td>
  );
}
