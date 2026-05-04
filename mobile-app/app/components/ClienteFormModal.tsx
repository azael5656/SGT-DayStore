import React, { useState } from 'react';
import {
  Alert as RNAlert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Customer,
  customersService,
} from '../services/customers.service';
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

const REGEX_CEDULA = /^[VEJGP]?-?[0-9]{6,9}$/;
const REGEX_TELEFONO = /^[0-9]{7,15}$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  cliente: Customer | null;
  onCerrar: () => void;
  onGuardado: (c: Customer) => void;
}

/**
 * Modal de creacion/edicion de cliente. Reusable desde la lista
 * (boton "+ Nuevo") y desde la pantalla de detalle (boton "Editar").
 */
export default function ClienteFormModal({ cliente, onCerrar, onGuardado }: Props) {
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
      const guardado = cliente
        ? await customersService.update(cliente.id, payload)
        : await customersService.create(payload);
      onGuardado(guardado);
    } catch (err) {
      RNAlert.alert('Error', parseApiError(err, 'No se pudo guardar'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onCerrar}>
      <View style={styles.cont}>
        <View style={styles.header}>
          <Text style={styles.titulo}>
            {cliente ? 'Editar cliente' : 'Nuevo cliente'}
          </Text>
          <TouchableOpacity onPress={onCerrar}>
            <Text style={{ fontSize: 22, color: COLORS.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Text style={styles.label}>Cédula *</Text>
          <TextInput
            style={styles.input}
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

          <Text style={styles.label}>Nombre completo *</Text>
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={(t) => setNombre(soloLetrasYEspacios(t))}
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="words"
            maxLength={80}
            multiline={false}
            numberOfLines={1}
          />

          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            value={telefono}
            onChangeText={(t) => setTelefono(soloDigitos(t))}
            placeholder="04141234567"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            maxLength={15}
            multiline={false}
            numberOfLines={1}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={120}
            multiline={false}
            numberOfLines={1}
          />

          <Text style={styles.label}>Notas</Text>
          <TextInput
            style={[
              styles.input,
              { minHeight: 60, maxHeight: 120, textAlignVertical: 'top' },
            ]}
            value={notas}
            onChangeText={setNotas}
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={500}
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={submit}
            disabled={enviando}
            style={[styles.submitBtn, enviando && { opacity: 0.5 }]}>
            <Text style={styles.submitTxt}>
              {enviando ? 'Guardando...' : 'Guardar cliente'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
