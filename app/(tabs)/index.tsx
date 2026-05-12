import React, { useState } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { useApp, BUSINESSES } from '@/contexts/AppContext';

interface ProductCardProps {
  product: any;
  business: any;
  isBestPrice: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, business, isBestPrice }) => (
  <ThemedView style={[styles.storeCard, isBestPrice && styles.bestPrice]}>
    <ThemedView style={styles.namePrice}>
      <ThemedText style={styles.storeName}>{business?.name || 'Negocio Desconocido'}</ThemedText>
      <ThemedText style={styles.price}>${product.price.toLocaleString('es-AR')} {product.unit}</ThemedText>
    </ThemedView>
    <ThemedView style={styles.meta}>
      <ThemedText style={styles.address}>{business?.address || 'N/A'}</ThemedText>
      <ThemedText style={styles.updatedTime}>Actualizado: {product.updated}</ThemedText>
    </ThemedView>
  </ThemedView>
);

export default function HomeScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const { searchProducts } = useApp();

  const searchPrices = () => {
    if (!searchTerm.trim()) {
      Alert.alert('Error', 'Por favor ingresa un producto para buscar');
      return;
    }

    const searchResults = searchProducts(searchTerm);
    setResults(searchResults);
  };

  return (
    <ScrollView style={styles.container}>
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
        />
        <TouchableOpacity style={styles.searchButton} onPress={searchPrices}>
          <ThemedText style={styles.searchButtonText}>Buscar Precios</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Results Section */}
      <ThemedView style={styles.resultsSection}>
        <ThemedText style={styles.resultsTitle}>
          Resultados para: <ThemedText style={styles.searchTermDisplay}>{searchTerm.toUpperCase()}</ThemedText>
        </ThemedText>
        
        {results.length > 0 ? (
          <ThemedView style={styles.priceResults}>
            {results.map((product, index) => {
              const business = BUSINESSES.find(b => b.id === product.business_id);
              return (
                <ProductCard
                  key={`${product.business_id}-${product.product}`}
                  product={product}
                  business={business}
                  isBestPrice={index === 0}
                />
              );
            })}
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
              Ingresa un producto y presiona Buscar.
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