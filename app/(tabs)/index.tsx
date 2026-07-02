import React, { useState } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { useApp, PriceWithBusiness, SortBy } from '@/contexts/AppContext';
import { formatDistance } from '@/lib/geo';

interface PriceCardProps {
  item: PriceWithBusiness;
  isBestPrice: boolean;
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Hace instantes';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHs = Math.floor(diffMin / 60);
  if (diffHs < 24) return `Hace ${diffHs} h`;
  const diffDays = Math.floor(diffHs / 24);
  if (diffDays < 30) return `Hace ${diffDays} d`;
  return date.toLocaleDateString('es-AR');
}

const PriceCard: React.FC<PriceCardProps> = ({ item, isBestPrice }) => (
  <ThemedView style={[styles.storeCard, isBestPrice && styles.bestPrice]}>
    <ThemedView style={styles.namePrice}>
      <ThemedText style={styles.storeName}>{item.business.name}</ThemedText>
      <ThemedText style={styles.price}>${item.price.toLocaleString('es-AR')} {item.unit}</ThemedText>
    </ThemedView>
    <ThemedView style={styles.meta}>
      <ThemedText style={styles.address}>{item.business.address || 'Sin dirección'}</ThemedText>
      {item.distance != null && (
        <ThemedText style={styles.distance}>📍 a {formatDistance(item.distance)}</ThemedText>
      )}
    </ThemedView>
    <ThemedText style={styles.updatedTime}>Actualizado: {formatUpdatedAt(item.updated_at)}</ThemedText>
  </ThemedView>
);

export default function HomeScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<PriceWithBusiness[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('price');
  const { searchPrices, refresh, loading, userLocation, requestLocation } = useApp();

  const handleSearch = (overrideSort?: SortBy) => {
    if (!searchTerm.trim()) {
      Alert.alert('Atención', 'Por favor ingresá un producto para buscar.');
      return;
    }
    const searchResults = searchPrices(searchTerm, overrideSort ?? sortBy);
    setResults(searchResults);
  };

  const handleChangeSort = async (newSort: SortBy) => {
    // Guardamos las coords en una variable local: si acabamos de pedir la
    // ubicación, el estado del context todavía no llegó a este render
    // (stale closure). Pasarla explícita evita que el primer toque en
    // "Cercanía" no reordene nada.
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
    // Re-buscar con el nuevo orden si ya hay una búsqueda activa
    if (searchTerm.trim()) {
      setResults(searchPrices(searchTerm, newSort, loc));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    // Si había una búsqueda activa, la repetimos con los datos frescos
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
      <ThemedView style={styles.header}>
        <ThemedText style={styles.headerTitle}>🛒 Precios al Toque</ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          Encontrá el mejor precio cerca tuyo. Tu herramienta contra la inflación.
        </ThemedText>
      </ThemedView>

      {/* Search Section */}
      <ThemedView style={styles.searchSection}>
        <TextInput
          style={styles.productInput}
          placeholder="Ej: Bananas, Leche, Pan, etc."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#666"
          returnKeyType="search"
          onSubmitEditing={() => handleSearch()}
        />
        <TouchableOpacity style={styles.searchButton} onPress={() => handleSearch()}>
          <ThemedText style={styles.searchButtonText}>Buscar Precios</ThemedText>
        </TouchableOpacity>

        {/* Toggle de orden */}
        <ThemedView style={styles.sortRow}>
          <ThemedText style={styles.sortLabel}>Ordenar por:</ThemedText>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'price' && styles.sortButtonActive]}
            onPress={() => handleChangeSort('price')}
          >
            <ThemedText style={[styles.sortButtonText, sortBy === 'price' && styles.sortButtonTextActive]}>
              💲 Precio
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'distance' && styles.sortButtonActive]}
            onPress={() => handleChangeSort('distance')}
          >
            <ThemedText style={[styles.sortButtonText, sortBy === 'distance' && styles.sortButtonTextActive]}>
              📍 Cercanía
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>

      {/* Results Section */}
      <ThemedView style={styles.resultsSection}>
        <ThemedText style={styles.resultsTitle}>
          Resultados para: <ThemedText style={styles.searchTermDisplay}>{searchTerm.toUpperCase()}</ThemedText>
        </ThemedText>

        {loading ? (
          <ThemedView style={styles.placeholder}>
            <ThemedText style={styles.placeholderText}>Cargando precios...</ThemedText>
          </ThemedView>
        ) : results.length > 0 ? (
          <ThemedView style={styles.priceResults}>
            {results.map((item) => (
              <PriceCard
                key={item.id}
                item={item}
                // El resaltado amarillo marca al MÁS BARATO, sin importar el
                // orden elegido (por cercanía el primero puede no ser el más barato)
                isBestPrice={item.price === Math.min(...results.map((r) => r.price))}
              />
            ))}
          </ThemedView>
        ) : searchTerm ? (
          <ThemedView style={styles.placeholder}>
            <ThemedText style={styles.placeholderText}>
              😔 No se encontraron precios para &quot;{searchTerm}&quot;.
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={styles.placeholder}>
            <ThemedText style={styles.placeholderText}>
              Ingresá un producto y tocá Buscar. Deslizá hacia abajo para actualizar.
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      {/* Map Section — el mapa visual con marcadores llega en una próxima versión */}
      <ThemedView style={styles.mapSection}>
        <ThemedText style={styles.mapTitle}>Mapa de comercios</ThemedText>
        <ThemedView style={styles.mapContainer}>
          <ThemedView style={styles.mapView}>
            <ThemedText style={styles.mapPlaceholder}>
              🗺️ El mapa con los comercios marcados está en camino.
            </ThemedText>
          </ThemedView>
        </ThemedView>
        <ThemedText style={styles.mapLegend}>
          Por ahora podés ordenar los resultados por cercanía con el botón 📍.
        </ThemedText>
      </ThemedView>

      {/* Footer */}
      <ThemedView style={styles.footer}>
        <ThemedText style={styles.footerText}>
          © 2026 Precios al Toque. Datos cargados por vecinos y comercios.
        </ThemedText>
        <Link href="/login" style={styles.loginLink}>
          <ThemedText style={styles.loginLinkText}>Acceso Negocios</ThemedText>
        </Link>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7f9',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'white',
    fontStyle: 'italic',
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 5,
  },
  searchSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productInput: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  sortLabel: {
    fontSize: 13,
    color: '#6c757d',
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: 'white',
  },
  sortButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  sortButtonText: {
    fontSize: 13,
    color: '#555',
  },
  sortButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 10,
  },
  searchTermDisplay: {
    fontWeight: 'bold',
  },
  priceResults: {
    gap: 15,
  },
  storeCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 6,
    borderLeftWidth: 5,
    borderLeftColor: '#007bff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bestPrice: {
    borderLeftColor: '#ffc107',
    borderWidth: 1,
    borderColor: '#ffc107',
    backgroundColor: '#fffbe6',
  },
  namePrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  price: {
    fontSize: 18,
    color: '#dc3545',
    fontWeight: 'bold',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  address: {
    fontSize: 12,
    color: '#6c757d',
    flex: 1,
  },
  distance: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: 'bold',
  },
  updatedTime: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  placeholder: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  placeholderText: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
  },
  mapSection: {
    margin: 20,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 10,
  },
  mapContainer: {
    height: 200,
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  mapView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholder: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  mapLegend: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 5,
  },
  loginLink: {
    textDecorationLine: 'underline',
  },
  loginLinkText: {
    color: '#aaa',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});