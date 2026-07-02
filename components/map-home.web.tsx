// Variante web del home. react-native-maps no funciona en navegador, así que
// acá mostramos la lista "Cerca tuyo" sin mapa. Metro elige este archivo
// automáticamente cuando compila para web (extensión .web.tsx).

import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useApp, Business } from '@/contexts/AppContext';
import { Brand, Type, Radius, Spacing } from '@/constants/theme';
import { distanceInMeters, formatDistance } from '@/lib/geo';

export default function MapHomeScreenWeb() {
  const { businesses, prices, userLocation } = useApp();
  const [selected, setSelected] = useState<Business | null>(null);

  const nearby = useMemo(() => {
    const withDistance = businesses.map((b) => ({
      business: b,
      distance:
        userLocation && b.lat != null && b.lon != null
          ? distanceInMeters(userLocation, { lat: b.lat, lon: b.lon })
          : null,
    }));
    return withDistance.sort((a, b) => {
      if (a.distance == null && b.distance == null) return 0;
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });
  }, [businesses, userLocation]);

  const selectedPrices = useMemo(
    () => (selected ? prices.filter((p) => p.business_id === selected.id) : []),
    [selected, prices]
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Precios al Toque</Text>
        <Text style={styles.headerSubtitle}>Comercios y precios de tu zona</Text>
      </View>

      <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={() => router.push('/buscar')}>
        <Ionicons name="cart-outline" size={18} color={Brand.primary} />
        <Text style={styles.searchPlaceholder}>¿Qué producto buscás?</Text>
      </TouchableOpacity>

      <View style={styles.mapNote}>
        <Ionicons name="map-outline" size={16} color={Brand.accentDark} />
        <Text style={styles.mapNoteText}>El mapa interactivo está disponible en la app del celular.</Text>
      </View>

      <Text style={styles.sectionTitle}>Cerca tuyo</Text>
      {nearby.map((item) => (
        <View key={item.business.id}>
          <TouchableOpacity
            style={styles.businessRow}
            onPress={() => setSelected(selected?.id === item.business.id ? null : item.business)}
          >
            <View style={styles.businessIcon}>
              <Ionicons name="storefront-outline" size={17} color="#ffffff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.businessName}>{item.business.name}</Text>
              <Text style={styles.businessMeta}>
                {item.business.address || 'Sin dirección'}
                {item.distance != null ? ` · a ${formatDistance(item.distance)}` : ''}
              </Text>
            </View>
            <Ionicons
              name={selected?.id === item.business.id ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Brand.textMuted}
            />
          </TouchableOpacity>
          {selected?.id === item.business.id && (
            <View style={styles.pricesBox}>
              {selectedPrices.length > 0 ? (
                selectedPrices.map((p) => (
                  <View key={p.id} style={styles.priceRow}>
                    <Text style={styles.priceProduct}>{p.product_name}</Text>
                    <Text style={styles.priceValue}>
                      ${p.price.toLocaleString('es-AR')} {p.unit}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Este comercio todavía no cargó precios.</Text>
              )}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  header: {
    backgroundColor: Brand.primary,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Type.bold,
    fontSize: 22,
    color: '#ffffff',
  },
  headerSubtitle: {
    fontFamily: Type.regular,
    fontSize: 13,
    color: Brand.primaryFaint,
    marginTop: 2,
  },
  searchBar: {
    margin: Spacing.lg,
    backgroundColor: Brand.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Brand.primaryLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchPlaceholder: {
    fontFamily: Type.regular,
    fontSize: 14,
    color: Brand.textMuted,
  },
  mapNote: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Brand.accentFaint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mapNoteText: {
    fontFamily: Type.regular,
    fontSize: 12,
    color: Brand.accentDark,
    flex: 1,
  },
  sectionTitle: {
    fontFamily: Type.bold,
    fontSize: 16,
    color: Brand.textPrimary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  businessIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm + 2,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessName: {
    fontFamily: Type.semibold,
    fontSize: 13.5,
    color: Brand.textPrimary,
  },
  businessMeta: {
    fontFamily: Type.regular,
    fontSize: 11.5,
    color: Brand.textMuted,
  },
  pricesBox: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Brand.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.border,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 6,
  },
  priceProduct: {
    fontFamily: Type.regular,
    fontSize: 13.5,
    color: Brand.textPrimary,
    textTransform: 'capitalize',
  },
  priceValue: {
    fontFamily: Type.bold,
    fontSize: 14.5,
    color: Brand.primaryDark,
  },
  emptyText: {
    fontFamily: Type.regular,
    fontSize: 12.5,
    color: Brand.textMuted,
    paddingVertical: Spacing.sm,
  },
});
