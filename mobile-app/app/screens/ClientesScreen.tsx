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
import { Customer, customersService } from '../services/customers.service';
import { COLORS } from '../utils/constants';
import { parseApiError } from '../utils/errors';

// Filtros que se aplican letra-a-letra mientras el usuario escribe.
// Mas restrictivos que las validaciones finales: cualquier caracter que
// no encaje se descarta antes de tocar el state, asi el usuario nunca
// "ve" letras en un campo numerico.
const limpiarCedula = (s: string): string =>
  s.toUpperCase().replace(/[^VEJGP0-9-]/g, '');
const soloDigitos = (s: string): string => s.replace(/\D/g, '');
const soloLetrasYEspacios = (s: string): string =>
  s.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, '');

// Validaciones que corren al hacer submit, no en cada keystroke.
const REGEX_CEDULA = /^[VEJGP]?-?[0-9]{6,9}$/;
const REGEX_TELEFONO = /^[0-9]{7,15}$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pantalla de Clientes / Deudores (mobile).
 *
 * Permite buscar, crear, editar y desactivar clientes. Las ventas a
 * crédito se asocian a un cliente registrado aquí. Solo admin/superadmin
 * pueden crear o editar.
 */
export default function ClientesScreen() {
  const { user } = useAuth();
  const puedeEditar = user?.role === 'admin' || user?.role === 'superadmin';

  const [items, setItems] = useState<Customer[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [editando, setEditando] = useState<Customer | null>(null);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const lista = await customersService.list(busqueda || undefined);
      setItems(lista);
    } catch (err) {
      RNAlert.alert('Error', parseApiError(err, 'No se pudo cargar'));
    } finally {
      setCargando(false);
    }
  }, [busqueda]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  const desactivar = (c: Customer) => {
    RNAlert.alert('Desactivar', `Desactivar a ${c.nombre}?`, [
      { text: 'No' },
      {
        text: 'Sí',
        style: 'destructive',
        onPress: async () => {
          try {
            await customersService.desactivar(c.id);
            await cargar();
          } catch (err) {
            RNAlert.alert('Error', parseApiError(err, 'No se pudo'));
          }
        },
      },
    ]);
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
      <View style={styles.header}>
        <Text style={styles.subtitulo}>
          {items.length} {items.length === 1 ? 'cliente' : 'clientes'}
        </Text>
        {puedeEditar && (
          <TouchableOpacity
            style={styles.btnAdd}
            onPress={() => setCreando(true)}>
            <Text style={styles.btnAddTxt}>+ Nuevo</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar por cédula o nombre..."
        placeholderTextColor={COLORS.textMuted}
        value={busqueda}
        onChangeText={setBusqueda}
      />

      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={onRefresh} />
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <Text style={styles.vacio}>Sin clientes registrados.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.activo && styles.cardInactivo]}
            onPress={() => puedeEditar && setEditando(item)}
            disabled={!puedeEditar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text style={styles.cedula}>{item.cedula}</Text>
              {item.telefono && (
                <Text style={styles.detalle}>📞 {item.telefono}</Text>
              )}
            </View>
            {!item.activo && (
              <Text style={styles.badgeInactivo}>INACTIVO</Text>
            )}
            {puedeEditar && item.activo && (
              <TouchableOpacity
                onPress={() => desactivar(item)}
                hitSlop={8}
                style={styles.delBtn}>
                <Text style={styles.delTxt}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />

      {(creando || editando) && (
        <ClienteFormModal
          cliente={editando}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
          onGuardado={() => {
            setCreando(false);
            setEditando(null);
            void cargar();
          }}
        />
      )}
    </View>
  );
}

function ClienteFormModal({
  cliente,
  onCerrar,
  onGuardado,
}: {
  cliente: Customer | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [cedula, setCedula] = useState(cliente?.cedula ?? '');
  const [nombre, setNombre] = useState(cliente?.nombre ?? '');
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '');
  const [email, setEmail] = useState(cliente?.email ?? '');
  const [notas, setNotas] = useState(cliente?.notas ?? '');
  const [enviando, setEnviando] = useState(false);

  const submit = async () => {
    const cedulaLimpia = cedula.trim();
    const nombreLimpio = nombre.trim();
    const telefonoLimpio = telefono.trim();
    const emailLimpio = email.trim();

    if (!cedulaLimpia || !nombreLimpio) {
      RNAlert.alert('Faltan datos', 'Cédula y nombre son obligatorios.');
      return;
    }
    if (!REGEX_CEDULA.test(cedulaLimpia)) {
      RNAlert.alert(
        'Cédula inválida',
        'Formato esperado: V12345678 (letra opcional V/E/J/G/P y 6 a 9 dígitos).',
      );
      return;
    }
    if (nombreLimpio.length < 2) {
      RNAlert.alert('Nombre inválido', 'El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (telefonoLimpio && !REGEX_TELEFONO.test(telefonoLimpio)) {
      RNAlert.alert(
        'Teléfono inválido',
        'El teléfono debe tener entre 7 y 15 dígitos, sin espacios ni guiones.',
      );
      return;
    }
    if (emailLimpio && !REGEX_EMAIL.test(emailLimpio)) {
      RNAlert.alert('Email inválido', 'Revisa el formato del correo.');
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        cedula: cedulaLimpia,
        nombre: nombreLimpio,
        telefono: telefonoLimpio || undefined,
        email: emailLimpio || undefined,
        notas: notas.trim() || undefined,
      };
      if (cliente) {
        await customersService.update(cliente.id, payload);
      } else {
        await customersService.create(payload);
      }
      onGuardado();
    } catch (err) {
      RNAlert.alert('Error', parseApiError(err, 'No se pudo guardar'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onCerrar}>
      <View style={form.cont}>
        <View style={form.header}>
          <Text style={form.titulo}>
            {cliente ? 'Editar cliente' : 'Nuevo cliente'}
          </Text>
          <TouchableOpacity onPress={onCerrar}>
            <Text style={{ fontSize: 22, color: COLORS.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={form.body}>
          <Text style={form.label}>Cédula *</Text>
          <TextInput
            style={form.input}
            value={cedula}
            onChangeText={(t) => setCedula(limpiarCedula(t))}
            placeholder="V12345678"
            placeholderTextColor={COLORS.textMuted}
            autoFocus
            autoCapitalize="characters"
            maxLength={11}
            multiline={false}
            numberOfLines={1}
          />

          <Text style={form.label}>Nombre completo *</Text>
          <TextInput
            style={form.input}
            value={nombre}
            onChangeText={(t) => setNombre(soloLetrasYEspacios(t))}
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="words"
            maxLength={80}
            multiline={false}
            numberOfLines={1}
          />

          <Text style={form.label}>Teléfono</Text>
          <TextInput
            style={form.input}
            value={telefono}
            onChangeText={(t) => setTelefono(soloDigitos(t))}
            placeholder="04141234567"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            maxLength={15}
            multiline={false}
            numberOfLines={1}
          />

          <Text style={form.label}>Email</Text>
          <TextInput
            style={form.input}
            value={email}
            onChangeText={setEmail}
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={120}
            multiline={false}
            numberOfLines={1}
          />

          <Text style={form.label}>Notas</Text>
          <TextInput
            style={[
              form.input,
              { minHeight: 60, maxHeight: 120, textAlignVertical: 'top' },
            ]}
            value={notas}
            onChangeText={setNotas}
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={500}
          />
        </View>

        <View style={form.footer}>
          <TouchableOpacity
            onPress={submit}
            disabled={enviando}
            style={[form.submitBtn, enviando && { opacity: 0.5 }]}>
            <Text style={form.submitTxt}>
              {enviando ? 'Guardando...' : 'Guardar cliente'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  subtitulo: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  btnAdd: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnAddTxt: { color: '#FFF', fontWeight: '600' },
  searchInput: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
    color: COLORS.text,
  },
  lista: { padding: 16, paddingTop: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardInactivo: { opacity: 0.5 },
  nombre: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cedula: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  detalle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  badgeInactivo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  delBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  delTxt: { color: '#B91C1C', fontWeight: '700' },
  vacio: {
    textAlign: 'center',
    color: COLORS.textMuted,
    paddingTop: 30,
    fontSize: 13,
  },
});

const form = StyleSheet.create({
  cont: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titulo: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  body: { padding: 16, flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  footer: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitTxt: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
