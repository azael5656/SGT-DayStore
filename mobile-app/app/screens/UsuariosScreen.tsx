import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  usuariosService,
  type CrearUsuarioInput,
  type UsuarioDetalle,
} from '../services/usuarios.service';
import { COLORS } from '../utils/constants';
import type { Role } from '../utils/storage';

const ROLE_BADGE: Record<Role, { label: string; bg: string; fg: string }> = {
  superadmin: { label: 'SUPER', bg: '#F3E8FF', fg: '#7C3AED' },
  admin: { label: 'ADMIN', bg: '#DBEAFE', fg: '#2563EB' },
  vendedor: { label: 'VEND', bg: '#CFFAFE', fg: '#0891B2' },
};

/**
 * Gestion de usuarios.
 *  - Superadmin: CRUD completo. Puede crear admin y vendedor (1 admin max).
 *  - Admin: puede ver la lista y crear vendedores.
 */
export default function UsuariosScreen() {
  const { user: actor } = useAuth();
  const esSuper = actor?.role === 'superadmin';

  const [items, setItems] = useState<UsuarioDetalle[]>([]);
  const [cargando, setCargando] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [filtro, setFiltro] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await usuariosService.listar();
      setItems(data);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const listaFiltrada = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    if (!f) return items;
    return items.filter(
      (u) => u.email.toLowerCase().includes(f) || u.nombre.toLowerCase().includes(f),
    );
  }, [filtro, items]);

  const desactivar = async (u: UsuarioDetalle) => {
    if (!esSuper) return;
    if (u.id === actor?.id) {
      Alert.alert('Accion no permitida', 'No puedes desactivar tu propia cuenta.');
      return;
    }
    Alert.alert(
      'Desactivar usuario',
      `¿Desactivar a ${u.email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await usuariosService.desactivar(u.id);
              await cargar();
            } catch (e) {
              Alert.alert('Error', (e as Error).message);
            }
          },
        },
      ],
    );
  };

  const activar = async (u: UsuarioDetalle) => {
    if (!esSuper) return;
    try {
      await usuariosService.activar(u.id);
      await cargar();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message || (e as Error).message;
      Alert.alert('No se pudo activar', msg);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Usuarios</Text>
          <Text style={styles.subtitulo}>
            {esSuper
              ? 'Super admin: CRUD total de admin y vendedores'
              : 'Admin: puedes crear y ver vendedores'}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.btnNuevo, pressed && { opacity: 0.7 }]}
          onPress={() => setFormVisible(true)}>
          <Text style={styles.btnNuevoTxt}>+ Nuevo</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Buscar por email o nombre..."
        placeholderTextColor={COLORS.textMuted}
        value={filtro}
        onChangeText={setFiltro}
      />

      {cargando && items.length === 0 ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={listaFiltrada}
          keyExtractor={(u) => u.id}
          refreshControl={
            <RefreshControl refreshing={cargando} onRefresh={cargar} />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <Text style={styles.vacio}>No hay usuarios con ese filtro.</Text>
          }
          renderItem={({ item }) => (
            <UsuarioRow
              u={item}
              esSuper={esSuper}
              esActor={item.id === actor?.id}
              onDesactivar={() => desactivar(item)}
              onActivar={() => activar(item)}
            />
          )}
        />
      )}

      <FormularioUsuario
        visible={formVisible}
        puedeElegirAdmin={esSuper}
        onCerrar={() => setFormVisible(false)}
        onCreado={() => {
          setFormVisible(false);
          cargar();
        }}
      />
    </View>
  );
}

interface RowProps {
  u: UsuarioDetalle;
  esSuper: boolean;
  esActor: boolean;
  onDesactivar: () => void;
  onActivar: () => void;
}

function UsuarioRow({ u, esSuper, esActor, onDesactivar, onActivar }: RowProps) {
  const badge = ROLE_BADGE[u.role];
  return (
    <View style={[styles.row, !u.activo && styles.rowInactivo]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarTxt}>
          {(u.nombre || u.email).slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.nombre}>{u.nombre || u.email}</Text>
        <Text style={styles.email}>{u.email}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeTxt, { color: badge.fg }]}>
              {badge.label}
            </Text>
          </View>
          <Text style={[styles.estado, { color: u.activo ? COLORS.success : COLORS.danger }]}>
            {u.activo ? '● activo' : '○ inactivo'}
          </Text>
          {esActor && <Text style={styles.mismo}>tú</Text>}
        </View>
      </View>
      {esSuper && !esActor && (
        <Pressable
          onPress={u.activo ? onDesactivar : onActivar}
          style={({ pressed }) => [
            styles.btnAccion,
            { backgroundColor: u.activo ? '#FEE2E2' : '#DCFCE7' },
            pressed && { opacity: 0.7 },
          ]}>
          <Text
            style={[
              styles.btnAccionTxt,
              { color: u.activo ? COLORS.danger : COLORS.success },
            ]}>
            {u.activo ? 'Desactivar' : 'Activar'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

interface FormProps {
  visible: boolean;
  puedeElegirAdmin: boolean;
  onCerrar: () => void;
  onCreado: () => void;
}

function FormularioUsuario({
  visible,
  puedeElegirAdmin,
  onCerrar,
  onCreado,
}: FormProps) {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('vendedor');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setEmail('');
    setNombre('');
    setPassword('');
    setRole('vendedor');
    setError('');
  };

  const cerrar = () => {
    reset();
    onCerrar();
  };

  const guardar = async () => {
    setError('');
    if (!email || !nombre || password.length < 6) {
      setError('Completa email, nombre y contrasena (min 6).');
      return;
    }
    setGuardando(true);
    try {
      const payload: CrearUsuarioInput = { email, nombre, password, role };
      await usuariosService.crear(payload);
      reset();
      onCreado();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message || (e as Error).message;
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  // Si solo puede crear vendedor, forzamos el rol.
  useEffect(() => {
    if (!puedeElegirAdmin) setRole('vendedor');
  }, [puedeElegirAdmin, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitulo}>Nuevo usuario</Text>
          {error !== '' && <Text style={styles.error}>{error}</Text>}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="usuario@daystore.local"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre completo"
            placeholderTextColor={COLORS.textMuted}
            value={nombre}
            onChangeText={setNombre}
          />

          <Text style={styles.label}>Contrasena (min 6)</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Rol</Text>
          <View style={styles.chips}>
            <Pressable
              style={[styles.chip, role === 'vendedor' && styles.chipActive]}
              onPress={() => setRole('vendedor')}>
              <Text
                style={[
                  styles.chipTxt,
                  role === 'vendedor' && styles.chipTxtActive,
                ]}>
                Vendedor
              </Text>
            </Pressable>
            {puedeElegirAdmin && (
              <Pressable
                style={[styles.chip, role === 'admin' && styles.chipActive]}
                onPress={() => setRole('admin')}>
                <Text
                  style={[
                    styles.chipTxt,
                    role === 'admin' && styles.chipTxtActive,
                  ]}>
                  Admin
                </Text>
              </Pressable>
            )}
          </View>
          {!puedeElegirAdmin && (
            <Text style={styles.nota}>
              Solo el super admin puede crear administradores.
            </Text>
          )}

          <View style={styles.accionesModal}>
            <Pressable style={styles.btnCancelar} onPress={cerrar}>
              <Text style={styles.btnCancelarTxt}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.btnGuardar, guardando && { opacity: 0.6 }]}
              onPress={guardar}
              disabled={guardando}>
              <Text style={styles.btnGuardarTxt}>
                {guardando ? 'Creando...' : 'Crear'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  titulo: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  subtitulo: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  btnNuevo: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnNuevoTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  input: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 10,
  },
  vacio: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 30,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowInactivo: { opacity: 0.55 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarTxt: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  nombre: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  email: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  estado: { fontSize: 11, fontWeight: '600' },
  mismo: {
    fontSize: 10,
    color: COLORS.primary,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '700',
  },
  btnAccion: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  btnAccionTxt: { fontSize: 11, fontWeight: '700' },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    maxWidth: 420,
  },
  modalTitulo: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  error: {
    backgroundColor: '#FEE2E2',
    color: COLORS.danger,
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    marginBottom: 10,
  },
  label: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4, marginTop: 4 },
  chips: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { color: COLORS.text, fontSize: 12 },
  chipTxtActive: { color: '#fff', fontWeight: '700' },
  nota: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 8 },
  accionesModal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
  },
  btnCancelar: { paddingHorizontal: 14, paddingVertical: 10 },
  btnCancelarTxt: { color: COLORS.textMuted, fontWeight: '600' },
  btnGuardar: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnGuardarTxt: { color: '#fff', fontWeight: '700' },
});
