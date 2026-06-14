import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../components/Icon';
import { auditService, type AuditLog } from '../services/audit.service';
import { pdfService } from '../services/pdf.service';
import { COLORS } from '../utils/constants';
import { labelAccion } from '../utils/labels';

const ACCIONES_FILTRO: { label: string; value: string }[] = [
  { label: 'Todo', value: '' },
  { label: 'Login', value: 'auth.login' },
  { label: 'Productos', value: 'products' },
  { label: 'Alertas', value: 'alert' },
  { label: 'Escenarios IoT', value: 'scenario' },
];

const COLOR_POR_ACCION = (action: string): string => {
  if (action.includes('login')) return COLORS.primary;
  if (action.includes('alert')) return COLORS.warning;
  if (action.includes('delete')) return COLORS.danger;
  if (action.includes('create')) return COLORS.success;
  if (action.includes('scenario')) return COLORS.primary;
  return COLORS.textMuted;
};

type PDFNav = StackNavigationProp<{
  PDFViewer: { url: string; baseFilename: string; title: string };
}>;

export default function AuditoriaScreen() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [filtroAccion, setFiltroAccion] = useState<string>('');
  const [filtroEmail, setFiltroEmail] = useState<string>('');
  const [cargando, setCargando] = useState(false);
  const [total, setTotal] = useState(0);
  const navigation = useNavigation<PDFNav>();

  const abrirPdf = () => {
    const url = pdfService.buildUrl('/api/negocio/audit/logs/export.pdf', {
      action: filtroAccion || undefined,
      userEmail: filtroEmail || undefined,
    });
    navigation.navigate('PDFViewer', {
      url,
      baseFilename: 'bitacora-auditoria',
      title: 'Bitácora de auditoría',
    });
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const resp = await auditService.listar({
        action: filtroAccion || undefined,
        userEmail: filtroEmail || undefined,
        limit: 50,
        page: 1,
      });
      setItems(resp.items);
      setTotal(resp.total);
    } finally {
      setCargando(false);
    }
  }, [filtroAccion, filtroEmail]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Auditoria</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.contador}>{total} eventos</Text>
          <TouchableOpacity onPress={abrirPdf} style={styles.btnPdf}>
            <Icon name="pdf" color={COLORS.text} size={14} />
            <Text style={styles.btnPdfTxt}>PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Filtrar por email..."
        placeholderTextColor={COLORS.textMuted}
        value={filtroEmail}
        onChangeText={setFiltroEmail}
        onSubmitEditing={cargar}
      />

      <View style={styles.chips}>
        {ACCIONES_FILTRO.map((c) => (
          <Pressable
            key={c.value}
            style={[
              styles.chip,
              filtroAccion === c.value && styles.chipActive,
            ]}
            onPress={() => setFiltroAccion(c.value)}>
            <Text
              style={[
                styles.chipText,
                filtroAccion === c.value && styles.chipTextActive,
              ]}>
              {c.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {cargando && items.length === 0 ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl refreshing={cargando} onRefresh={cargar} />
          }
          renderItem={({ item }) => {
            const actor = item.userEmail
              ? item.userEmail.split('@')[0]
              : 'El sistema';
            const accion = labelAccion(item.action);
            return (
              <View style={styles.row}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: COLOR_POR_ACCION(item.action) },
                  ]}
                />
                <View style={styles.rowText}>
                  <Text style={styles.action}>
                    <Text style={styles.actor}>{actor}</Text> {accion}
                  </Text>
                  {item.userRole && (
                    <Text style={styles.usuario}>
                      {item.userRole === 'superadmin'
                        ? 'Super admin'
                        : item.userRole === 'admin'
                        ? 'Administrador'
                        : 'Vendedor'}
                    </Text>
                  )}
                  <Text style={styles.fecha}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.vacio}>No hay registros con esos filtros.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titulo: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  contador: { fontSize: 12, color: COLORS.textMuted },
  btnPdf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  btnPdfTxt: { color: COLORS.text, fontWeight: '600', fontSize: 12 },
  input: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.text },
  chipTextActive: { color: COLORS.accentContrast, fontWeight: '600' },
  lista: { paddingBottom: 20 },
  row: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, marginRight: 12 },
  rowText: { flex: 1 },
  action: { fontSize: 15, color: COLORS.text, lineHeight: 20 },
  actor: { fontWeight: '800', color: COLORS.text },
  usuario: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fecha: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  vacio: { textAlign: 'center', color: COLORS.textMuted, marginTop: 30 },
});
