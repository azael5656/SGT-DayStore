import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../utils/constants';
import type {
  Category,
  CreateProductInput,
  Product,
} from '../services/negocio.service';

interface Props {
  visible: boolean;
  initial: Product | null;
  categorias: Category[];
  onCancel: () => void;
  onSubmit: (input: CreateProductInput) => Promise<void>;
}

export default function ProductFormModal({
  visible,
  initial,
  categorias,
  onCancel,
  onSubmit,
}: Props) {
  const [nombre, setNombre] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setNombre(initial?.nombre ?? '');
    setCategoryId(initial?.categoryId ?? categorias[0]?.id ?? '');
    setPrecio(initial ? String(Number(initial.precio)) : '');
    setStock(initial ? String(initial.stock) : '');
    setStockMinimo(initial ? String(initial.stockMinimo) : '5');
    setCodigo(initial?.codigo ?? '');
    setSaving(false);
    setError(null);
  }, [visible, initial, categorias]);

  const handleSubmit = async () => {
    setError(null);
    if (!nombre.trim() || !categoryId || !precio || !stock) {
      setError('Nombre, categoria, precio y stock son obligatorios');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        nombre: nombre.trim(),
        categoryId,
        precio: Number(precio),
        stock: parseInt(stock, 10),
        stockMinimo: stockMinimo ? parseInt(stockMinimo, 10) : undefined,
        codigo: codigo.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView>
            <Text style={styles.title}>
              {initial ? 'Editar producto' : 'Nuevo producto'}
            </Text>

            <Label text="Nombre" />
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. One Piece Vol. 1"
              placeholderTextColor={COLORS.textMuted}
            />

            <Label text="Categoria" />
            <View style={styles.chips}>
              {categorias.map((c) => {
                const selected = categoryId === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, selected && styles.chipOn]}
                    onPress={() => setCategoryId(c.id)}>
                    <Text style={[styles.chipTxt, selected && styles.chipTxtOn]}>
                      {c.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {categorias.length === 0 && (
                <Text style={{ color: COLORS.textMuted }}>
                  No hay categorias. Corre `npm run seed:inventario`.
                </Text>
              )}
            </View>

            <Label text="Precio (COP)" />
            <TextInput
              style={styles.input}
              value={precio}
              onChangeText={setPrecio}
              keyboardType="numeric"
              placeholder="15000"
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.rowCols}>
              <View style={{ flex: 1 }}>
                <Label text="Stock" />
                <TextInput
                  style={styles.input}
                  value={stock}
                  onChangeText={setStock}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Label text="Stock minimo" />
                <TextInput
                  style={styles.input}
                  value={stockMinimo}
                  onChangeText={setStockMinimo}
                  keyboardType="numeric"
                  placeholder="5"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            <Label text="Codigo (opcional)" />
            <TextInput
              style={styles.input}
              value={codigo}
              onChangeText={setCodigo}
              placeholder="SKU-001"
              placeholderTextColor={COLORS.textMuted}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.btnGuardar, saving && { opacity: 0.5 }]}
              disabled={saving}
              onPress={handleSubmit}>
              <Text style={styles.btnGuardarTxt}>
                {saving ? 'Guardando...' : initial ? 'Actualizar' : 'Crear'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onCancel} style={styles.btnCancel}>
              <Text style={styles.btnCancelTxt}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.text,
  },
  label: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { fontSize: 13, color: COLORS.text },
  chipTxtOn: { color: '#FFF', fontWeight: '600' },
  rowCols: { flexDirection: 'row' },
  error: {
    color: COLORS.danger,
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  btnGuardar: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  btnGuardarTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnCancel: { alignItems: 'center', padding: 12, marginTop: 4 },
  btnCancelTxt: { color: COLORS.textMuted, fontSize: 14 },
});
