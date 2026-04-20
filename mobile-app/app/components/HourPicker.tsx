import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '../utils/constants';

interface Props {
  label?: string;
  value: string | null; // "HH:MM"
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
}

const ITEM_HEIGHT = 40;
const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTOS = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, '0'),
);

/**
 * Picker de hora (HH:MM) con dos columnas scrolleables. Sin libs nativas.
 * Minutos en pasos de 5 para que sea rapido de manejar.
 */
export default function HourPicker({
  label,
  value,
  onChange,
  onClear,
  placeholder = '--:--',
}: Props) {
  const [visible, setVisible] = useState(false);
  const [h, setH] = useState(value?.split(':')[0] ?? '09');
  const [m, setM] = useState(value?.split(':')[1] ?? '00');
  const hRef = useRef<FlatList<string>>(null);
  const mRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    if (!visible) return;
    const hh = value?.split(':')[0] ?? '09';
    const mm = value?.split(':')[1] ?? '00';
    setH(hh);
    setM(mm);
    const iH = HORAS.indexOf(hh);
    const iM = MINUTOS.indexOf(mm);
    setTimeout(() => {
      hRef.current?.scrollToIndex({
        index: Math.max(0, iH),
        animated: false,
      });
      mRef.current?.scrollToIndex({
        index: Math.max(0, iM),
        animated: false,
      });
    }, 50);
  }, [visible, value]);

  const confirmar = () => {
    onChange(`${h}:${m}`);
    setVisible(false);
  };

  return (
    <View>
      <View style={styles.inline}>
        <Pressable
          style={styles.trigger}
          onPress={() => setVisible(true)}>
          <Text style={value ? styles.triggerTxt : styles.triggerPh}>
            {value || placeholder}
          </Text>
        </Pressable>
        {onClear && value && (
          <Pressable onPress={onClear} style={styles.btnClear}>
            <Text style={styles.btnClearTxt}>Limpiar</Text>
          </Pressable>
        )}
      </View>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable
          style={styles.backdrop}
          onPress={() => setVisible(false)}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.titulo}>{label ?? 'Elegir hora'}</Text>
            <View style={styles.columnas}>
              <Columna
                refFlat={hRef}
                data={HORAS}
                seleccion={h}
                onSelect={setH}
                suffix="h"
              />
              <Text style={styles.dosPuntos}>:</Text>
              <Columna
                refFlat={mRef}
                data={MINUTOS}
                seleccion={m}
                onSelect={setM}
                suffix="m"
              />
            </View>
            <View style={styles.preview}>
              <Text style={styles.previewTxt}>
                {h}:{m}
              </Text>
            </View>
            <View style={styles.acciones}>
              <Pressable
                style={styles.btnCancelar}
                onPress={() => setVisible(false)}>
                <Text style={styles.btnCancelarTxt}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.btnOk} onPress={confirmar}>
                <Text style={styles.btnOkTxt}>Aceptar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

interface ColProps {
  data: string[];
  seleccion: string;
  onSelect: (v: string) => void;
  suffix: string;
  refFlat: React.RefObject<FlatList<string>>;
}

function Columna({ data, seleccion, onSelect, suffix, refFlat }: ColProps) {
  return (
    <View style={styles.col}>
      <FlatList
        ref={refFlat}
        data={data}
        keyExtractor={(x) => x}
        initialScrollIndex={Math.max(0, data.indexOf(seleccion))}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        showsVerticalScrollIndicator={false}
        style={{ height: ITEM_HEIGHT * 5 }}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2,
        }}
        renderItem={({ item }) => {
          const activo = item === seleccion;
          return (
            <Pressable
              style={styles.item}
              onPress={() => onSelect(item)}>
              <Text
                style={[
                  styles.itemTxt,
                  activo && styles.itemTxtActive,
                ]}>
                {item}
                <Text style={styles.itemSuffix}> {suffix}</Text>
              </Text>
            </Pressable>
          );
        }}
      />
      {/* linea guia del item central */}
      <View pointerEvents="none" style={styles.guia} />
    </View>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', gap: 8 },
  trigger: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
  },
  triggerTxt: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
  triggerPh: { fontSize: 15, color: COLORS.textMuted },
  btnClear: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  btnClearTxt: { color: COLORS.textMuted, fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 360,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  columnas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  col: { width: 80, overflow: 'hidden' },
  dosPuntos: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: ITEM_HEIGHT * 2,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTxt: { fontSize: 18, color: COLORS.textMuted },
  itemTxtActive: { color: COLORS.primary, fontWeight: '800', fontSize: 22 },
  itemSuffix: { fontSize: 11, color: COLORS.textMuted },
  guia: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  preview: {
    marginTop: 14,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    alignItems: 'center',
  },
  previewTxt: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  acciones: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  btnCancelar: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnCancelarTxt: { color: COLORS.textMuted, fontWeight: '700' },
  btnOk: {
    flex: 2,
    padding: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  btnOkTxt: { color: '#fff', fontWeight: '800' },
});
