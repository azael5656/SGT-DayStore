import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Alert, SensorReading } from './iot.service';

/**
 * Caché del último estado IoT para offline-first.
 *
 * El documento pide "ver el último estado de los sensores sin conexión". El
 * IoT es realtime y read-only, así que no va por WatermelonDB: basta guardar
 * el último snapshot (lecturas + alertas) en AsyncStorage y rehidratarlo al
 * arrancar para que el dashboard no aparezca vacío sin red.
 */
const KEY = '@daystore/iot_snapshot';

export interface IotSnapshot {
  readings: SensorReading[];
  alerts: Alert[];
  at: number;
}

export async function saveIotSnapshot(data: {
  readings: SensorReading[];
  alerts: Alert[];
}): Promise<void> {
  try {
    const snap: IotSnapshot = { ...data, at: Date.now() };
    await AsyncStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    /* el caché es best-effort; si falla, no rompemos el flujo realtime */
  }
}

export async function loadIotSnapshot(): Promise<IotSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as IotSnapshot) : null;
  } catch {
    return null;
  }
}
