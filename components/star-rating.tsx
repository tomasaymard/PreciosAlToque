// Estrellas de puntuación. Dos usos:
// - Solo lectura (mostrar el promedio de un comercio): pasar `value` y no `onRate`.
// - Interactivo (que el usuario vote): pasar `onRate`; cada estrella es tocable.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Type } from '@/constants/theme';

interface StarRatingProps {
  /** Valor a dibujar (promedio o voto del usuario). 0/undefined = ninguna llena. */
  value?: number | null;
  /** Cantidad de votos, para mostrar "(N)" al lado. Omitir para no mostrarlo. */
  count?: number;
  /** Si se pasa, las estrellas son tocables y llama a onRate(1..5). */
  onRate?: (stars: number) => void;
  size?: number;
}

export function StarRating({ value, count, onRate, size = 16 }: StarRatingProps) {
  const filled = Math.round(value ?? 0);
  const interactive = typeof onRate === 'function';

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const iconName = n <= filled ? 'star' : 'star-outline';
        const color = n <= filled ? Brand.accent : Brand.border;
        if (interactive) {
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onRate!(n)}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              accessibilityLabel={`Puntuar con ${n} estrella${n > 1 ? 's' : ''}`}
            >
              <Ionicons name={iconName} size={size} color={color} />
            </TouchableOpacity>
          );
        }
        return <Ionicons key={n} name={iconName} size={size} color={color} />;
      })}
      {value != null && !interactive && (
        <Text style={[styles.label, { fontSize: size - 3 }]}>
          {value.toFixed(1).replace('.', ',')}
          {count != null ? ` (${count})` : ''}
        </Text>
      )}
      {value == null && count === 0 && !interactive && (
        <Text style={[styles.labelMuted, { fontSize: size - 3 }]}>Sin puntuar</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontFamily: Type.semibold,
    color: Brand.accentDark,
    marginLeft: 4,
  },
  labelMuted: {
    fontFamily: Type.regular,
    color: Brand.textMuted,
    marginLeft: 4,
  },
});
