import { useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import Sound from 'react-native-sound';
import { useRealtimeIoT } from '../hooks/useRealtimeIoT';

// Habilita playback en iOS aunque el telefono este en silencio.
Sound.setCategory('Playback', true);

/**
 * Tiempo maximo que suena la alarma local aunque el buzzer siga en 1.
 * Protege al dueno de un falso positivo que quede sonando mucho rato.
 */
const MAX_SONIDO_MS = 20_000;

/**
 * Componente invisible: reproduce sonido de alarma + vibra en loop mientras
 * el buzzer este activo (ultima lectura tipo 'buzzer' con valor 1).
 *
 * El estado del buzzer lo gobierna el backend (MqttService.syncBuzzer): lo
 * pone en 1 mientras haya una alerta SIN reconocer que amerite alarma
 * (cualquier critica o la puerta abierta fuera de horario) y en 0 en cuanto
 * se reconoce/resuelve. Por eso aqui basta con seguir esa lectura: ya refleja
 * el "atendida" y la alarma se apaga sola al marcar la alerta como revisada.
 *
 * El archivo buzzer_alarm.wav esta en android/app/src/main/res/raw/ y se
 * compila dentro del APK. En iOS habria que agregarlo al bundle Xcode.
 */
export default function BuzzerVibrator() {
  const { readings } = useRealtimeIoT();
  const buzzerHardware = readings.some(
    (r) => r.tipo === 'buzzer' && r.valor === 1,
  );
  const [timeoutExpirado, setTimeoutExpirado] = useState(false);
  const debeSonar = buzzerHardware && !timeoutExpirado;
  const soundRef = useRef<Sound | null>(null);

  // Reset del timeout cuando el buzzer vuelve a 0: proxima vez que suba a 1
  // volvera a sonar los 20s completos.
  useEffect(() => {
    if (!buzzerHardware) setTimeoutExpirado(false);
  }, [buzzerHardware]);

  useEffect(() => {
    if (!debeSonar) return;

    try {
      Vibration.vibrate([0, 800, 200, 800, 200], true);
    } catch {
      /* dispositivo sin vibrador */
    }

    const s = new Sound('buzzer_alarm.wav', Sound.MAIN_BUNDLE, (err) => {
      if (err) {
        // Antes este error se tragaba en silencio (la alarma "no sonaba" sin
        // pista de por que). Lo dejamos visible en logcat para diagnosticar
        // si el .wav o la libreria de audio fallan al cargar.
        console.warn('[BuzzerVibrator] error al cargar buzzer_alarm.wav:', err);
        return;
      }
      s.setVolume(1.0);
      s.setNumberOfLoops(-1);
      s.play((exito) => {
        if (!exito) {
          console.warn('[BuzzerVibrator] la reproduccion fallo (decode/audio focus)');
        }
      });
    });
    soundRef.current = s;

    const timer = setTimeout(() => setTimeoutExpirado(true), MAX_SONIDO_MS);

    return () => {
      clearTimeout(timer);
      try {
        Vibration.cancel();
      } catch {
        /* idem */
      }
      const snd = soundRef.current;
      if (snd) {
        snd.stop(() => {
          snd.release();
        });
        soundRef.current = null;
      }
    };
  }, [debeSonar]);

  return null;
}
