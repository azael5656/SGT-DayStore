import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import HourPicker from '../components/HourPicker';
import Icon from '../components/Icon';
import {
  storeConfigService,
  type EstadoTienda,
  type StoreConfig,
} from '../services/storeConfig.service';
import { COLORS } from '../utils/constants';
import { parseApiError } from '../utils/errors';

const DIAS = [
  { v: 1, label: 'Lun' },
  { v: 2, label: 'Mar' },
  { v: 3, label: 'Mie' },
  { v: 4, label: 'Jue' },
  { v: 5, label: 'Vie' },
  { v: 6, label: 'Sab' },
  { v: 0, label: 'Dom' },
];

export default function ConfiguracionTiendaScreen() {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [estado, setEstado] = useState<EstadoTienda | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const estadoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refrescarEstado = useCallback(async () => {
    try {
      const e = await storeConfigService.estado();
      setEstado(e);
    } catch {
      /* keep old */
    }
  }, []);

  const cargarTodo = useCallback(async () => {
    setCargando(true);
    try {
      const [cfg, e] = await Promise.all([
        storeConfigService.get(),
        storeConfigService.estado(),
      ]);
      setConfig(cfg);
      setEstado(e);
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarTodo();
    // refrescar el estado (hora actual) cada 30s para que el banner se mueva solo
    estadoTimer.current = setInterval(() => refrescarEstado(), 30_000);
    return () => {
      if (estadoTimer.current) clearInterval(estadoTimer.current);
    };
  }, [cargarTodo, refrescarEstado]);

  const actualizar = (patch: Partial<StoreConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const guardar = async () => {
    if (!config) return;
    setGuardando(true);
    try {
      const saved = await storeConfigService.update({
        horarioApertura: config.horarioApertura,
        horarioCierre: config.horarioCierre,
        zonaHoraria: config.zonaHoraria,
        modoNocturno: config.modoNocturno,
        vacacionesHasta: config.vacacionesHasta || null,
        cerrarHoyA: config.cerrarHoyA || null,
        diasCerrados: config.diasCerrados,
      });
      setConfig(saved);
      await refrescarEstado();
      Alert.alert('Listo', 'Configuracion guardada.');
    } catch (err) {
      Alert.alert('No se pudo guardar', parseApiError(err));
    } finally {
      setGuardando(false);
    }
  };

  const abrirAhora = async () => {
    try {
      const saved = await storeConfigService.abrirAhora();
      setConfig(saved);
      await refrescarEstado();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  const cerrarAhora = async () => {
    try {
      const saved = await storeConfigService.cerrarAhora();
      setConfig(saved);
      await refrescarEstado();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  const toggleDia = (dia: number) => {
    if (!config) return;
    const set = new Set(config.diasCerrados);
    if (set.has(dia)) set.delete(dia);
    else set.add(dia);
    actualizar({ diasCerrados: [...set].sort() });
  };

  if (cargando || !config || !estado) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Cargando configuracion...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.estado,
            {
              backgroundColor:
                (estado.abierta ? COLORS.success : COLORS.danger) + '18',
            },
          ]}>
          <Icon
            name={estado.abierta ? 'puerta' : 'puerta-cerrada'}
            color={estado.abierta ? COLORS.success : COLORS.danger}
            size={30}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.estadoTitulo}>
              Tienda {estado.abierta ? 'ABIERTA' : 'CERRADA'}
            </Text>
            <Text style={styles.estadoMotivo}>{estado.motivo}</Text>
            <Text style={styles.estadoHora}>
              Son las {estado.horaActual} en {config.zonaHoraria}
            </Text>
          </View>
        </View>

        <View style={styles.filaBtns}>
          <Pressable
            style={[
              styles.btnAtajo,
              { backgroundColor: COLORS.success + '18', borderColor: COLORS.success },
            ]}
            onPress={abrirAhora}>
            <Icon name="puerta" color={COLORS.success} size={18} />
            <Text style={[styles.btnAtajoTxt, { color: COLORS.success }]}>
              Abrir ahora
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.btnAtajo,
              { backgroundColor: COLORS.danger + '18', borderColor: COLORS.danger },
            ]}
            onPress={cerrarAhora}>
            <Icon name="puerta-cerrada" color={COLORS.danger} size={18} />
            <Text style={[styles.btnAtajoTxt, { color: COLORS.danger }]}>
              Cerrar ahora
            </Text>
          </Pressable>
        </View>
        <Text style={styles.hintAtajos}>
          "Abrir ahora" desactiva modo nocturno, vacaciones y cierre temprano.
          "Cerrar ahora" activa modo nocturno.
        </Text>

        <Text style={styles.seccion}>Horario normal</Text>
        <View style={styles.card}>
          <View style={styles.fila}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Abre a las</Text>
              <HourPicker
                value={config.horarioApertura}
                onChange={(v) => actualizar({ horarioApertura: v })}
                placeholder="09:00"
              />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Cierra a las</Text>
              <HourPicker
                value={config.horarioCierre}
                onChange={(v) => actualizar({ horarioCierre: v })}
                placeholder="20:00"
              />
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Zona horaria</Text>
          <TextInput
            style={styles.input}
            value={config.zonaHoraria}
            onChangeText={(t) => actualizar({ zonaHoraria: t })}
            placeholder="America/Bogota"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <Text style={styles.seccion}>Dias cerrados</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>
            Marca los dias fijos que la tienda no abre.
          </Text>
          <View style={styles.chips}>
            {DIAS.map((d) => {
              const activo = config.diasCerrados.includes(d.v);
              return (
                <Pressable
                  key={d.v}
                  style={[styles.chip, activo && styles.chipActive]}
                  onPress={() => toggleDia(d.v)}>
                  <Text
                    style={[
                      styles.chipTxt,
                      activo && styles.chipTxtActive,
                    ]}>
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={styles.seccion}>Cierres puntuales</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Modo nocturno</Text>
              <Text style={styles.hint}>
                Fuerza "cerrado" ahora mismo.
              </Text>
            </View>
            <Switch
              value={config.modoNocturno}
              onValueChange={(v) => actualizar({ modoNocturno: v })}
            />
          </View>

          <View style={styles.separador} />

          <Text style={styles.label}>Cerrar hoy antes de la hora normal</Text>
          <Text style={styles.hint}>
            Ej: hoy cierras a las 16:00 en vez del horario habitual.
          </Text>
          <HourPicker
            value={config.cerrarHoyA}
            onChange={(v) => actualizar({ cerrarHoyA: v })}
            onClear={() => actualizar({ cerrarHoyA: null })}
            placeholder="Sin cierre temprano"
          />

          <View style={styles.separador} />

          <Text style={styles.label}>Vacaciones hasta</Text>
          <Text style={styles.hint}>
            Formato YYYY-MM-DD. Durante las vacaciones cualquier movimiento
            genera alerta.
          </Text>
          <View style={styles.fila}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={config.vacacionesHasta ?? ''}
              onChangeText={(t) => actualizar({ vacacionesHasta: t || null })}
              placeholder="2026-05-15"
              placeholderTextColor={COLORS.textMuted}
            />
            <Pressable
              onPress={() => actualizar({ vacacionesHasta: null })}
              style={styles.btnSec}>
              <Text style={styles.btnSecTxt}>Limpiar</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={guardar}
          disabled={guardando}
          style={({ pressed }) => [
            styles.btnGuardar,
            (guardando || pressed) && { opacity: 0.75 },
          ]}>
          <Text style={styles.btnGuardarTxt}>
            {guardando ? 'Guardando...' : 'Guardar configuracion'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  content: { padding: 16, paddingBottom: 40 },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 12,
  },
  estadoIcono: { fontSize: 30 },
  estadoTitulo: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  estadoMotivo: { fontSize: 13, color: COLORS.text, marginTop: 2 },
  estadoHora: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  filaBtns: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  btnAtajo: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnAtajoTxt: { fontSize: 14, fontWeight: '800' },
  hintAtajos: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 6,
    marginBottom: 16,
    textAlign: 'center',
  },
  seccion: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fila: { flexDirection: 'row', alignItems: 'flex-end' },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  hint: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 52,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  chipTxt: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  chipTxtActive: { color: COLORS.accentContrast, fontWeight: '800' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  separador: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  btnSec: {
    marginLeft: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnSecTxt: { color: COLORS.textMuted, fontWeight: '600' },
  btnGuardar: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  btnGuardarTxt: { color: COLORS.accentContrast, fontWeight: '800', fontSize: 15 },
});
