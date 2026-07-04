// Home de la app: el mapa. (Solo Android/iOS — la versión web liviana está
// en index.web.tsx, porque react-native-maps no funciona en navegador.)
//
// - Mapa centrado en el usuario (o en CABA si no hay permiso todavía)
// - Cada comercio con coordenadas aparece como una burbuja verde con su nombre
// - Buscador flotante arriba (navega a la pestaña Buscar)
// - Botón para centrar el mapa en tu ubicación
// - Panel inferior "Cerca tuyo": comercios ordenados por distancia; al tocar
//   uno (en el panel o en el mapa) se ven sus productos y precios

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp, Business } from '@/contexts/AppContext';
import { Brand, Type, Radius, Spacing } from '@/constants/theme';
import { distanceInMeters, formatDistance } from '@/lib/geo';

// Centro por defecto cuando no tenemos la ubicación del usuario (Obelisco, CABA)
const DEFAULT_REGION = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

export default function MapHomeScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { businesses, prices, userLocation, requestLocation } = useApp();
  const [selected, setSelected] = useState<Business | null>(null);

  const businessesWithCoords = useMemo(
    () => businesses.filter((b) => b.lat != null && b.lon != null),
    [businesses]
  );

  // Comercios ordenados por cercanía (los sin coordenadas van al final)
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

  const focusBusiness = (b: Business) => {
    setSelected(b);
    if (b.lat != null && b.lon != null) {
      mapRef.current?.animateToRegion(
        { latitude: b.lat, longitude: b.lon, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        400
      );
    }
  };

  const centerOnMe = async () => {
    const coords = userLocation ?? (await requestLocation());
    if (!coords) {
      Alert.alert(
        'Ubicación no disponible',
        'Activá el permiso de ubicación para ver los comercios cerca tuyo.'
      );
      return;
    }
    mapRef.current?.animateToRegion(
      { latitude: coords.lat, longitude: coords.lon, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      400
    );
  };

  const initialRegion = userLocation
    ? { latitude: userLocation.lat, longitude: userLocation.lon, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : DEFAULT_REGION;

  // Ajuste inicial del encuadre: cuando ya tenemos comercios con coordenadas,
  // acomodamos el zoom para que entren el usuario y los comercios más cercanos.
  // Sin esto, si los comercios quedan fuera del radio inicial el mapa se ve
  // vacío y parece que no hay nada cargado.
  const didFitRef = useRef(false);
  useEffect(() => {
    if (didFitRef.current || businessesWithCoords.length === 0) return;

    // Hasta 5 comercios más cercanos (o los primeros 5 si no hay ubicación)
    const nearest = [...businessesWithCoords]
      .sort((a, b) => {
        if (!userLocation) return 0;
        const da = distanceInMeters(userLocation, { lat: a.lat!, lon: a.lon! });
        const db = distanceInMeters(userLocation, { lat: b.lat!, lon: b.lon! });
        return da - db;
      })
      .slice(0, 5)
      .map((b) => ({ latitude: b.lat!, longitude: b.lon! }));

    const coords = userLocation
      ? [{ latitude: userLocation.lat, longitude: userLocation.lon }, ...nearest]
      : nearest;

    // Pequeño delay para asegurar que el mapa ya está montado
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 140, right: 60, bottom: 280, left: 60 },
        animated: true,
      });
      didFitRef.current = true;
    }, 600);

    return () => clearTimeout(timer);
  }, [businessesWithCoords, userLocation]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPress={() => setSelected(null)}
      >
        {businessesWithCoords.map((b) => {
          // Android (y en especial la arquitectura nueva de RN) mide mal las
          // vistas custom dentro de un Marker y recorta el texto. Defensa en
          // capas: ancho Y alto explícitos, collapsable={false} para que
          // Android no "aplane" la vista, y allowFontScaling={false} para que
          // el tamaño de letra del sistema no desborde el ancho calculado.
          const label =
            b.name.length > 18 ? b.name.slice(0, 17).trimEnd() + '…' : b.name;
          const pillWidth = Math.min(Math.max(Math.ceil(label.length * 8) + 28, 70), 185);
          return (
            <Marker
              key={b.id}
              coordinate={{ latitude: b.lat!, longitude: b.lon! }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={(e) => {
                e.stopPropagation();
                focusBusiness(b);
              }}
            >
              <View
                collapsable={false}
                style={[
                  styles.markerPill,
                  { width: pillWidth, height: 28 },
                  selected?.id === b.id && styles.markerPillSelected,
                ]}
              >
                <Text style={styles.markerText} allowFontScaling={false} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Buscador flotante */}
      <TouchableOpacity
        style={[styles.searchBar, { top: insets.top + Spacing.md }]}
        activeOpacity={0.8}
        onPress={() => router.push('/buscar')}
      >
        <Ionicons name="cart-outline" size={18} color={Brand.primary} />
        <Text style={styles.searchPlaceholder}>¿Qué producto buscás?</Text>
      </TouchableOpacity>

      {/* Botón centrar en mí */}
      <TouchableOpacity
        style={[styles.locateFab, { bottom: selected ? 320 : 240 }]}
        onPress={centerOnMe}
        accessibilityLabel="Centrar el mapa en mi ubicación"
      >
        <Ionicons name="locate-outline" size={22} color={Brand.primary} />
      </TouchableOpacity>

      {/* Panel inferior */}
      <View style={styles.bottomPanel}>
        <View style={styles.grabber} />
        {selected ? (
          <>
            <View style={styles.panelHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.panelTitle}>{selected.name}</Text>
                <Text style={styles.panelSubtitle}>
                  {selected.address || 'Sin dirección'}
                  {userLocation && selected.lat != null && selected.lon != null
                    ? ` · a ${formatDistance(distanceInMeters(userLocation, { lat: selected.lat, lon: selected.lon }))}`
                    : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} accessibilityLabel="Cerrar detalle">
                <Ionicons name="close" size={22} color={Brand.textMuted} />
              </TouchableOpacity>
            </View>
            {selectedPrices.length > 0 ? (
              <FlatList
                data={selectedPrices.slice(0, 6)}
                keyExtractor={(p) => p.id}
                style={{ maxHeight: 180 }}
                renderItem={({ item }) => (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceProduct}>{item.product_name}</Text>
                    <Text style={styles.priceValue}>
                      ${item.price.toLocaleString('es-AR')} {item.unit}
                    </Text>
                  </View>
                )}
              />
            ) : (
              <Text style={styles.emptyText}>Este comercio todavía no cargó precios.</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.panelTitle}>Cerca tuyo</Text>
            <FlatList
              data={nearby.slice(0, 4)}
              keyExtractor={(item) => item.business.id}
              style={{ maxHeight: 190 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.businessRow} onPress={() => focusBusiness(item.business)}>
                  <View style={styles.businessIcon}>
                    <Ionicons name="storefront-outline" size={17} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.businessName} numberOfLines={1}>
                      {item.business.name}
                    </Text>
                    <Text style={styles.businessMeta} numberOfLines={1}>
                      {item.business.address || 'Sin dirección'}
                      {item.distance != null ? ` · a ${formatDistance(item.distance)}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Brand.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Todavía no hay comercios cargados en la zona.</Text>
              }
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  searchBar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Brand.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Brand.primaryLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  searchPlaceholder: {
    fontFamily: Type.regular,
    fontSize: 14,
    color: Brand.textMuted,
  },
  markerPill: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.sm + 2,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPillSelected: {
    backgroundColor: Brand.primaryDark,
    borderColor: Brand.accent,
  },
  markerText: {
    // Letra del sistema a propósito: Android convierte el marcador en imagen
    // apenas se crea, antes de que Nunito cargue — con fuente custom el texto
    // sale vacío. La del sistema está disponible al instante.
    fontWeight: '700',
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
  },
  locateFab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Brand.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.border,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  panelTitle: {
    fontFamily: Type.bold,
    fontSize: 16,
    color: Brand.textPrimary,
    marginBottom: Spacing.xs,
  },
  panelSubtitle: {
    fontFamily: Type.regular,
    fontSize: 12,
    color: Brand.textSecondary,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
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
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.border,
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
    paddingVertical: Spacing.md,
  },
});
