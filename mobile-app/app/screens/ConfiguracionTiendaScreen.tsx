import React, { useCallback, useEffect, useState } from 'react';
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
import {
  storeConfigService,
  type StoreConfig,
} from '../services/storeConfig.service';
import { COLORS } from '../utils/constants';

const DIAS = [
  { v: 1, label: 'Lun' },
  { v: 2, label: 'Mar' },
  { v: 3, label: 'Mie' },
  { v: 4, label: 'Jue' },
  { v: 5, label: 'Vie' },
  { v: 6, label: 'Sab' },
  { v: 0, label: 'Dom' },
];

/**
 * Pantalla de configuracion de horario de la tienda. Accesible para
 * admin/superadmin. Controla lo que el backend considera "abierto" o
 * "cerrado" para las alertas de movimiento.
 */
export default function ConfiguracionTiendaScreen() {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [abierta, setAbierta] = useState<boolean | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [cfg, estado] = await Promise.all([
        storeConfigService.get(),
        storeConfigService.isOpenNow(),
      ]);
      setConfig(cfg);
      setAbierta(estado);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

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
      const estado = await storeConfigService.isOpenNow();
      setAbierta(estado);
      Alert.alert('Listo', 'Configuracion guardada.');
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message || (e as Error).message;
      Alert.alert('No se pudo guardar', String(msg));
    } finally {
      setGuardando(false);
    }
  };

  const toggleDia = (dia: number) => {
    if (!config) return;
    const set = new Set(config.diasCerrados);
    if (set.has(dia)) set.delete(dia);
    else set.add(dia);
    actualizar({ diasCerrados: [...set].sort() });
  };

  if (cargando || !config) {
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
            { backgroundColor: abierta ? '#DCFCE7' : '#FEE2E2' },
          ]}>
          <Text style={styles.estadoIcono}>{abierta ? '🟢' : '🔴'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.estadoTitulo}>
              {abierta ? 'La tienda esta ABIERTA' : 'La tienda esta CERRADA'}
            </Text>
            <Text style={styles.estadoSub}>
              {abierta
                ? 'Los movimientos son normales, no generan alertas.'
                : 'Cualquier movimiento detectado creara una alerta.'}
            </Text>
          </View>
        </View>

        <Text style={styles.seccion}>Horario normal</Text>
        <View style={styles.card}>
          <View style={styles.fila}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Abre a las</Text>
              <TextInput
                style={styles.input}
                value={config.horarioApertura}
                onChangeText={(t) => actualizar({ horarioApertura: t })}
                placeholder="09:00"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Cierra a las</Text>
              <TextInput
                style={styles.input}
                value={config.horarioCierre}
                onChangeText={(t) => actualizar({ horarioCierre: t })}
                placeholder="20:00"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>
          <Text style={styles.hint}>Formato 24h (HH:MM)</Text>

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
                Fuerza "cerrado" ahora mismo. Util cuando sales de la tienda
                fuera del horario habitual.
              </Text>
            </View>
            <Switch
              value={config.modoNocturno}
              onValueChange={(v) => actualizar({ modoNocturno: v })}
            />
          </View>

          <View style={styles.separador} />

          <Text style={styles.label}>Cerrar hoy a las (cierre temprano)</Text>
          <Text style={styles.hint}>
            Si hoy cierras antes del horario habitual. Ej: 16:00. Deja vacio
            para usar el horario normal.
          </Text>
          <View style={styles.fila}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={config.cerrarHoyA ?? ''}
              onChangeText={(t) => actualizar({ cerrarHoyA: t || null })}
              placeholder="HH:MM"
              placeholderTextColor={COLORS.textMuted}
            />
            <Pressable
              onPress={() => actualizar({ cerrarHoyA: null })}
              style={styles.btnSec}>
              <Text style={styles.btnSecTxt}>Limpiar</Text>
            </Pressable>
          </View>

          <View style={styles.separador} />

          <Text style={styles.label}>Vacaciones hasta</Text>
          <Text style={styles.hint}>
            Fecha (YYYY-MM-DD) hasta la cual la tienda esta cerrada. Todo lo
            que pase en ese periodo disparara alerta.
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
            (guardando || pressed) && { opacity: 0.7 },
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
    marginBottom: 18,
  },
  estadoIcono: { fontSize: 28 },
  estadoTitulo: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  estadoSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
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
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 48,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  chipTxt: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  chipTxtActive: { color: '#fff', fontWeight: '800' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
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
  btnGuardarTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
