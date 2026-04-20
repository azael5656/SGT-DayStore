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
 * el buzzer del hardware este activo (ultima lectura tipo 'buzzer' con valor
 * 1). Se apaga cuando el buzzer vuelve a 0 o se desmonta.
 *
 * El archivo buzzer_alarm.wav esta en android/app/src/main/res/raw/ y se
 * compila dentro del APK. En iOS habria que agregarlo al bundle Xcode.
 */
export default function BuzzerVibrator() {
  const { readings, alerts } = useRealtimeIoT();
  const buzzerHardware = readings.some(
    (r) => r.tipo === 'buzzer' && r.valor === 1,
  );
  // Sonamos solo si hay al menos una alerta CRITICA no reconocida ademas
  // del buzzer. Asi cuando el usuario toca "Marcar como revisada" el
  // sonido local para aunque el hardware siga encendido.
  const hayCriticaPendiente = alerts.some(
    (a) => a.severidad === 'critica' && !a.reconocida,
  );
  const [timeoutExpirado, setTimeoutExpirado] = useState(false);
  const debeSonar = buzzerHardware && hayCriticaPendiente && !timeoutExpirado;
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
      if (err) return;
      s.setVolume(1.0);
      s.setNumberOfLoops(-1);
      s.play();
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
