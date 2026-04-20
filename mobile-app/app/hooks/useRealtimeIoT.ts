/**
 * Re-export para compatibilidad con imports existentes.
 * La implementacion vive en ../context/RealtimeIoTContext para que el
 * estado sea compartido entre todas las pantallas (no duplicado).
 */
export { useRealtimeIoT } from '../context/RealtimeIoTContext';
