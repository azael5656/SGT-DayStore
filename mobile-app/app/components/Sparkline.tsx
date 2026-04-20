import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS } from '../utils/constants';

interface Props {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

/**
 * Mini barchart con <View>s. Sin libs nativas (react-native-svg
 * ahorrado para no agregar build pesado a la APK).
 */
export default function Sparkline({
  values,
  width = 220,
  height = 60,
  color = COLORS.primary,
}: Props) {
  if (values.length < 2) {
    return <View style={{ width, height }} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const barWidth = Math.max(2, Math.floor(width / values.length) - 1);

  return (
    <View style={[styles.row, { width, height }]}>
      {values.map((v, i) => {
        const norm = (v - min) / range; // 0..1
        const altura = Math.max(2, Math.round(norm * height));
        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                width: barWidth,
                height: altura,
                backgroundColor: color,
                opacity: 0.4 + norm * 0.6,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
  },
  bar: {
    borderRadius: 1,
  },
});
