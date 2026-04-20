import { useEffect, useRef } from 'react';
import { Vibration } from 'react-native';
import Sound from 'react-native-sound';
import { useRealtimeIoT } from '../hooks/useRealtimeIoT';

// Habilita playback en iOS aunque el telefono este en silencio.
Sound.setCategory('Playback', true);

/**
 * Componente invisible: reproduce sonido de alarma + vibra en loop mientras
 * el buzzer del hardware este activo (ultima lectura tipo 'buzzer' con valor
 * 1). Se apaga cuando el buzzer vuelve a 0 o se desmonta.
 *
 * El archivo buzzer_alarm.wav esta en android/app/src/main/res/raw/ y se
 * compila dentro del APK. En iOS habria que agregarlo al bundle Xcode.
 */
export default function BuzzerVibrator() {
  const { readings } = useRealtimeIoT();
  const buzzerActivo = readings.some(
    (r) => r.tipo === 'buzzer' && r.valor === 1,
  );
  const soundRef = useRef<Sound | null>(null);

  useEffect(() => {
    if (!buzzerActivo) return;

    // Vibracion
    try {
      Vibration.vibrate([0, 800, 200, 800, 200], true);
    } catch {
      /* dispositivo sin vibrador */
    }

    // Sonido
    const s = new Sound('buzzer_alarm.wav', Sound.MAIN_BUNDLE, (err) => {
      if (err) {
        // Archivo no encontrado o decoder falla. Seguimos con vibracion sola.
        return;
      }
      s.setVolume(1.0);
      s.setNumberOfLoops(-1); // loop infinito
      s.play();
    });
    soundRef.current = s;

    return () => {
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
  }, [buzzerActivo]);

  return null;
}
