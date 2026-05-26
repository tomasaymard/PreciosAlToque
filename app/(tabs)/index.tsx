import React, { useState } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { useApp, PriceWithBusiness } from '@/contexts/AppContext';

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
      <ThemedText style={styles.updatedTime}>Actualizado: {formatUpdatedAt(item.updated_at)}</ThemedText>
    </ThemedView>
  </ThemedView>
);

export default function HomeScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<PriceWithBusiness[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { searchPrices, refresh, loading } = useApp();

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      Alert.alert('Atención', 'Por favor ingresá un producto para buscar.');
      return;
    }
    const searchResults = searchPrices(searchTerm);
    setResults(searchResults);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    // Si había una búsqueda activa, la repetimos con los datos frescos
    if (searchTerm.trim()) {
      setResults(searchPrices(searchTerm));
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
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <ThemedText style={styles.searchButtonText}>Buscar Precios</ThemedText>
        </TouchableOpacity>
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
            {results.map((item, index) => (
              <PriceCard
                key={item.id}
                item={item}
                isBestPrice={index === 0}
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

      {/* Map Section */}
      <ThemedView style={styles.mapSection}>
        <ThemedText style={styles.mapTitle}>Ubicación de Precios Cercanos</ThemedText>
        <ThemedView style={styles.mapContainer}>
          <ThemedView style={styles.mapView}>
            <ThemedText style={styles.mapPlaceholder}>
              [Simulación de un mapa interactivo]
            </ThemedText>
          </ThemedView>
        </ThemedView>
        <ThemedText style={styles.mapLegend}>
          Haga clic en un marcador para ver el precio.
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
  updatedTime: {
    fontSize: 12,
    color: '#6c757d',
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