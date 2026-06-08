import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import ProductFormModal from '../components/ProductFormModal';
import {
  categoriesService,
  Category,
  CreateProductInput,
  Product,
  productsService,
} from '../services/negocio.service';
import { COLORS } from '../utils/constants';

/**
 * Pantalla de inventario: lista productos con buscador, filtro por categoria,
 * y CRUD (crear/editar/borrar).
 */
export default function InventarioScreen() {
  const [productos, setProductos] = useState<Product[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Product | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [lista, cats] = await Promise.all([
        productsService.list(
          busqueda || undefined,
          categoriaFiltro ?? undefined,
        ),
        categoriesService.list(),
      ]);
      setProductos(lista);
      setCategorias(cats);
    } catch (err) {
      RNAlert.alert(
        'Error cargando inventario',
        err instanceof Error ? err.message : 'Error desconocido',
      );
    } finally {
      setCargando(false);
    }
  }, [busqueda, categoriaFiltro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  const guardar = async (input: CreateProductInput) => {
    if (editando) {
      const actualizado = await productsService.update(editando.id, input);
      setProductos((prev) =>
        prev.map((p) => (p.id === actualizado.id ? actualizado : p)),
      );
    } else {
      const nuevo = await productsService.create(input);
      setProductos((prev) => [nuevo, ...prev]);
    }
    setModalAbierto(false);
    setEditando(null);
    // Refresca para incluir la relacion category eager-loaded.
    void cargar();
  };

  const confirmarBorrar = (p: Product) => {
    RNAlert.alert(
      'Eliminar producto',
      `¿Eliminar "${p.nombre}" del inventario?`,
      [
        { text: 'No' },
        {
          text: 'Si',
          style: 'destructive',
          onPress: async () => {
            try {
              await productsService.remove(p.id);
              setProductos((prev) => prev.filter((x) => x.id !== p.id));
            } catch (err) {
              RNAlert.alert(
                'No se pudo eliminar',
                err instanceof Error ? err.message : 'Error',
              );
            }
          },
        },
      ],
    );
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
          {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
        </Text>
        <TouchableOpacity
          style={styles.btnAdd}
          onPress={() => {
            setEditando(null);
            setModalAbierto(true);
          }}>
          <Icon name="agregar" color={COLORS.accentContrast} size={16} />
          <Text style={styles.btnAddTxt}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.buscador}
        placeholder="Buscar por nombre..."
        placeholderTextColor={COLORS.textMuted}
        value={busqueda}
        onChangeText={setBusqueda}
      />

      <View style={styles.filtroChips}>
        <TouchableOpacity
          style={[styles.chip, categoriaFiltro === null && styles.chipOn]}
          onPress={() => setCategoriaFiltro(null)}>
          <Text
            style={[styles.chipTxt, categoriaFiltro === null && styles.chipTxtOn]}>
            Todas
          </Text>
        </TouchableOpacity>
        {categorias.map((c) => {
          const selected = categoriaFiltro === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, selected && styles.chipOn]}
              onPress={() => setCategoriaFiltro(c.id)}>
              <Text style={[styles.chipTxt, selected && styles.chipTxtOn]}>
                {c.nombre}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={productos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <ProductCard
            producto={item}
            onEdit={(p) => {
              setEditando(p);
              setModalAbierto(true);
            }}
            onDelete={confirmarBorrar}
          />
        )}
        ListEmptyComponent={
          <View style={{ paddingTop: 30 }}>
            <Text style={styles.vacio}>Todavia no tienes productos.</Text>
            <Text style={styles.vacioHint}>
              Toca "+ Nuevo" para crear el primero.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={onRefresh} />
        }
      />

      <ProductFormModal
        visible={modalAbierto}
        initial={editando}
        categorias={categorias}
        onCancel={() => {
          setModalAbierto(false);
          setEditando(null);
        }}
        onSubmit={guardar}
        onCategoriaCreada={(c) => setCategorias((prev) => [...prev, c])}
      />
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnAddTxt: { color: COLORS.accentContrast, fontWeight: '600' },
  buscador: {
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
  filtroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { fontSize: 12, color: COLORS.text },
  chipTxtOn: { color: COLORS.accentContrast, fontWeight: '600' },
  lista: { padding: 16, paddingTop: 4 },
  vacio: {
    textAlign: 'center',
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  vacioHint: {
    textAlign: 'center',
    color: COLORS.textMuted,
    marginTop: 6,
    fontSize: 13,
  },
});
