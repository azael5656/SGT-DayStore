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
import { Q } from '@nozbe/watermelondb';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import ProductFormModal from '../components/ProductFormModal';
import {
  Category,
  CreateProductInput,
  Product,
  productsService,
} from '../services/negocio.service';
import { database } from '../database';
import ProductModel from '../database/models/Product';
import CategoryModel from '../database/models/Category';
import { sync } from '../database/sync';
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

  // Offline-first: el listado se lee de WatermelonDB (BD local), así funciona
  // con o sin conexión. El catálogo lo baja el SyncProvider por pull; aquí solo
  // leemos y filtramos en memoria.
  const cargar = useCallback(async () => {
    try {
      const cats = await database
        .get<CategoryModel>('categories')
        .query()
        .fetch();
      const prodModels = await database
        .get<ProductModel>('products')
        .query(Q.where('activo', true))
        .fetch();

      const catNombre = new Map(cats.map((c) => [c.id, c.nombre]));
      let prods: Product[] = prodModels.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion ?? null,
        categoryId: p.categoryId,
        category: catNombre.has(p.categoryId)
          ? { id: p.categoryId, nombre: catNombre.get(p.categoryId)!, descripcion: null }
          : undefined,
        precio: p.precio,
        stock: p.stock,
        stockMinimo: p.stockMinimo,
        codigo: p.codigo ?? null,
        activo: p.activo,
      }));

      if (categoriaFiltro) {
        prods = prods.filter((p) => p.categoryId === categoriaFiltro);
      }
      if (busqueda) {
        const q = busqueda.toLowerCase();
        prods = prods.filter(
          (p) =>
            p.nombre.toLowerCase().includes(q) ||
            (p.codigo ?? '').toLowerCase().includes(q),
        );
      }
      prods.sort((a, b) => a.nombre.localeCompare(b.nombre));

      setProductos(prods);
      setCategorias(
        cats
          .map((c) => ({ id: c.id, nombre: c.nombre, descripcion: null }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
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
    // Pull-to-refresh: baja lo último del servidor (si hay red) y re-lee local.
    try {
      await sync();
    } catch {
      /* sin conexión: igual mostramos lo que haya en local */
    }
    await cargar();
    setRefrescando(false);
  };

  // El CRUD de catálogo es online (axios). Tras escribir en el servidor,
  // sincronizamos para que el cambio baje a la BD local y se vea en la lista.
  const guardar = async (input: CreateProductInput) => {
    if (editando) {
      await productsService.update(editando.id, input);
    } else {
      await productsService.create(input);
    }
    setModalAbierto(false);
    setEditando(null);
    try {
      await sync();
    } catch {
      /* el siguiente sync reflejará el cambio */
    }
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
              try {
                await sync();
              } catch {
                /* el siguiente sync reflejará el borrado */
              }
              void cargar();
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
