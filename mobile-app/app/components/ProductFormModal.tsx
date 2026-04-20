import React, { useEffect, useState } from 'react';
import {
  Alert as RNAlert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../utils/constants';
import {
  categoriesService,
  type Category,
  type CreateProductInput,
  type Product,
} from '../services/negocio.service';

interface Props {
  visible: boolean;
  initial: Product | null;
  categorias: Category[];
  onCancel: () => void;
  onSubmit: (input: CreateProductInput) => Promise<void>;
  onCategoriaCreada?: (c: Category) => void;
}

interface Errores {
  nombre?: boolean;
  categoryId?: boolean;
  precio?: boolean;
  stock?: boolean;
}

export default function ProductFormModal({
  visible,
  initial,
  categorias,
  onCancel,
  onSubmit,
  onCategoriaCreada,
}: Props) {
  const [nombre, setNombre] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [crearCategoriaVisible, setCrearCategoriaVisible] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [guardandoCat, setGuardandoCat] = useState(false);

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
    setErrores({});
  }, [visible, initial, categorias]);

  const validar = (): boolean => {
    const nuevosErrores: Errores = {
      nombre: !nombre.trim(),
      categoryId: !categoryId,
      precio: !precio || isNaN(Number(precio)),
      stock: !stock || isNaN(parseInt(stock, 10)),
    };
    setErrores(nuevosErrores);
    return !Object.values(nuevosErrores).some(Boolean);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!validar()) {
      setError('Completa los campos marcados en rojo.');
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

  const crearCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    setGuardandoCat(true);
    try {
      const cat = await categoriesService.create(nuevaCategoria.trim());
      setCategoryId(cat.id);
      setNuevaCategoria('');
      setCrearCategoriaVisible(false);
      onCategoriaCreada?.(cat);
    } catch (e) {
      RNAlert.alert(
        'No se pudo crear la categoria',
        e instanceof Error ? e.message : 'Error',
      );
    } finally {
      setGuardandoCat(false);
    }
  };

  const inputStyle = (hasError?: boolean) => [
    styles.input,
    hasError && styles.inputError,
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView>
            <Text style={styles.title}>
              {initial ? 'Editar producto' : 'Nuevo producto'}
            </Text>

            <Label text="Nombre" required error={errores.nombre} />
            <TextInput
              style={inputStyle(errores.nombre)}
              value={nombre}
              onChangeText={(t) => {
                setNombre(t);
                if (errores.nombre) setErrores({ ...errores, nombre: false });
              }}
              placeholder="Ej. One Piece Vol. 1"
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.filaLabel}>
              <Label
                text="Categoria"
                required
                error={errores.categoryId}
                noMargin
              />
              <Pressable
                onPress={() => setCrearCategoriaVisible(true)}
                hitSlop={8}>
                <Text style={styles.crearLink}>+ Nueva categoria</Text>
              </Pressable>
            </View>
            <View style={styles.chips}>
              {categorias.length === 0 ? (
                <Text style={styles.sinCats}>
                  Aun no hay categorias. Crea la primera con "+ Nueva categoria".
                </Text>
              ) : (
                categorias.map((c) => {
                  const selected = categoryId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, selected && styles.chipOn]}
                      onPress={() => {
                        setCategoryId(c.id);
                        if (errores.categoryId)
                          setErrores({ ...errores, categoryId: false });
                      }}>
                      <Text
                        style={[
                          styles.chipTxt,
                          selected && styles.chipTxtOn,
                        ]}>
                        {c.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <Label text="Precio (COP)" required error={errores.precio} />
            <TextInput
              style={inputStyle(errores.precio)}
              value={precio}
              onChangeText={(t) => {
                setPrecio(t);
                if (errores.precio) setErrores({ ...errores, precio: false });
              }}
              keyboardType="numeric"
              placeholder="15000"
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.rowCols}>
              <View style={{ flex: 1 }}>
                <Label text="Stock" required error={errores.stock} />
                <TextInput
                  style={inputStyle(errores.stock)}
                  value={stock}
                  onChangeText={(t) => {
                    setStock(t);
                    if (errores.stock) setErrores({ ...errores, stock: false });
                  }}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Label text="Alerta si baja de" />
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

            <Label text="Codigo interno o de barras (opcional)" />
            <Text style={styles.hint}>
              Sirve para buscar el producto rapido al cobrar.
            </Text>
            <TextInput
              style={styles.input}
              value={codigo}
              onChangeText={setCodigo}
              placeholder="Ej. 7701234567890"
              placeholderTextColor={COLORS.textMuted}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.btnGuardar, saving && { opacity: 0.5 }]}
              disabled={saving}
              onPress={handleSubmit}>
              <Text style={styles.btnGuardarTxt}>
                {saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear producto'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onCancel} style={styles.btnCancel}>
              <Text style={styles.btnCancelTxt}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      <Modal
        visible={crearCategoriaVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCrearCategoriaVisible(false)}>
        <View style={styles.overlay2}>
          <View style={styles.miniCard}>
            <Text style={styles.title}>Nueva categoria</Text>
            <Text style={styles.hint}>
              Ejemplos: Manga, Figuras, Juegos de mesa, Llaveros...
            </Text>
            <TextInput
              style={styles.input}
              value={nuevaCategoria}
              onChangeText={setNuevaCategoria}
              placeholder="Nombre de la categoria"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />
            <View style={styles.filaBtns}>
              <TouchableOpacity
                onPress={() => {
                  setCrearCategoriaVisible(false);
                  setNuevaCategoria('');
                }}
                style={styles.btnMiniCancel}>
                <Text style={styles.btnCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnMiniGuardar, guardandoCat && { opacity: 0.5 }]}
                onPress={crearCategoria}
                disabled={guardandoCat}>
                <Text style={styles.btnGuardarTxt}>
                  {guardandoCat ? 'Creando...' : 'Crear'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

interface LabelProps {
  text: string;
  required?: boolean;
  error?: boolean;
  noMargin?: boolean;
}
function Label({ text, required, error, noMargin }: LabelProps) {
  return (
    <Text
      style={[
        styles.label,
        noMargin && { marginTop: 0 },
        error && { color: COLORS.danger },
      ]}>
      {text}
      {required && <Text style={styles.req}> *</Text>}
    </Text>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlay2: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '92%',
  },
  miniCard: {
    backgroundColor: COLORS.background,
    padding: 20,
    borderRadius: 16,
    width: '100%',
    maxWidth: 380,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: COLORS.text,
  },
  label: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 14,
    marginBottom: 6,
    fontWeight: '700',
  },
  req: { color: COLORS.danger, fontWeight: '700' },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
    fontStyle: 'italic',
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
  inputError: {
    borderColor: COLORS.danger,
    borderWidth: 2,
    backgroundColor: '#FEF2F2',
  },
  filaLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 14,
    marginBottom: 6,
  },
  crearLink: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
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
  sinCats: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  rowCols: { flexDirection: 'row' },
  error: {
    color: COLORS.danger,
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '600',
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
  btnCancelTxt: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  filaBtns: { flexDirection: 'row', gap: 8, marginTop: 14 },
  btnMiniCancel: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnMiniGuardar: {
    flex: 2,
    padding: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
});
