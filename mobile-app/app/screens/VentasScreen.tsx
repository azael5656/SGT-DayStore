import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Customer, customersService } from '../services/customers.service';
import { exchangeRatesService } from '../services/exchangeRates.service';
import { Product, productsService } from '../services/negocio.service';
import {
  COMBINACIONES_VALIDAS,
  CreateSaleItemInput,
  CreateSalePaymentInput,
  Currency,
  CurrentRates,
  EstadoVenta,
  PaymentMethod,
  Sale,
  TipoVenta,
  salesService,
} from '../services/sales.service';
import { COLORS } from '../utils/constants';

/**
 * Pantalla de Ventas (mobile).
 *
 * Soporta dos modalidades:
 *  - **Contado** (default): el cliente paga el total ahora. Anónimo permitido.
 *  - **Crédito**: requiere cliente registrado (con cédula). Permite abono
 *    inicial parcial o cero. Saldo queda pendiente y se cobra después
 *    con "Registrar abono" desde el detalle.
 *
 * El modal de creación va en 2 pasos:
 *  1. Productos (carrito)
 *  2. Pagos: toggle Contado/Crédito → cliente si crédito → forma de pago
 *
 * Al cambiar la moneda en un pago, el monto se ajusta automáticamente
 * al equivalente — el vendedor no calcula nada a mano.
 */
export default function VentasScreen() {
  const { user } = useAuth();
  const esGerencia = user?.role === 'admin' || user?.role === 'superadmin';
  const esSuperadmin = user?.role === 'superadmin';

  const [ventas, setVentas] = useState<Sale[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoVenta | 'todas'>(
    'completada',
  );

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [verDetalle, setVerDetalle] = useState<Sale | null>(null);
  const [anularAbierto, setAnularAbierto] = useState<Sale | null>(null);
  const [abonarAbierto, setAbonarAbierto] = useState<Sale | null>(null);

  const cargar = useCallback(async () => {
    try {
      const filtro =
        estadoFiltro === 'todas'
          ? { incluirAnuladas: true, limit: 50 }
          : estadoFiltro === 'anulada'
          ? { estado: 'anulada' as EstadoVenta, incluirAnuladas: true, limit: 50 }
          : estadoFiltro === 'pendiente'
          ? { estado: 'pendiente' as EstadoVenta, limit: 50 }
          : { estado: 'completada' as EstadoVenta, limit: 50 };
      const page = await salesService.list(filtro);
      setVentas(page.items);
    } catch (err) {
      RNAlert.alert(
        'Error cargando ventas',
        err instanceof Error ? err.message : 'Error desconocido',
      );
    } finally {
      setCargando(false);
    }
  }, [estadoFiltro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  const tras = (msg: string) => {
    void cargar();
    RNAlert.alert('Listo', msg);
  };

  const confirmarBorrar = (s: Sale) => {
    RNAlert.alert(
      'Soft delete',
      `Marcar venta ${s.id.slice(0, 8)} como inactiva?`,
      [
        { text: 'No' },
        {
          text: 'Sí',
          style: 'destructive',
          onPress: async () => {
            try {
              await salesService.softDelete(s.id);
              tras('Venta marcada como inactiva');
            } catch (err) {
              RNAlert.alert(
                'Error',
                err instanceof Error ? err.message : 'No se pudo borrar',
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
          {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'}
        </Text>
        <TouchableOpacity
          style={styles.btnAdd}
          onPress={() => setCrearAbierto(true)}>
          <Text style={styles.btnAddTxt}>+ Nueva venta</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chipsRow}>
        {(['completada', 'pendiente', 'anulada', 'todas'] as const).map((opt) => {
          const on = estadoFiltro === opt;
          const label =
            opt === 'completada'
              ? 'Completadas'
              : opt === 'pendiente'
              ? '💰 Deudas'
              : opt === 'anulada'
              ? 'Anuladas'
              : 'Todas';
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => setEstadoFiltro(opt)}>
              <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={ventas}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={onRefresh} />
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={{ paddingTop: 40 }}>
            <Text style={styles.vacio}>Sin ventas en este filtro.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <VentaCard
            venta={item}
            esGerencia={esGerencia}
            esSuperadmin={esSuperadmin}
            onVer={() => setVerDetalle(item)}
            onAbonar={() => setAbonarAbierto(item)}
            onAnular={() => setAnularAbierto(item)}
            onBorrar={() => confirmarBorrar(item)}
          />
        )}
      />

      {crearAbierto && (
        <CrearVentaModal
          onCerrar={() => setCrearAbierto(false)}
          onCreada={() => {
            setCrearAbierto(false);
            tras('Venta registrada');
          }}
        />
      )}
      {verDetalle && (
        <DetalleVentaModal
          venta={verDetalle}
          onAbonar={() => {
            setAbonarAbierto(verDetalle);
            setVerDetalle(null);
          }}
          onCerrar={() => setVerDetalle(null)}
        />
      )}
      {anularAbierto && (
        <AnularVentaModal
          venta={anularAbierto}
          onCerrar={() => setAnularAbierto(null)}
          onAnulada={() => {
            setAnularAbierto(null);
            tras('Venta anulada y stock restaurado');
          }}
        />
      )}
      {abonarAbierto && (
        <RegistrarAbonoModal
          venta={abonarAbierto}
          onCerrar={() => setAbonarAbierto(null)}
          onAbonado={() => {
            setAbonarAbierto(null);
            tras('Abono registrado');
          }}
        />
      )}
    </View>
  );
}

// ============================================================================
// CARD DE LA LISTA
// ============================================================================

function VentaCard({
  venta,
  esGerencia,
  esSuperadmin,
  onVer,
  onAbonar,
  onAnular,
  onBorrar,
}: {
  venta: Sale;
  esGerencia: boolean;
  esSuperadmin: boolean;
  onVer: () => void;
  onAbonar: () => void;
  onAnular: () => void;
  onBorrar: () => void;
}) {
  const fecha = new Date(venta.fecha);
  const saldo = Number(venta.saldoUsd);

  return (
    <TouchableOpacity onPress={onVer} style={styles.card}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.cardTotal}>
              ${Number(venta.total).toFixed(2)}
            </Text>
            <TipoBadge tipo={venta.tipoVenta} />
          </View>
          {venta.customer && (
            <Text style={styles.cardCliente}>
              👤 {venta.customer.nombre} ({venta.customer.cedula})
            </Text>
          )}
          <Text style={styles.cardSub}>
            {fecha.toLocaleDateString()} · {fecha.toLocaleTimeString()}
          </Text>
          {saldo > 0.01 && (
            <Text style={styles.cardSaldo}>
              💰 Saldo pendiente: ${saldo.toFixed(2)} USD
            </Text>
          )}
        </View>
        <EstadoBadge estado={venta.estado} activo={venta.activo} />
      </View>

      {(venta.estado === 'pendiente' || esGerencia || esSuperadmin) && venta.activo && (
        <View style={styles.cardActions}>
          {venta.estado === 'pendiente' && (
            <TouchableOpacity
              onPress={onAbonar}
              style={[styles.actionBtn, styles.actionBtnAbonar]}>
              <Text style={[styles.actionBtnTxt, styles.actionBtnAbonarTxt]}>
                💰 Abonar
              </Text>
            </TouchableOpacity>
          )}
          {esGerencia && venta.estado !== 'anulada' && (
            <TouchableOpacity onPress={onAnular} style={styles.actionBtn}>
              <Text style={styles.actionBtnTxt}>Anular</Text>
            </TouchableOpacity>
          )}
          {esSuperadmin && (
            <TouchableOpacity
              onPress={onBorrar}
              style={[styles.actionBtn, styles.actionBtnDanger]}>
              <Text style={[styles.actionBtnTxt, styles.actionBtnDangerTxt]}>
                Borrar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function TipoBadge({ tipo }: { tipo: TipoVenta }) {
  const cfg =
    tipo === 'credito'
      ? { txt: '💳 CRÉDITO', bg: '#FEF3C7', fg: '#92400E' }
      : { txt: '💵 CONTADO', bg: '#DCFCE7', fg: '#166534' };
  return (
    <View
      style={{
        backgroundColor: cfg.bg,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
      }}>
      <Text style={{ color: cfg.fg, fontSize: 10, fontWeight: '700' }}>
        {cfg.txt}
      </Text>
    </View>
  );
}

function EstadoBadge({
  estado,
  activo,
}: {
  estado: EstadoVenta;
  activo: boolean;
}) {
  const cfg = !activo
    ? { txt: 'INACTIVA', bg: '#E5E7EB', fg: '#374151' }
    : estado === 'anulada'
    ? { txt: 'ANULADA', bg: '#FEE2E2', fg: '#B91C1C' }
    : estado === 'pendiente'
    ? { txt: 'PENDIENTE', bg: '#FEF3C7', fg: '#92400E' }
    : { txt: 'OK', bg: '#DCFCE7', fg: '#166534' };
  return (
    <View
      style={{
        backgroundColor: cfg.bg,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
      }}>
      <Text style={{ color: cfg.fg, fontSize: 11, fontWeight: '700' }}>
        {cfg.txt}
      </Text>
    </View>
  );
}

// ============================================================================
// CREAR VENTA — modal con 2 pasos
// ============================================================================

interface ItemCarrito {
  productId: string;
  nombre: string;
  precioUsd: number;
  stockDisponible: number;
  cantidad: number;
}

interface PagoBorrador {
  id: string;
  currency: Currency;
  method: PaymentMethod;
  amount: string;
}

function toUsd(monto: number, currency: Currency, tasas: CurrentRates | null): number {
  if (!Number.isFinite(monto) || monto <= 0) return 0;
  if (currency === 'USD') return monto;
  const rate = currency === 'VES' ? tasas?.VES : tasas?.COP;
  if (!rate) return 0;
  return monto / rate;
}

function fromUsd(usd: number, currency: Currency, tasas: CurrentRates | null): number | null {
  if (currency === 'USD') return usd;
  const rate = currency === 'VES' ? tasas?.VES : tasas?.COP;
  if (!rate) return null;
  return usd * rate;
}

function CrearVentaModal({
  onCerrar,
  onCreada,
}: {
  onCerrar: () => void;
  onCreada: () => void;
}) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [productos, setProductos] = useState<Product[]>([]);
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [pagos, setPagos] = useState<PagoBorrador[]>([]);
  const [tasas, setTasas] = useState<CurrentRates | null>(null);
  const [tipoVenta, setTipoVenta] = useState<TipoVenta>('contado');
  const [cliente, setCliente] = useState<Customer | null>(null);
  const [notas, setNotas] = useState('');
  const [picker, setPicker] = useState(false);
  const [pickerCliente, setPickerCliente] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    Promise.all([productsService.list(), exchangeRatesService.getCurrent()])
      .then(([lista, t]) => {
        setProductos(lista.filter((p) => p.activo && p.stock > 0));
        setTasas(t);
      })
      .catch((err) =>
        RNAlert.alert(
          'Error cargando',
          err instanceof Error ? err.message : 'Error',
        ),
      );
  }, []);

  const totalUsd = useMemo(
    () => items.reduce((acc, i) => acc + i.precioUsd * i.cantidad, 0),
    [items],
  );

  const sumaPagosUsd = useMemo(
    () => pagos.reduce((acc, p) => acc + toUsd(Number(p.amount), p.currency, tasas), 0),
    [pagos, tasas],
  );
  const diferencia = totalUsd - sumaPagosUsd;
  const saldoUsd = Math.max(0, totalUsd - sumaPagosUsd);
  const cuadra =
    totalUsd > 0 &&
    (tipoVenta === 'contado'
      ? Math.abs(diferencia) <= 0.01
      : sumaPagosUsd <= totalUsd + 0.01);

  /** Al pasar al paso 2, prellenar 1 pago con el total (caso típico). */
  const irAPagos = () => {
    if (items.length === 0) {
      RNAlert.alert('Carrito vacío', 'Agrega al menos un producto.');
      return;
    }
    if (pagos.length === 0) {
      setPagos([
        {
          id: String(Date.now()),
          currency: 'USD',
          method: 'efectivo',
          amount: totalUsd.toFixed(2),
        },
      ]);
    }
    setPaso(2);
  };

  /**
   * Cambia el tipo de venta. El cliente seleccionado NO se borra al
   * pasar a contado: una venta de contado tambien puede asociar un
   * cliente (opcional) para que quede en su historial de compras y
   * sirva para fidelidad / descuentos a recurrentes.
   */
  const cambiarTipoVenta = (t: TipoVenta) => {
    setTipoVenta(t);
  };

  const updatePago = (id: string, patch: Partial<PagoBorrador>) => {
    setPagos((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const merged = { ...p, ...patch };
        if (patch.currency && patch.currency !== p.currency) {
          const validos = COMBINACIONES_VALIDAS[patch.currency];
          if (!validos.includes(merged.method)) merged.method = validos[0];
          // Auto-llenado: convertir monto al equivalente en la nueva moneda.
          const previoUsd = toUsd(Number(p.amount), p.currency, tasas);
          let usdObjetivo = previoUsd;
          if (usdObjetivo <= 0) {
            const otrosUsd = prev
              .filter((x) => x.id !== id)
              .reduce((a, x) => a + toUsd(Number(x.amount), x.currency, tasas), 0);
            usdObjetivo = Math.max(0, totalUsd - otrosUsd);
          }
          const nuevo = fromUsd(usdObjetivo, patch.currency, tasas);
          if (nuevo !== null) merged.amount = nuevo.toFixed(2);
        }
        return merged;
      }),
    );
  };

  const submit = async () => {
    if (tipoVenta === 'credito' && !cliente) {
      RNAlert.alert(
        'Falta cliente',
        'Las ventas a crédito requieren elegir un cliente con cédula.',
      );
      return;
    }
    if (!cuadra) {
      RNAlert.alert(
        'Pagos no cuadran',
        tipoVenta === 'contado'
          ? `Diferencia: $${Math.abs(diferencia).toFixed(2)} USD`
          : `El abono no puede superar el total. Sobra $${Math.abs(diferencia).toFixed(2)} USD`,
      );
      return;
    }
    setGuardando(true);
    try {
      const itemsPayload: CreateSaleItemInput[] = items.map((i) => ({
        productId: i.productId,
        cantidad: i.cantidad,
      }));
      const paymentsPayload: CreateSalePaymentInput[] = pagos
        .filter((p) => Number(p.amount) > 0)
        .map((p) => ({
          currency: p.currency,
          method: p.method,
          amount: Number(p.amount),
        }));
      await salesService.create({
        items: itemsPayload,
        payments: paymentsPayload,
        tipoVenta,
        customerId: cliente?.id,
        notas: notas.trim() || undefined,
      });
      onCreada();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      RNAlert.alert(
        'No se pudo registrar',
        e.response?.data?.message ??
          (err instanceof Error ? err.message : 'Error'),
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onCerrar}>
      <View style={modal.cont}>
        <View style={modal.header}>
          <View style={{ flex: 1 }}>
            <Text style={modal.titulo}>Nueva venta</Text>
            <Text style={modal.subtitulo}>
              Paso {paso} de 2 · {paso === 1 ? 'Productos' : 'Cómo paga'}
            </Text>
          </View>
          <TouchableOpacity onPress={onCerrar}>
            <Text style={{ fontSize: 24, color: COLORS.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={modal.stepper}>
          <View style={[modal.stepDot, modal.stepDotOn]} />
          <View style={[modal.stepLine, paso === 2 && modal.stepLineOn]} />
          <View style={[modal.stepDot, paso === 2 && modal.stepDotOn]} />
        </View>

        {paso === 1 ? (
          <Paso1Carrito
            items={items}
            totalUsd={totalUsd}
            tasas={tasas}
            onAbrirPicker={() => setPicker(true)}
            onCambiarCantidad={(productId, delta) =>
              setItems((prev) =>
                prev.map((i) =>
                  i.productId === productId
                    ? {
                        ...i,
                        cantidad: Math.max(
                          1,
                          Math.min(i.stockDisponible, i.cantidad + delta),
                        ),
                      }
                    : i,
                ),
              )
            }
            onQuitar={(productId) =>
              setItems((prev) => prev.filter((i) => i.productId !== productId))
            }
          />
        ) : (
          <Paso2Pagos
            tipoVenta={tipoVenta}
            cliente={cliente}
            notas={notas}
            pagos={pagos}
            tasas={tasas}
            totalUsd={totalUsd}
            sumaPagosUsd={sumaPagosUsd}
            saldoUsd={saldoUsd}
            diferencia={diferencia}
            cuadra={cuadra}
            onTipoVentaChange={cambiarTipoVenta}
            onAbrirPickerCliente={() => setPickerCliente(true)}
            onLimpiarCliente={() => setCliente(null)}
            onNotasChange={setNotas}
            onUpdate={updatePago}
          />
        )}

        <View style={modal.footer}>
          {paso === 1 ? (
            <TouchableOpacity
              onPress={irAPagos}
              disabled={items.length === 0}
              style={[
                modal.btnPrimary,
                items.length === 0 && { opacity: 0.4 },
              ]}>
              <Text style={modal.btnPrimaryTxt}>
                Siguiente: pagos →   ${totalUsd.toFixed(2)}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => setPaso(1)} style={modal.btnSec}>
                <Text style={modal.btnSecTxt}>← Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submit}
                disabled={guardando || !cuadra}
                style={[
                  modal.btnPrimary,
                  { flex: 1 },
                  (guardando || !cuadra) && { opacity: 0.4 },
                ]}>
                <Text style={modal.btnPrimaryTxt}>
                  {guardando ? 'Registrando...' : 'Confirmar venta'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {picker && (
          <ProductPicker
            productos={productos.filter(
              (p) => !items.some((i) => i.productId === p.id),
            )}
            onCerrar={() => setPicker(false)}
            onElegir={(p) => {
              setItems((prev) => [
                ...prev,
                {
                  productId: p.id,
                  nombre: p.nombre,
                  precioUsd: Number(p.precio),
                  stockDisponible: p.stock,
                  cantidad: 1,
                },
              ]);
              setPicker(false);
            }}
          />
        )}
        {pickerCliente && (
          <ClientePicker
            onCerrar={() => setPickerCliente(false)}
            onElegir={(c) => {
              setCliente(c);
              setPickerCliente(false);
            }}
          />
        )}
      </View>
    </Modal>
  );
}

// ============================================================================
// PASO 1 — CARRITO
// ============================================================================

function Paso1Carrito({
  items,
  totalUsd,
  tasas,
  onAbrirPicker,
  onCambiarCantidad,
  onQuitar,
}: {
  items: ItemCarrito[];
  totalUsd: number;
  tasas: CurrentRates | null;
  onAbrirPicker: () => void;
  onCambiarCantidad: (productId: string, delta: number) => void;
  onQuitar: (productId: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View style={paso1.totalCard}>
        <Text style={paso1.totalLabel}>TOTAL</Text>
        <Text style={paso1.totalValor}>${totalUsd.toFixed(2)}</Text>
        <Text style={paso1.totalUsd}>USD</Text>
        {tasas?.VES && (
          <Text style={paso1.totalAlt}>
            ≈ {(totalUsd * tasas.VES).toLocaleString()} Bs
          </Text>
        )}
        {tasas?.COP && (
          <Text style={paso1.totalAlt}>
            ≈ {(totalUsd * tasas.COP).toLocaleString()} COP
          </Text>
        )}
      </View>

      <View style={paso1.itemsHeader}>
        <Text style={paso1.section}>
          {items.length} {items.length === 1 ? 'producto' : 'productos'}
        </Text>
        <TouchableOpacity onPress={onAbrirPicker} style={paso1.addBtn}>
          <Text style={paso1.addBtnTxt}>+ Agregar producto</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={paso1.vacioBox}>
          <Text style={paso1.vacioTxt}>Tu carrito está vacío</Text>
          <Text style={paso1.vacioHint}>
            Toca "+ Agregar producto" para empezar.
          </Text>
        </View>
      ) : (
        items.map((i) => (
          <View key={i.productId} style={paso1.itemCard}>
            <View style={{ flex: 1 }}>
              <Text style={paso1.itemNombre} numberOfLines={2}>
                {i.nombre}
              </Text>
              <Text style={paso1.itemDetalle}>
                ${i.precioUsd.toFixed(2)} c/u · stock {i.stockDisponible}
              </Text>
              <Text style={paso1.itemSubtotal}>
                = ${(i.precioUsd * i.cantidad).toFixed(2)}
              </Text>
            </View>
            <View style={paso1.qtyCol}>
              <TouchableOpacity
                onPress={() => onCambiarCantidad(i.productId, +1)}
                style={paso1.qtyBtn}>
                <Text style={paso1.qtyBtnTxt}>+</Text>
              </TouchableOpacity>
              <Text style={paso1.qtyValor}>{i.cantidad}</Text>
              <TouchableOpacity
                onPress={() => onCambiarCantidad(i.productId, -1)}
                style={paso1.qtyBtn}>
                <Text style={paso1.qtyBtnTxt}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onQuitar(i.productId)}
                style={paso1.delBtn}>
                <Text style={paso1.delBtnTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function ProductPicker({
  productos,
  onCerrar,
  onElegir,
}: {
  productos: Product[];
  onCerrar: () => void;
  onElegir: (p: Product) => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const filtrados = productos.filter(
    (p) =>
      !busqueda ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo ?? '').toLowerCase().includes(busqueda.toLowerCase()),
  );
  return (
    <Modal animationType="slide" onRequestClose={onCerrar}>
      <View style={modal.cont}>
        <View style={modal.header}>
          <Text style={modal.titulo}>Elegir producto</Text>
          <TouchableOpacity onPress={onCerrar}>
            <Text style={{ fontSize: 24, color: COLORS.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16 }}>
          <TextInput
            style={paso1.searchInput}
            placeholder="Buscar..."
            placeholderTextColor={COLORS.textMuted}
            value={busqueda}
            onChangeText={setBusqueda}
            autoFocus
          />
        </View>
        <FlatList
          data={filtrados}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <Text
              style={{
                textAlign: 'center',
                color: COLORS.textMuted,
                marginTop: 30,
              }}>
              Sin productos.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onElegir(item)}
              style={paso1.pickerFila}>
              <View style={{ flex: 1 }}>
                <Text style={paso1.itemNombre}>{item.nombre}</Text>
                <Text style={paso1.itemDetalle}>
                  ${Number(item.precio).toFixed(2)} · stock {item.stock}
                </Text>
              </View>
              <Text style={{ color: COLORS.primary, fontSize: 26 }}>+</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

// ============================================================================
// CLIENTE PICKER (con creación inline)
// ============================================================================

function ClientePicker({
  onCerrar,
  onElegir,
}: {
  onCerrar: () => void;
  onElegir: (c: Customer) => void;
}) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Customer[]>([]);
  const [creando, setCreando] = useState(false);
  const [nuevoCedula, setNuevoCedula] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const lista = await customersService.list(query || undefined);
      setResultados(lista);
    } catch (err) {
      RNAlert.alert('Error', err instanceof Error ? err.message : 'Error');
    }
  }, [query]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crearCliente = async () => {
    if (!nuevoCedula.trim() || !nuevoNombre.trim()) {
      RNAlert.alert('Faltan datos', 'Cédula y nombre son obligatorios.');
      return;
    }
    setEnviando(true);
    try {
      const c = await customersService.create({
        cedula: nuevoCedula.trim(),
        nombre: nuevoNombre.trim(),
        telefono: nuevoTelefono.trim() || undefined,
      });
      onElegir(c);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      RNAlert.alert(
        'Error',
        e.response?.data?.message ??
          (err instanceof Error ? err.message : 'No se pudo'),
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onCerrar}>
      <View style={modal.cont}>
        <View style={modal.header}>
          <Text style={modal.titulo}>Elegir cliente</Text>
          <TouchableOpacity onPress={onCerrar}>
            <Text style={{ fontSize: 24, color: COLORS.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={{ padding: 16 }}>
          <TextInput
            style={paso1.searchInput}
            placeholder="Buscar por cédula o nombre..."
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>

        {!creando ? (
          <FlatList
            data={resultados}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 30,
            }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              <Text
                style={{
                  textAlign: 'center',
                  color: COLORS.textMuted,
                  marginTop: 20,
                }}>
                Sin resultados.
              </Text>
            }
            ListFooterComponent={
              <TouchableOpacity
                onPress={() => setCreando(true)}
                style={cliPicker.crearBtn}>
                <Text style={cliPicker.crearTxt}>+ Registrar cliente nuevo</Text>
              </TouchableOpacity>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => onElegir(item)}
                style={paso1.pickerFila}>
                <View style={{ flex: 1 }}>
                  <Text style={paso1.itemNombre}>{item.nombre}</Text>
                  <Text style={paso1.itemDetalle}>
                    {item.cedula}
                    {item.telefono ? ` · ${item.telefono}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={cliPicker.formBox}>
              <Text style={cliPicker.formTit}>Nuevo cliente</Text>
              <Text style={cliPicker.lbl}>Cédula *</Text>
              <TextInput
                style={cliPicker.input}
                placeholder="V-12345678"
                placeholderTextColor={COLORS.textMuted}
                value={nuevoCedula}
                onChangeText={setNuevoCedula}
                autoFocus
              />
              <Text style={cliPicker.lbl}>Nombre completo *</Text>
              <TextInput
                style={cliPicker.input}
                value={nuevoNombre}
                onChangeText={setNuevoNombre}
                placeholderTextColor={COLORS.textMuted}
              />
              <Text style={cliPicker.lbl}>Teléfono</Text>
              <TextInput
                style={cliPicker.input}
                value={nuevoTelefono}
                onChangeText={setNuevoTelefono}
                placeholder="04141234567"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />
              <View
                style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <TouchableOpacity
                  onPress={() => setCreando(false)}
                  style={cliPicker.cancelBtn}>
                  <Text style={cliPicker.cancelTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={crearCliente}
                  disabled={enviando}
                  style={[
                    cliPicker.submitBtn,
                    enviando && { opacity: 0.5 },
                  ]}>
                  <Text style={cliPicker.submitTxt}>
                    {enviando ? 'Guardando...' : 'Registrar y elegir'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ============================================================================
// PASO 2 — PAGOS + TIPO DE VENTA
// ============================================================================

function Paso2Pagos({
  tipoVenta,
  cliente,
  notas,
  pagos,
  tasas,
  totalUsd,
  sumaPagosUsd,
  saldoUsd,
  diferencia,
  cuadra,
  onTipoVentaChange,
  onAbrirPickerCliente,
  onLimpiarCliente,
  onNotasChange,
  onUpdate,
}: {
  tipoVenta: TipoVenta;
  cliente: Customer | null;
  notas: string;
  pagos: PagoBorrador[];
  tasas: CurrentRates | null;
  totalUsd: number;
  sumaPagosUsd: number;
  saldoUsd: number;
  diferencia: number;
  cuadra: boolean;
  onTipoVentaChange: (t: TipoVenta) => void;
  onAbrirPickerCliente: () => void;
  onLimpiarCliente: () => void;
  onNotasChange: (s: string) => void;
  onUpdate: (id: string, patch: Partial<PagoBorrador>) => void;
}) {
  const pago = pagos[0];
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
      {/* Tipo de venta */}
      <Text style={paso2.section}>Tipo de venta</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <TouchableOpacity
          onPress={() => onTipoVentaChange('contado')}
          style={[
            paso2.tipoBtn,
            tipoVenta === 'contado' && paso2.tipoBtnContadoOn,
          ]}>
          <Text
            style={[
              paso2.tipoBtnTxt,
              tipoVenta === 'contado' && paso2.tipoBtnTxtOn,
            ]}>
            💵 Contado
          </Text>
          <Text style={paso2.tipoBtnSub}>Paga todo ahora</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onTipoVentaChange('credito')}
          style={[
            paso2.tipoBtn,
            tipoVenta === 'credito' && paso2.tipoBtnCreditoOn,
          ]}>
          <Text
            style={[
              paso2.tipoBtnTxt,
              tipoVenta === 'credito' && paso2.tipoBtnTxtOn,
            ]}>
            💳 Crédito
          </Text>
          <Text style={paso2.tipoBtnSub}>Abona o fía</Text>
        </TouchableOpacity>
      </View>

      {/* Cliente: requerido si credito, opcional si contado (para
          historial y fidelidad). */}
      <Text style={paso2.section}>
        {tipoVenta === 'credito' ? 'Cliente *' : 'Cliente (opcional)'}
      </Text>
      {cliente ? (
        <View style={paso2.clienteCard}>
          <View style={{ flex: 1 }}>
            <Text style={paso2.clienteNombre}>{cliente.nombre}</Text>
            <Text style={paso2.clienteCedula}>{cliente.cedula}</Text>
            {cliente.telefono && (
              <Text style={paso2.clienteTel}>📞 {cliente.telefono}</Text>
            )}
          </View>
          <TouchableOpacity onPress={onLimpiarCliente}>
            <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>
              {tipoVenta === 'credito' ? 'Cambiar' : 'Quitar'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onAbrirPickerCliente}
          style={paso2.elegirClienteBtn}>
          <Text style={paso2.elegirClienteTxt}>
            🔍 Buscar / crear cliente
          </Text>
        </TouchableOpacity>
      )}

      {/* Resumen */}
      <View style={paso2.resumen}>
        <View style={paso2.resumenRow}>
          <Text style={paso2.resumenLabel}>Total</Text>
          <Text style={paso2.resumenTotal}>${totalUsd.toFixed(2)} USD</Text>
        </View>
        <View style={paso2.resumenRow}>
          <Text style={paso2.resumenLabel}>
            {tipoVenta === 'credito' ? 'Abonado ahora' : 'Recibido'}
          </Text>
          <Text style={paso2.resumenRecibido}>
            ${sumaPagosUsd.toFixed(2)} USD
          </Text>
        </View>
        {tipoVenta === 'credito' && saldoUsd > 0.01 && (
          <View
            style={[
              paso2.resumenRow,
              {
                paddingTop: 8,
                marginTop: 4,
                borderTopWidth: 1,
                borderTopColor: COLORS.border,
              },
            ]}>
            <Text style={[paso2.resumenLabel, { color: '#92400E' }]}>
              Saldo pendiente
            </Text>
            <Text
              style={[paso2.resumenRecibido, { color: '#B45309' }]}>
              ${saldoUsd.toFixed(2)} USD
            </Text>
          </View>
        )}

        {tipoVenta === 'contado' ? (
          cuadra ? (
            <View style={[paso2.indicador, paso2.indicadorOk]}>
              <Text style={paso2.indicadorTxtOk}>✅ Pagos cuadran</Text>
            </View>
          ) : (
            <View style={[paso2.indicador, paso2.indicadorWarn]}>
              <Text style={paso2.indicadorTxtWarn}>
                ⚠️{' '}
                {diferencia > 0
                  ? `Falta $${diferencia.toFixed(2)}`
                  : `Sobra $${Math.abs(diferencia).toFixed(2)}`}
              </Text>
            </View>
          )
        ) : !cuadra ? (
          <View style={[paso2.indicador, paso2.indicadorErr]}>
            <Text style={paso2.indicadorTxtErr}>
              ⚠️ El abono no puede superar el total
            </Text>
          </View>
        ) : sumaPagosUsd === 0 ? (
          <View style={[paso2.indicador, paso2.indicadorInfo]}>
            <Text style={paso2.indicadorTxtInfo}>
              💳 Venta totalmente fiada
            </Text>
          </View>
        ) : saldoUsd <= 0.01 ? (
          <View style={[paso2.indicador, paso2.indicadorOk]}>
            <Text style={paso2.indicadorTxtOk}>✅ Pagado en pleno</Text>
          </View>
        ) : (
          <View style={[paso2.indicador, paso2.indicadorWarn]}>
            <Text style={paso2.indicadorTxtWarn}>
              💳 Abono parcial — queda ${saldoUsd.toFixed(2)} USD
            </Text>
          </View>
        )}
      </View>

      {/* Pago */}
      <Text style={paso2.section}>
        {tipoVenta === 'credito' ? 'Abono inicial (opcional)' : 'Forma de pago'}
      </Text>
      {pago && (
        <PagoEditor
          pago={pago}
          tasas={tasas}
          onUpdate={(patch) => onUpdate(pago.id, patch)}
        />
      )}

      {/* Notas */}
      <Text style={paso2.section}>Notas (opcional)</Text>
      <TextInput
        style={paso2.notasInput}
        placeholder="Ej: paga la próxima semana, se llevó sin caja..."
        placeholderTextColor={COLORS.textMuted}
        value={notas}
        onChangeText={onNotasChange}
        multiline
        maxLength={500}
      />

      <Text style={paso2.help}>
        💡 Cambia la moneda de un pago y el monto se ajusta solo al equivalente.
      </Text>
    </ScrollView>
  );
}

function PagoEditor({
  pago,
  tasas,
  onUpdate,
}: {
  pago: PagoBorrador;
  tasas: CurrentRates | null;
  onUpdate: (patch: Partial<PagoBorrador>) => void;
}) {
  const validos = COMBINACIONES_VALIDAS[pago.currency];
  const sinTasa =
    (pago.currency === 'VES' && !tasas?.VES) ||
    (pago.currency === 'COP' && !tasas?.COP);
  const equiv = toUsd(Number(pago.amount), pago.currency, tasas);

  return (
    <View style={paso2.pagoCard}>
      <Text style={paso2.fieldLabel}>Moneda</Text>
      <View style={paso2.chipsRow}>
        {(['USD', 'VES', 'COP'] as const).map((c) => {
          const on = pago.currency === c;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => onUpdate({ currency: c })}
              style={[paso2.chip, on && paso2.chipOn]}>
              <Text style={[paso2.chipTxt, on && paso2.chipTxtOn]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={paso2.fieldLabel}>Método</Text>
      <View style={paso2.chipsRow}>
        {validos.map((m) => {
          const on = pago.method === m;
          const label =
            m === 'pago_movil' ? 'Pago móvil' : m === 'transferencia' ? 'Transfer.' : m;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => onUpdate({ method: m })}
              style={[paso2.chip, on && paso2.chipOn]}>
              <Text
                style={[paso2.chipTxt, on && paso2.chipTxtOn]}
                numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={paso2.fieldLabel}>Monto en {pago.currency}</Text>
      <TextInput
        style={paso2.amountInput}
        placeholder="0.00"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="decimal-pad"
        value={pago.amount}
        onChangeText={(v) => onUpdate({ amount: v })}
      />

      {sinTasa ? (
        <View style={paso2.warningBox}>
          <Text style={paso2.warningTxt}>
            ⚠️ Tasa de {pago.currency} no configurada. Súbela en Tasa del día.
          </Text>
        </View>
      ) : pago.currency !== 'USD' ? (
        <Text style={paso2.equiv}>
          ≈ <Text style={paso2.equivStrong}>${equiv.toFixed(2)} USD</Text>
        </Text>
      ) : null}
    </View>
  );
}

// ============================================================================
// DETALLE
// ============================================================================

function DetalleVentaModal({
  venta,
  onAbonar,
  onCerrar,
}: {
  venta: Sale;
  onAbonar: () => void;
  onCerrar: () => void;
}) {
  const saldo = Number(venta.saldoUsd);

  return (
    <Modal animationType="slide" onRequestClose={onCerrar}>
      <View style={modal.cont}>
        <View style={modal.header}>
          <Text style={modal.titulo}>Venta · {venta.id.slice(0, 8)}</Text>
          <TouchableOpacity onPress={onCerrar}>
            <Text style={{ fontSize: 24, color: COLORS.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
          {/* Saldo destacado si es pendiente */}
          {venta.estado === 'pendiente' && saldo > 0.01 && (
            <View style={detalle.saldoCard}>
              <Text style={detalle.saldoLabel}>SALDO PENDIENTE</Text>
              <Text style={detalle.saldoValor}>${saldo.toFixed(2)} USD</Text>
              {venta.customer && (
                <Text style={detalle.saldoCliente}>
                  {venta.customer.nombre} · {venta.customer.cedula}
                </Text>
              )}
            </View>
          )}

          <DetalleRow label="Fecha">
            {new Date(venta.fecha).toLocaleString()}
          </DetalleRow>
          <DetalleRow label="Tipo">
            {venta.tipoVenta === 'credito' ? '💳 Crédito' : '💵 Contado'}
          </DetalleRow>
          {venta.customer && (
            <DetalleRow label="Cliente">
              {venta.customer.nombre} ({venta.customer.cedula})
              {venta.customer.telefono ? ` · ${venta.customer.telefono}` : ''}
            </DetalleRow>
          )}
          <DetalleRow label="Vendedor">
            {venta.userNombre ?? '—'} ({venta.userEmail})
          </DetalleRow>
          <DetalleRow label="Estado">
            <EstadoBadge estado={venta.estado} activo={venta.activo} />
          </DetalleRow>
          {venta.notas && <DetalleRow label="Notas">{venta.notas}</DetalleRow>}
          {venta.estado === 'anulada' && (
            <>
              <DetalleRow label="Motivo">
                {venta.motivoAnulacion ?? '—'}
              </DetalleRow>
              <DetalleRow label="Anulada en">
                {venta.anuladaEn
                  ? new Date(venta.anuladaEn).toLocaleString()
                  : '—'}
              </DetalleRow>
            </>
          )}

          <Text style={detalle.section}>Items</Text>
          {venta.items.map((it) => (
            <View key={it.id} style={detalle.fila}>
              <View style={{ flex: 1 }}>
                <Text style={detalle.nombre}>{it.productNombre}</Text>
                <Text style={detalle.subtxt}>
                  {it.cantidad} × ${Number(it.precioUnitario).toFixed(2)} USD
                </Text>
              </View>
              <Text style={detalle.nombre}>
                ${Number(it.subtotal).toFixed(2)}
              </Text>
            </View>
          ))}

          <Text style={detalle.section}>
            Pagos / Abonos ({venta.payments.length})
          </Text>
          {venta.payments.length === 0 ? (
            <Text style={{ color: COLORS.textMuted, fontSize: 12, textAlign: 'center', padding: 12 }}>
              Sin pagos registrados — venta totalmente fiada.
            </Text>
          ) : (
            venta.payments.map((p) => (
              <View key={p.id} style={detalle.pagoCard}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}>
                  <Text style={detalle.nombre}>
                    {p.currency} · {p.method.replace('_', ' ')}
                  </Text>
                  <Text style={detalle.fecha}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ marginTop: 4 }}>
                  <Text style={detalle.subtxt}>
                    Monto: {Number(p.amountOriginal).toLocaleString()}{' '}
                    {p.currency}
                  </Text>
                  <Text style={detalle.subtxt}>
                    Tasa: {Number(p.exchangeRate).toLocaleString()}
                  </Text>
                  <Text style={detalle.equiv}>
                    = ${Number(p.amountUsd).toFixed(2)} USD
                  </Text>
                </View>
              </View>
            ))
          )}

          <View style={detalle.totalBar}>
            <Text style={detalle.totalLabel}>TOTAL</Text>
            <Text style={detalle.totalValor}>
              ${Number(venta.total).toFixed(2)} USD
            </Text>
          </View>
        </ScrollView>

        {/* Botón flotante Registrar abono */}
        {venta.estado === 'pendiente' && venta.activo && (
          <View style={modal.footer}>
            <TouchableOpacity onPress={onAbonar} style={modal.btnPrimary}>
              <Text style={modal.btnPrimaryTxt}>💰 Registrar abono</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

function DetalleRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
      <Text style={{ width: 110, color: COLORS.textMuted, fontSize: 13 }}>
        {label}
      </Text>
      <Text style={{ flex: 1, color: COLORS.text, fontSize: 13 }}>
        {children}
      </Text>
    </View>
  );
}

// ============================================================================
// REGISTRAR ABONO
// ============================================================================

function RegistrarAbonoModal({
  venta,
  onCerrar,
  onAbonado,
}: {
  venta: Sale;
  onCerrar: () => void;
  onAbonado: () => void;
}) {
  const [tasas, setTasas] = useState<CurrentRates | null>(null);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [amount, setAmount] = useState(Number(venta.saldoUsd).toFixed(2));
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    exchangeRatesService.getCurrent().then(setTasas);
  }, []);

  const validos = COMBINACIONES_VALIDAS[currency];
  // Auto-corregir método si la combinación es inválida.
  useEffect(() => {
    if (!validos.includes(method)) setMethod(validos[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const equivUsd = toUsd(Number(amount), currency, tasas);
  const saldoActual = Number(venta.saldoUsd);
  const tras = saldoActual - equivUsd;
  const sobra = tras < -0.01;
  const completaria = Math.abs(tras) <= 0.01;

  const cambiarCurrency = (c: Currency) => {
    if (c === currency) return;
    const usd = toUsd(Number(amount), currency, tasas);
    setCurrency(c);
    const nuevo = fromUsd(usd, c, tasas);
    if (nuevo !== null) setAmount(nuevo.toFixed(2));
  };

  const submit = async () => {
    if (sobra) {
      RNAlert.alert('Sobra', 'El abono no puede superar el saldo pendiente.');
      return;
    }
    if (Number(amount) <= 0) {
      RNAlert.alert('Inválido', 'Indica un monto positivo.');
      return;
    }
    setEnviando(true);
    try {
      await salesService.addAbono(venta.id, {
        currency,
        method,
        amount: Number(amount),
        notas: notas.trim() || undefined,
      });
      onAbonado();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      RNAlert.alert(
        'No se pudo registrar',
        e.response?.data?.message ??
          (err instanceof Error ? err.message : 'Error'),
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onCerrar}>
      <View style={modal.cont}>
        <View style={modal.header}>
          <Text style={modal.titulo}>Registrar abono</Text>
          <TouchableOpacity onPress={onCerrar}>
            <Text style={{ fontSize: 24, color: COLORS.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
          <View style={detalle.saldoCard}>
            <Text style={detalle.saldoLabel}>SALDO PENDIENTE</Text>
            <Text style={detalle.saldoValor}>${saldoActual.toFixed(2)} USD</Text>
            {venta.customer && (
              <Text style={detalle.saldoCliente}>
                {venta.customer.nombre} · {venta.customer.cedula}
              </Text>
            )}
          </View>

          <Text style={paso2.fieldLabel}>Moneda</Text>
          <View style={paso2.chipsRow}>
            {(['USD', 'VES', 'COP'] as const).map((c) => {
              const on = currency === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => cambiarCurrency(c)}
                  style={[paso2.chip, on && paso2.chipOn]}>
                  <Text style={[paso2.chipTxt, on && paso2.chipTxtOn]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={paso2.fieldLabel}>Método</Text>
          <View style={paso2.chipsRow}>
            {validos.map((m) => {
              const on = method === m;
              const label =
                m === 'pago_movil'
                  ? 'Pago móvil'
                  : m === 'transferencia'
                  ? 'Transfer.'
                  : m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMethod(m)}
                  style={[paso2.chip, on && paso2.chipOn]}>
                  <Text style={[paso2.chipTxt, on && paso2.chipTxtOn]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={paso2.fieldLabel}>Monto en {currency}</Text>
          <TextInput
            style={paso2.amountInput}
            placeholder="0.00"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
          {currency !== 'USD' && (
            <Text style={paso2.equiv}>
              ≈ <Text style={paso2.equivStrong}>${equivUsd.toFixed(2)} USD</Text>
            </Text>
          )}

          {completaria && (
            <View style={[paso2.indicador, paso2.indicadorOk]}>
              <Text style={paso2.indicadorTxtOk}>✅ Cierra la deuda</Text>
            </View>
          )}
          {sobra && (
            <View style={[paso2.indicador, paso2.indicadorErr]}>
              <Text style={paso2.indicadorTxtErr}>
                ⚠️ Sobra ${Math.abs(tras).toFixed(2)} del saldo
              </Text>
            </View>
          )}
          {!completaria && !sobra && Number(amount) > 0 && (
            <Text
              style={{
                fontSize: 12,
                color: COLORS.textMuted,
                marginTop: 10,
                textAlign: 'center',
              }}>
              Saldo restante después: ${tras.toFixed(2)} USD
            </Text>
          )}

          <Text style={paso2.fieldLabel}>Notas (opcional)</Text>
          <TextInput
            style={paso2.notasInput}
            placeholder="Ej: pago en la tienda, cliente prometió..."
            placeholderTextColor={COLORS.textMuted}
            value={notas}
            onChangeText={setNotas}
            maxLength={300}
          />
        </ScrollView>

        <View style={modal.footer}>
          <TouchableOpacity
            onPress={submit}
            disabled={enviando || sobra || Number(amount) <= 0}
            style={[
              modal.btnPrimary,
              (enviando || sobra || Number(amount) <= 0) && { opacity: 0.4 },
            ]}>
            <Text style={modal.btnPrimaryTxt}>
              {enviando ? 'Registrando...' : 'Confirmar abono'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// ANULAR
// ============================================================================

function AnularVentaModal({
  venta,
  onCerrar,
  onAnulada,
}: {
  venta: Sale;
  onCerrar: () => void;
  onAnulada: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const submit = async () => {
    if (motivo.trim().length < 5) {
      RNAlert.alert(
        'Motivo muy corto',
        'El motivo debe tener al menos 5 caracteres.',
      );
      return;
    }
    setEnviando(true);
    try {
      await salesService.cancel(venta.id, motivo.trim());
      onAnulada();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      RNAlert.alert(
        'No se pudo anular',
        e.response?.data?.message ??
          (err instanceof Error ? err.message : 'Error'),
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal animationType="fade" transparent onRequestClose={onCerrar}>
      <View style={anular.overlay}>
        <View style={anular.dialog}>
          <Text style={anular.titulo}>Anular venta</Text>
          <Text style={anular.texto}>
            <Text style={{ fontWeight: '700' }}>Devuelve el stock</Text> de
            los {venta.items.length} item(s). Los pagos NO se reembolsan
            automáticamente.
          </Text>
          <TextInput
            style={anular.input}
            placeholder="Motivo (mínimo 5 caracteres)"
            placeholderTextColor={COLORS.textMuted}
            value={motivo}
            onChangeText={setMotivo}
            multiline
          />
          <View style={anular.botones}>
            <TouchableOpacity onPress={onCerrar} style={anular.btn}>
              <Text style={{ color: COLORS.textMuted, fontWeight: '600' }}>
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submit}
              disabled={enviando}
              style={[
                anular.btn,
                anular.btnPrimary,
                enviando && { opacity: 0.6 },
              ]}>
              <Text style={{ color: '#FFF', fontWeight: '700' }}>
                {enviando ? 'Anulando...' : 'Confirmar'}
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
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { fontSize: 12, color: COLORS.text },
  chipTxtOn: { color: '#FFF', fontWeight: '600' },
  lista: { padding: 16, paddingTop: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardRow: { flexDirection: 'row' },
  cardTotal: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  cardCliente: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 4,
    fontWeight: '600',
  },
  cardSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cardSaldo: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 4,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexWrap: 'wrap',
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
  },
  actionBtnTxt: { color: '#92400E', fontSize: 12, fontWeight: '700' },
  actionBtnAbonar: { backgroundColor: '#DCFCE7' },
  actionBtnAbonarTxt: { color: '#166534' },
  actionBtnDanger: { backgroundColor: '#FEE2E2' },
  actionBtnDangerTxt: { color: '#B91C1C' },
  vacio: {
    textAlign: 'center',
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
});

const modal = StyleSheet.create({
  cont: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  titulo: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  subtitulo: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  stepDotOn: { backgroundColor: COLORS.primary },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 6,
  },
  stepLineOn: { backgroundColor: COLORS.primary },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 12,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPrimaryTxt: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  btnSec: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnSecTxt: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
});

const paso1 = StyleSheet.create({
  totalCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
  },
  totalLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    letterSpacing: 1,
  },
  totalValor: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 4,
  },
  totalUsd: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  totalAlt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  section: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  vacioBox: {
    backgroundColor: COLORS.surface,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  vacioTxt: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  vacioHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  itemNombre: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  itemDetalle: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 6,
  },
  qtyCol: { alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnTxt: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  qtyValor: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    minWidth: 24,
    textAlign: 'center',
  },
  delBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  delBtnTxt: { color: '#B91C1C', fontWeight: '700' },
  searchInput: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
    color: COLORS.text,
  },
  pickerFila: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

const paso2 = StyleSheet.create({
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  // Tipo de venta toggle
  tipoBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  tipoBtnContadoOn: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  tipoBtnCreditoOn: { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' },
  tipoBtnTxt: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  tipoBtnTxtOn: {},
  tipoBtnSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  // Cliente
  clienteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFCE8',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  clienteNombre: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  clienteCedula: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  clienteTel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  elegirClienteBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#F59E0B',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  elegirClienteTxt: { color: '#92400E', fontWeight: '700' },
  // Resumen
  resumen: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    marginTop: 4,
  },
  resumenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resumenLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  resumenTotal: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  resumenRecibido: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  indicador: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  indicadorOk: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  indicadorWarn: { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' },
  indicadorErr: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  indicadorInfo: { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
  indicadorTxtOk: { color: '#166534', fontWeight: '800', fontSize: 13 },
  indicadorTxtWarn: { color: '#92400E', fontWeight: '800', fontSize: 13 },
  indicadorTxtErr: { color: '#991B1B', fontWeight: '800', fontSize: 13 },
  indicadorTxtInfo: { color: '#1E40AF', fontWeight: '800', fontSize: 13 },
  // Pago card
  pagoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  pagoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pagoIdx: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  pagoQuitar: { fontSize: 12, color: '#DC2626', fontWeight: '700' },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  chipsRow: { flexDirection: 'row', gap: 6 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { fontSize: 13, color: COLORS.text, fontWeight: '700' },
  chipTxtOn: { color: '#FFF' },
  amountInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    backgroundColor: COLORS.background,
    textAlign: 'right',
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  warningTxt: { color: '#92400E', fontSize: 12, fontWeight: '600' },
  equiv: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 6,
    textAlign: 'right',
  },
  equivStrong: { fontWeight: '800', color: COLORS.text },
  addBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnTxt: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  notasInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    minHeight: 60,
  },
  help: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

const cliPicker = StyleSheet.create({
  crearBtn: {
    marginTop: 16,
    padding: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  crearTxt: { color: COLORS.primary, fontWeight: '800' },
  formBox: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  formTit: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  lbl: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelTxt: { color: COLORS.textMuted, fontWeight: '700' },
  submitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitTxt: { color: '#FFF', fontWeight: '700' },
});

const detalle = StyleSheet.create({
  saldoCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  saldoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 1,
  },
  saldoValor: {
    fontSize: 32,
    fontWeight: '900',
    color: '#B45309',
    marginTop: 4,
  },
  saldoCliente: { fontSize: 12, color: '#92400E', marginTop: 4 },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pagoCard: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nombre: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  subtxt: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  fecha: { fontSize: 11, color: COLORS.textMuted },
  equiv: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 10,
    marginTop: 16,
  },
  totalLabel: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  totalValor: { color: '#FFF', fontSize: 22, fontWeight: '800' },
});

const anular = StyleSheet.create({
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
  titulo: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  texto: {
    fontSize: 13,
    color: COLORS.text,
    marginVertical: 12,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  botones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnPrimary: { backgroundColor: '#F59E0B' },
});
