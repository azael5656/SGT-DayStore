import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../utils/constants';
import Icon from './Icon';
import type { Product } from '../services/negocio.service';

const CATEGORIA_ICONOS: Record<string, string> = {
  Manga: 'manga',
  Figura: 'figura',
  Carta: 'manga',
  Camisa: 'camisa',
  Joyeria: 'joyeria',
  Joyería: 'joyeria',
};

interface Props {
  producto: Product;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}

export default function ProductCard({ producto, onEdit, onDelete }: Props) {
  const categoriaNombre = producto.category?.nombre ?? 'Sin categoria';
  const icono = CATEGORIA_ICONOS[categoriaNombre] ?? 'inventario';
  const stockBajo = producto.stock < producto.stockMinimo;
  const precio = Number(producto.precio);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icono}>
          <Icon name={icono} color={COLORS.primary} size={28} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nombre} numberOfLines={1}>
            {producto.nombre}
          </Text>
          <Text style={styles.categoria}>{categoriaNombre}</Text>
        </View>
        <Text style={styles.precio}>${precio.toLocaleString('es-CO')}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.stock, stockBajo && styles.stockBajo]}>
          Stock: {producto.stock}
          {stockBajo ? ` (min ${producto.stockMinimo})` : ''}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => onEdit(producto)} style={styles.action}>
            <Text style={styles.actionTxt}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(producto)}
            style={[styles.action, styles.actionBorrar]}>
            <Text style={[styles.actionTxt, styles.actionBorrarTxt]}>Borrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  icono: { marginRight: 12 },
  nombre: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  categoria: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  precio: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  stock: { fontSize: 13, color: COLORS.textMuted },
  stockBajo: { color: COLORS.danger, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  action: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  actionTxt: { color: COLORS.accentContrast, fontSize: 12, fontWeight: '600' },
  actionBorrar: { backgroundColor: COLORS.danger },
  actionBorrarTxt: { color: COLORS.accentContrast },
});
