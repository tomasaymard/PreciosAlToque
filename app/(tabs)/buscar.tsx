// Pestaña Buscar: búsqueda de un producto y comparación de precios entre
// comercios, ordenable por precio o cercanía. Look del sistema de diseño
// (Brand + Nunito), estructura según el mockup aprobado.

import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  View,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

import { useApp, PriceWithBusiness, SortBy } from '@/contexts/AppContext';
import { Brand, Type, Radius, Spacing } from '@/constants/theme';
import { formatDistance } from '@/lib/geo';

interface PriceCardProps {
  item: PriceWithBusiness;
  isBestPrice: boolean;
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'hace instantes';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHs = Math.floor(diffMin / 60);
  if (diffHs < 24) return `hace ${diffHs} h`;
  const diffDays = Math.floor(diffHs / 24);
  if (diffDays < 30) return `hace ${diffDays} d`;
  return date.toLocaleDateString('es-AR');
}

const PriceCard: React.FC<PriceCardProps> = ({ item, isBestPrice }) => (
  <View style={[styles.card, isBestPrice && styles.cardBest]}>
    {isBestPrice && (
      <View style={styles.bestBadge}>
        <Text style={styles.bestBadgeText}>Mejor precio</Text>
      </View>
    )}
    <View style={styles.cardRow}>
      <Text style={[styles.cardName, isBestPrice && styles.cardNameBest]} numberOfLines={1}>
        {item.business.name}
      </Text>
      <Text style={[styles.cardPrice, isBestPrice && styles.cardPriceBest]}>
        ${item.price.toLocaleString('es-AR')}
      </Text>
    </View>
    <View style={styles.cardRow}>
      <Text style={styles.cardMeta} numberOfLines={1}>
        {item.business.address || 'Sin dirección'}
        {item.distance != null ? ` · a ${formatDistance(item.distance)}` : ''}
      </Text>
      <Text style={styles.cardMeta}>{item.unit}</Text>
    </View>
    <View style={styles.cardFooter}>
      <Ionicons name="time-outline" size={13} color={Brand.textMuted} />
      <Text style={styles.cardUpdated}>Actualizado {formatUpdatedAt(item.updated_at)}</Text>
    </View>
  </View>
);

// Opciones del filtro de radio (en metros; null = sin límite)
const RADIUS_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Todos', value: null },
  { label: '1 km', value: 1000 },
  { label: '3 km', value: 3000 },
  { label: '10 km', value: 10000 },
];

export default function SearchScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<PriceWithBusiness[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('price');
  const [radius, setRadius] = useState<number | null>(null);
  const { searchPrices, refresh, loading, userLocation, requestLocation } = useApp();

  // Resultados visibles según el radio elegido. Los que no tienen distancia
  // (comercio sin coordenadas o sin permiso de ubicación) solo se muestran
  // cuando el radio es "Todos".
  const visibleResults =
    radius == null
      ? results
      : results.filter((r) => r.distance != null && r.distance <= radius);

  const handleSearch = (overrideSort?: SortBy) => {
    if (!searchTerm.trim()) {
      Alert.alert('Atención', 'Ingresá un producto para buscar.');
      return;
    }
    const searchResults = searchPrices(searchTerm, overrideSort ?? sortBy);
    setResults(searchResults);
  };

  const handleChangeSort = async (newSort: SortBy) => {
    // Coords en variable local para evitar el stale closure del primer
    // "ordenar por cercanía" después de otorgar el permiso.
    let loc = userLocation;
    if (newSort === 'distance' && !loc) {
      loc = await requestLocation();
      if (!loc) {
        Alert.alert(
          'Ubicación no disponible',
          'Para ordenar por cercanía necesitamos acceso a tu ubicación. Podés activarlo en los permisos de la app.'
        );
        return;
      }
    }
    setSortBy(newSort);
    if (searchTerm.trim()) {
      setResults(searchPrices(searchTerm, newSort, loc));
    }
  };

  const handleChangeRadius = async (newRadius: number | null) => {
    // Para filtrar por radio necesitamos la ubicación (mismo patrón que Cercanía)
    let loc = userLocation;
    if (newRadius != null && !loc) {
      loc = await requestLocation();
      if (!loc) {
        Alert.alert(
          'Ubicación no disponible',
          'Para filtrar por radio necesitamos acceso a tu ubicación. Podés activarlo en los permisos de la app.'
        );
        return;
      }
      // Recalcular distancias de la búsqueda activa con la ubicación recién obtenida
      if (searchTerm.trim()) {
        setResults(searchPrices(searchTerm, sortBy, loc));
      }
    }
    setRadius(newRadius);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    if (searchTerm.trim()) {
      setResults(searchPrices(searchTerm, sortBy));
    }
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Buscar precios</Text>
        <Text style={styles.headerSubtitle}>
          Compará entre los comercios de tu zona y encontrá el más barato.
        </Text>
      </View>

      {/* Buscador */}
      <View style={styles.searchSection}>
        <View style={styles.inputWrapper}>
          <Ionicons name="search-outline" size={18} color={Brand.textMuted} />
          <TextInput
            style={styles.productInput}
            placeholder="Ej: bananas, leche, pan"
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor={Brand.textMuted}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch()}
          />
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={() => handleSearch()}>
          <Text style={styles.searchButtonText}>Buscar precios</Text>
        </TouchableOpacity>

        {/* Orden */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Ordenar:</Text>
          <TouchableOpacity
            style={[styles.chip, sortBy === 'price' && styles.chipActive]}
            onPress={() => handleChangeSort('price')}
          >
            <Text style={[styles.chipText, sortBy === 'price' && styles.chipTextActive]}>
              Precio
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, sortBy === 'distance' && styles.chipActive]}
            onPress={() => handleChangeSort('distance')}
          >
            <Text style={[styles.chipText, sortBy === 'distance' && styles.chipTextActive]}>
              Cercanía
            </Text>
          </TouchableOpacity>
        </View>

        {/* Radio */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Radio:</Text>
          {RADIUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={[styles.chip, radius === opt.value && styles.chipActive]}
              onPress={() => handleChangeRadius(opt.value)}
            >
              <Text style={[styles.chipText, radius === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Resultados */}
      <View style={styles.resultsSection}>
        {searchTerm.trim() !== '' && (
          <Text style={styles.resultsTitle}>
            Resultados para <Text style={styles.resultsTerm}>{searchTerm.trim()}</Text>
          </Text>
        )}

        {loading ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Cargando precios...</Text>
          </View>
        ) : visibleResults.length > 0 ? (
          <View style={styles.results}>
            {visibleResults.map((item) => (
              <PriceCard
                key={item.id}
                item={item}
                isBestPrice={item.price === Math.min(...visibleResults.map((r) => r.price))}
              />
            ))}
          </View>
        ) : results.length > 0 && radius != null ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Hay precios para “{searchTerm}”, pero ninguno a menos de{' '}
              {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}. Probá ampliando el radio.
            </Text>
          </View>
        ) : searchTerm ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              No encontramos precios para “{searchTerm}”. Probá con otro nombre.
            </Text>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="pricetags-outline" size={26} color={Brand.textMuted} />
            <Text style={styles.placeholderText}>
              Escribí un producto y tocá Buscar. Deslizá hacia abajo para actualizar los datos.
            </Text>
          </View>
        )}
      </View>

      {/* Pie */}
      <View style={styles.footer}>
        <Link href="/login">
          <Text style={styles.merchantLink}>¿Tenés un comercio? Sumalo acá</Text>
        </Link>
        <Text style={styles.footerText}>Datos cargados por vecinos y comercios.</Text>
      </View>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl + Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  headerTitle: {
    fontFamily: Type.bold,
    fontSize: 24,
    color: '#ffffff',
  },
  headerSubtitle: {
    fontFamily: Type.regular,
    fontSize: 13,
    color: Brand.primaryFaint,
    marginTop: 2,
  },
  searchSection: {
    backgroundColor: Brand.surface,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  productInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontFamily: Type.regular,
    fontSize: 15,
    color: Brand.textPrimary,
  },
  searchButton: {
    backgroundColor: Brand.primary,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  searchButtonText: {
    fontFamily: Type.semibold,
    fontSize: 15,
    color: '#ffffff',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  sortLabel: {
    fontFamily: Type.regular,
    fontSize: 12.5,
    color: Brand.textMuted,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  chipActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  chipText: {
    fontFamily: Type.regular,
    fontSize: 12.5,
    color: Brand.textSecondary,
  },
  chipTextActive: {
    fontFamily: Type.semibold,
    color: '#ffffff',
  },
  resultsSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  resultsTitle: {
    fontFamily: Type.regular,
    fontSize: 14,
    color: Brand.textSecondary,
    marginBottom: Spacing.md,
  },
  resultsTerm: {
    fontFamily: Type.bold,
    color: Brand.textPrimary,
  },
  results: {
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Brand.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.border,
  },
  cardBest: {
    borderWidth: 2,
    borderColor: Brand.primaryLight,
    backgroundColor: Brand.primaryFaint,
  },
  bestBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Brand.primary,
    borderRadius: Radius.xl,
    paddingVertical: 3,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  bestBadgeText: {
    fontFamily: Type.semibold,
    fontSize: 10.5,
    color: '#ffffff',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.md,
  },
  cardName: {
    fontFamily: Type.semibold,
    fontSize: 15,
    color: Brand.textPrimary,
    flex: 1,
  },
  cardNameBest: {
    color: Brand.primaryDark,
  },
  cardPrice: {
    fontFamily: Type.bold,
    fontSize: 20,
    color: Brand.textPrimary,
  },
  cardPriceBest: {
    color: Brand.primaryDark,
  },
  cardMeta: {
    fontFamily: Type.regular,
    fontSize: 12,
    color: Brand.textSecondary,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  cardUpdated: {
    fontFamily: Type.regular,
    fontSize: 11.5,
    color: Brand.textMuted,
  },
  placeholder: {
    backgroundColor: Brand.surface,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.border,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  placeholderText: {
    fontFamily: Type.regular,
    fontSize: 13.5,
    color: Brand.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  merchantLink: {
    fontFamily: Type.semibold,
    fontSize: 13.5,
    color: Brand.primary,
    textDecorationLine: 'underline',
  },
  footerText: {
    fontFamily: Type.regular,
    fontSize: 11.5,
    color: Brand.textMuted,
  },
});
