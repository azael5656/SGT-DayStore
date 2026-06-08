// Paleta para series de graficas (recharts / canvas).
// Recharts y canvas suelen necesitar valores concretos (no clases Tailwind),
// por eso aqui van hex fijos alineados a la marca. El PRIMERO es el naranja de
// marca (#FF7A00 = --accent-fill); el resto es una secuencia armonica y
// distinguible para diferenciar varias series de datos.
export const CHART_COLORS: string[] = [
  '#FF7A00', // 1) Naranja de marca (accent-fill)
  '#0EA5E9', // 2) Info (azul)
  '#22C55E', // 3) Success (verde)
  '#A855F7', // 4) Violeta
  '#F59E0B', // 5) Ambar (warning)
  '#EF4444', // 6) Rojo (danger)
  '#14B8A6', // 7) Teal
];

/**
 * Color de la serie i de una grafica. Hace wrap con modulo, asi nunca se sale
 * del rango aunque haya mas series que colores en la paleta.
 */
export function getChartColor(i: number): string {
  const len = CHART_COLORS.length;
  // Indice positivo seguro incluso con i negativo.
  return CHART_COLORS[((i % len) + len) % len];
}
