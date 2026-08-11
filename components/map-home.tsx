// Home de la app: el mapa. (Solo Android/iOS — la versión web liviana está
// en map-home.web.tsx.)
//
// El mapa es Leaflet + OpenStreetMap dentro de un WebView. Se eligió así
// porque no requiere clave de API, cuenta de Google ni tarjeta de crédito
// (react-native-maps obliga a una clave de Google Maps en Android).
// El HTML del mapa vive en lib/leaflet-map.ts.
//
// - Mapa centrado en el usuario (o en el Obelisco si todavía no hay permiso)
// - Cada comercio con coordenadas es un pin verde (naranja el seleccionado)
// - Buscador flotante arriba (navega a la pestaña Buscar)
// - Chips para filtrar por rubro
// - Botón para centrar el mapa en tu ubicación
// - Panel inferior "Cerca tuyo": comercios por distancia; al tocar uno (en el
//   panel o en el mapa) se ven sus productos, precios y puntuación

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Alert, ScrollView } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp, Business } from '@/contexts/AppContext';
import { Brand, Type, Radius, Spacing } from '@/constants/theme';
import { distanceInMeters, formatDistance } from '@/lib/geo';
import { CATEGORIES, categoryLabel } from '@/lib/categories';
import { StarRating } from '@/components/star-rating';
import { buildMapHtml, DEFAULT_CENTER } from '@/lib/leaflet-map';

export default function MapHomeScreen() {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const didFitRef = useRef(false);

  const {
    businesses,
    prices,
    userLocation,
    requestLocation,
    session,
    getBusinessRating,
    rateBusiness,
    isMyBusiness,
  } = useApp();
  const [selected, setSelected] = useState<Business | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Ejecuta código dentro del mapa (el WebView). El `true;` final evita un
  // warning de react-native-webview en iOS.
  const runInMap = useCallback((js: string) => {
    webRef.current?.injectJavaScript(`${js}; true;`);
  }, []);

  const handleRate = async (businessId: string, stars: number) => {
    if (!session) {
      Alert.alert(
        'Necesitás una cuenta',
        'Registrate como vecino (gratis) para puntuar comercios.',
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Crear cuenta', onPress: () => router.push('/signup') },
        ]
      );
      return;
    }
    try {
      await rateBusiness(businessId, stars);
    } catch (e: any) {
      Alert.alert('No se pudo puntuar', e?.message || 'Probá de nuevo.');
    }
  };

  const filteredBusinesses = useMemo(
    () =>
      categoryFilter
        ? businesses.filter((b) => b.category === categoryFilter)
        : businesses,
    [businesses, categoryFilter]
  );

  const businessesWithCoords = useMemo(
    () => filteredBusinesses.filter((b) => b.lat != null && b.lon != null),
    [filteredBusinesses]
  );

  const availableCategories = useMemo(() => {
    const keys = new Set(businesses.map((b) => b.category).filter(Boolean) as string[]);
    return CATEGORIES.filter((c) => keys.has(c.key));
  }, [businesses]);

  const nearby = useMemo(() => {
    const withDistance = filteredBusinesses.map((b) => ({
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
  }, [filteredBusinesses, userLocation]);

  const selectedPrices = useMemo(
    () => (selected ? prices.filter((p) => p.business_id === selected.id) : []),
    [selected, prices]
  );

  const focusBusiness = (b: Business) => {
    setSelected(b);
    runInMap(`window.PAT.setSelected(${JSON.stringify(b.id)})`);
    if (b.lat != null && b.lon != null) {
      runInMap(`window.PAT.centerOn(${b.lat}, ${b.lon}, 16)`);
    }
  };

  const clearSelection = () => {
    setSelected(null);
    runInMap('window.PAT.setSelected(null)');
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
    runInMap(`window.PAT.centerOn(${coords.lat}, ${coords.lon}, 16)`);
  };

  // Mensajes que llegan desde el mapa
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        setMapReady(true);
      } else if (msg.type === 'markerPress') {
        const b = businesses.find((x) => x.id === msg.id);
        if (b) focusBusiness(b);
      } else if (msg.type === 'mapPress') {
        clearSelection();
      }
    } catch {
      // mensaje no reconocido: lo ignoramos
    }
  };

  // Sincronizar los pines cuando cambian los comercios o el filtro
  useEffect(() => {
    if (!mapReady) return;
    const data = businessesWithCoords.map((b) => ({
      id: b.id,
      lat: b.lat as number,
      lon: b.lon as number,
      name: b.name,
    }));
    runInMap(`window.PAT.setMarkers(${JSON.stringify(data)})`);
  }, [mapReady, businessesWithCoords, runInMap]);

  // Sincronizar el punto de "vos estás acá"
  useEffect(() => {
    if (!mapReady || !userLocation) return;
    runInMap(`window.PAT.setUserLocation(${userLocation.lat}, ${userLocation.lon})`);
  }, [mapReady, userLocation, runInMap]);

  // Encuadre inicial: que entren el usuario y los comercios más cercanos.
  // Una sola vez, para no pelear con el usuario mientras navega el mapa.
  useEffect(() => {
    if (!mapReady || didFitRef.current || businessesWithCoords.length === 0) return;

    const nearest = [...businessesWithCoords]
      .sort((a, b) => {
        if (!userLocation) return 0;
        const da = distanceInMeters(userLocation, { lat: a.lat!, lon: a.lon! });
        const db = distanceInMeters(userLocation, { lat: b.lat!, lon: b.lon! });
        return da - db;
      })
      .slice(0, 5)
      .map((b) => ({ lat: b.lat as number, lon: b.lon as number }));

    const coords = userLocation ? [{ lat: userLocation.lat, lon: userLocation.lon }, ...nearest] : nearest;

    const timer = setTimeout(() => {
      runInMap(`window.PAT.fitTo(${JSON.stringify(coords)})`);
      didFitRef.current = true;
    }, 400);
    return () => clearTimeout(timer);
  }, [mapReady, businessesWithCoords, userLocation, runInMap]);

  const initialCenter = userLocation
    ? { lat: userLocation.lat, lon: userLocation.lon }
    : DEFAULT_CENTER;

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        style={StyleSheet.absoluteFill}
        originWhitelist={['*']}
        source={{ html: buildMapHtml(initialCenter) }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
      />

      {/* Buscador flotante */}
      <TouchableOpacity
        style={[styles.searchBar, { top: insets.top + Spacing.md }]}
        activeOpacity={0.8}
        onPress={() => router.push('/buscar')}
      >
        <Ionicons name="cart-outline" size={18} color={Brand.primary} />
        <Text style={styles.searchPlaceholder}>¿Qué producto buscás?</Text>
      </TouchableOpacity>

      {/* Chips de rubro (solo si hay comercios con rubro cargado) */}
      {availableCategories.length > 0 && (
        <View style={[styles.chipsBar, { top: insets.top + Spacing.md + 56 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
          >
            <TouchableOpacity
              style={[styles.filterChip, categoryFilter === null && styles.filterChipActive]}
              onPress={() => setCategoryFilter(null)}
            >
              <Text style={[styles.filterChipText, categoryFilter === null && styles.filterChipTextActive]}>
                Todos
              </Text>
            </TouchableOpacity>
            {availableCategories.map((c) => {
              const active = categoryFilter === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setCategoryFilter(active ? null : c.key)}
                >
                  <Ionicons
                    name={c.icon as any}
                    size={14}
                    color={active ? '#ffffff' : Brand.textSecondary}
                  />
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

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
                  {categoryLabel(selected.category)
                    ? `${categoryLabel(selected.category)} · `
                    : ''}
                  {selected.address || 'Sin dirección'}
                  {userLocation && selected.lat != null && selected.lon != null
                    ? ` · a ${formatDistance(distanceInMeters(userLocation, { lat: selected.lat, lon: selected.lon }))}`
                    : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={clearSelection} accessibilityLabel="Cerrar detalle">
                <Ionicons name="close" size={22} color={Brand.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Puntuación */}
            {(() => {
              const rating = getBusinessRating(selected.id);
              const owner = isMyBusiness(selected.id);
              return (
                <View style={styles.ratingRow}>
                  <StarRating value={rating.average} count={rating.count} size={16} />
                  {!owner && (
                    <View style={styles.rateInline}>
                      <Text style={styles.rateLabel}>
                        {rating.myStars ? 'Tu voto:' : 'Puntuá:'}
                      </Text>
                      <StarRating
                        value={rating.myStars}
                        onRate={(stars) => handleRate(selected.id, stars)}
                        size={18}
                      />
                    </View>
                  )}
                </View>
              );
            })()}

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
                    <StarRating
                      value={getBusinessRating(item.business.id).average}
                      count={getBusinessRating(item.business.id).count}
                      size={12}
                    />
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
  chipsBar: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  chipsContent: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.xl,
    backgroundColor: Brand.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  filterChipActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  filterChipText: {
    fontFamily: Type.semibold,
    fontSize: 12.5,
    color: Brand.textSecondary,
  },
  filterChipTextActive: {
    color: '#ffffff',
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.border,
  },
  rateInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rateLabel: {
    fontFamily: Type.regular,
    fontSize: 12,
    color: Brand.textMuted,
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
