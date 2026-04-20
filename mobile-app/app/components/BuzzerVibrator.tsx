import { useEffect } from 'react';
import { Vibration } from 'react-native';
import { useRealtimeIoT } from '../hooks/useRealtimeIoT';

/**
 * Componente invisible: vibra en loop mientras el buzzer del hardware
 * este sonando (ultima lectura de tipo 'buzzer' con valor 1). Se monta
 * una sola vez en el AppNavigator o en el Home. Se cancela al
 * desmontar y cuando el buzzer vuelve a 0.
 *
 * Sustituye al sonido real (que requeriria react-native-sound + rebuild
 * APK). En dispositivos con vibrador el usuario siente la alarma.
 */
export default function BuzzerVibrator() {
  const { readings } = useRealtimeIoT();
  const buzzerActivo = readings.some(
    (r) => r.tipo === 'buzzer' && r.valor === 1,
  );

  useEffect(() => {
    if (!buzzerActivo) return;
    try {
      // Patron agresivo (largo-corto-largo) en loop.
      Vibration.vibrate([0, 800, 200, 800, 200], true);
    } catch {
      // silencio
    }
    return () => {
      try {
        Vibration.cancel();
      } catch {
        /* idem */
      }
    };
  }, [buzzerActivo]);

  return null;
}
