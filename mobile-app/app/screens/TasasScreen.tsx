import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  ExchangeRate,
  exchangeRatesService,
} from '../services/exchangeRates.service';
import { CurrentRates } from '../services/sales.service';
import { COLORS } from '../utils/constants';

/**
 * Pantalla de Tasas de cambio (mobile).
 *
 * Pensada para que el dueño pueda subir la tasa del día desde el celular
 * apenas abre la tienda — sin tener que prender la PC para eso.
 *
 * Muestra:
 *  - Cards grandes con las tasas vigentes (USD = 1 fija, VES y COP).
 *  - FAB "+ Subir nueva tasa" (admin/superadmin).
 *  - Historial debajo, ordenado del más reciente al más viejo.
 */
export default function TasasScreen() {
  const { user } = useAuth();
  const puedeCrear = user?.role === 'admin' || user?.role === 'superadmin';

  const [vigentes, setVigentes] = useState<CurrentRates | null>(null);
  const [historial, setHistorial] = useState<ExchangeRate[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [crearAbierto, setCrearAbierto] = useState<'VES' | 'COP' | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [actual, lista] = await Promise.all([
        exchangeRatesService.getCurrent(),
        exchangeRatesService.list(),
      ]);
      setVigentes(actual);
      setHistorial(lista);
    } catch (err) {
      RNAlert.alert(
        'Error cargando tasas',
        err instanceof Error ? err.message : 'Error desconocido',
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={historial}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.listaCont}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.cards}>
              <RateCard
                label="VES"
                titulo="Bolívares"
                valor={vigentes?.VES ?? null}
                puedeCrear={puedeCrear}
                onCambiar={() => setCrearAbierto('VES')}
              />
              <RateCard
                label="COP"
                titulo="Pesos colombianos"
                valor={vigentes?.COP ?? null}
                puedeCrear={puedeCrear}
                onCambiar={() => setCrearAbierto('COP')}
              />
            </View>
            <Text style={styles.tipText}>
              💡 La tasa USD es siempre 1 (es la moneda base del sistema).
              Las tasas viejas se conservan para auditoría.
            </Text>
            <Text style={styles.section}>Historial de cambios</Text>
          </>
        }
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        ListEmptyComponent={
          <Text style={styles.vacio}>Sin tasas registradas todavía.</Text>
        }
        renderItem={({ item }) => <HistorialFila item={item} />}
      />

      {crearAbierto && (
        <CrearTasaModal
          currency={crearAbierto}
          rateActual={
            crearAbierto === 'VES' ? vigentes?.VES : vigentes?.COP
          }
          onCerrar={() => setCrearAbierto(null)}
          onCreada={() => {
            setCrearAbierto(null);
            void cargar();
          }}
        />
      )}
    </View>
  );
}

// ============================================================================
// CARD GRANDE
// ============================================================================

function RateCard({
  label,
  titulo,
  valor,
  puedeCrear,
  onCambiar,
}: {
  label: string;
  titulo: string;
  valor: number | null;
  puedeCrear: boolean;
  onCambiar: () => void;
}) {
  const sinTasa = valor === null || valor === undefined;
  return (
    <View style={[styles.card, sinTasa && styles.cardWarning]}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardTitulo}>{titulo}</Text>
      <Text style={styles.cardValor}>
        {sinTasa ? '—' : valor.toLocaleString()}
      </Text>
      <Text style={styles.cardSub}>
        {sinTasa ? 'Sin configurar' : `1 USD = ${valor.toLocaleString()} ${label}`}
      </Text>
      {puedeCrear && (
        <TouchableOpacity onPress={onCambiar} style={styles.cardBtn}>
          <Text style={styles.cardBtnTxt}>
            {sinTasa ? 'Configurar' : 'Cambiar'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// HISTORIAL FILA
// ============================================================================

function HistorialFila({ item }: { item: ExchangeRate }) {
  const fecha = new Date(item.effectiveFrom);
  return (
    <View style={styles.histFila}>
      <View style={styles.histLeft}>
        <Text style={styles.histCurrency}>{item.currency}</Text>
        <Text style={styles.histRate}>
          {Number(item.rate).toLocaleString()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.histFecha}>
          {fecha.toLocaleDateString()} · {fecha.toLocaleTimeString()}
        </Text>
        <Text style={styles.histAutor}>
          {item.createdByEmail ?? item.createdBy.slice(0, 8)}
        </Text>
        {item.notas ? (
          <Text style={styles.histNotas}>"{item.notas}"</Text>
        ) : null}
      </View>
    </View>
  );
}

// ============================================================================
// MODAL CREAR
// ============================================================================

function CrearTasaModal({
  currency,
  rateActual,
  onCerrar,
  onCreada,
}: {
  currency: 'VES' | 'COP';
  rateActual: number | null | undefined;
  onCerrar: () => void;
  onCreada: () => void;
}) {
  const [valor, setValor] = useState('');
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);

  const submit = async () => {
    const num = Number(valor);
    if (!Number.isFinite(num) || num <= 0) {
      RNAlert.alert('Tasa inválida', 'La tasa debe ser un número positivo.');
      return;
    }
    setEnviando(true);
    try {
      await exchangeRatesService.create({
        currency,
        rate: num,
        notas: notas.trim() || undefined,
      });
      onCreada();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      RNAlert.alert(
        'No se pudo guardar',
        e.response?.data?.message ??
          (err instanceof Error ? err.message : 'Error'),
      );
    } finally {
      setEnviando(false);
    }
  };

  const placeholder = currency === 'VES' ? '620.00' : '4000.00';

  return (
    <Modal animationType="fade" transparent onRequestClose={onCerrar}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitulo}>
            {rateActual ? 'Cambiar' : 'Configurar'} tasa de {currency}
          </Text>
          {rateActual && (
            <Text style={styles.dialogSub}>
              Tasa actual: 1 USD = {rateActual.toLocaleString()} {currency}
            </Text>
          )}

          <Text style={styles.fieldLabel}>1 USD equivale a ({currency})</Text>
          <TextInput
            style={styles.dialogInput}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            value={valor}
            onChangeText={setValor}
            autoFocus
          />

          <Text style={styles.fieldLabel}>Notas (opcional)</Text>
          <TextInput
            style={styles.dialogInput}
            placeholder="ej. tasa BCV de hoy"
            placeholderTextColor={COLORS.textMuted}
            value={notas}
            onChangeText={setNotas}
            maxLength={200}
          />

          <View style={styles.tip}>
            <Text style={styles.tipTxt}>
              💡 Las tasas anteriores no se borran — quedan para que las
              ventas de ayer mantengan su tasa real al revisarlas.
            </Text>
          </View>

          <View style={styles.dialogBotones}>
            <TouchableOpacity onPress={onCerrar} style={styles.dialogBtn}>
              <Text style={{ color: COLORS.textMuted, fontWeight: '600' }}>
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submit}
              disabled={enviando}
              style={[
                styles.dialogBtn,
                styles.dialogBtnPrimary,
                enviando && { opacity: 0.6 },
              ]}>
              <Text style={{ color: '#FFF', fontWeight: '700' }}>
                {enviando ? 'Guardando...' : 'Guardar tasa'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  listaCont: { padding: 16 },
  cards: { gap: 10 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardWarning: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  cardTitulo: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  cardValor: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  cardSub: { fontSize: 12, color: COLORS.textMuted },
  cardBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cardBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  tipText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 12,
    marginBottom: 6,
    lineHeight: 17,
  },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
  },
  vacio: {
    textAlign: 'center',
    padding: 20,
    color: COLORS.textMuted,
    fontSize: 13,
  },
  // Historial
  histFila: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  histLeft: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 70,
  },
  histCurrency: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  histRate: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  histFecha: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  histAutor: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  histNotas: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 20,
  },
  dialogTitulo: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  dialogSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  tip: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
  },
  tipTxt: { fontSize: 11, color: '#1E40AF', lineHeight: 16 },
  dialogBotones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  dialogBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  dialogBtnPrimary: { backgroundColor: COLORS.primary },
});
