import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { useApp, Product } from '@/contexts/AppContext';

export default function AdminScreen() {
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productUnit, setProductUnit] = useState('el kilo');
  const [isLoading, setIsLoading] = useState(false);
  
  const { 
    isLoggedIn, 
    currentUser, 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    logout 
  } = useApp();

  useEffect(() => {
    if (!isLoggedIn || !currentUser) {
      router.replace('/login');
    }
  }, [isLoggedIn, currentUser]);

  // Obtener productos del negocio actual
  const myProducts = products.filter(p => p.business_id === currentUser?.business.id);

  const handleSubmit = async () => {
    if (!productName.trim() || !productPrice.trim()) {
      Alert.alert('Error', 'Por favor complete todos los campos');
      return;
    }

    const price = parseInt(productPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Por favor ingrese un precio válido');
      return;
    }

    setIsLoading(true);

    try {
      // Crear nuevo producto
      const newProduct: Product = {
        business_id: currentUser!.business.id,
        product: productName.toLowerCase().trim(),
        price: price,
        unit: productUnit,
        updated: new Date().toLocaleTimeString('es-AR')
      };

      // Verificar si ya existe y actualizar, o agregar nuevo
      const existingProduct = products.find(p => 
        p.business_id === currentUser!.business.id && 
        p.product === newProduct.product
      );

      if (existingProduct) {
        await updateProduct(newProduct);
      } else {
        await addProduct(newProduct);
      }
      
      // Limpiar formulario
      setProductName('');
      setProductPrice('');
      setProductUnit('el kilo');
      
      Alert.alert('Éxito', '✅ Precio cargado o actualizado con éxito.');
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Error al guardar el producto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productToDelete: Product) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Está seguro que desea eliminar "${productToDelete.product}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(productToDelete.business_id, productToDelete.product);
              Alert.alert('Éxito', 'Producto eliminado correctamente');
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Error al eliminar el producto');
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Está seguro que desea cerrar la sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar Sesión',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              console.error('Error logging out:', error);
            }
          }
        }
      ]
    );
  };

  if (!currentUser) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Cargando datos...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.adminContainer}>
        <ThemedText style={styles.title}>Panel de Administración de Precios</ThemedText>
        <ThemedText style={styles.businessDisplay}>
          Administrando: {currentUser.business.name} ({currentUser.business.id})
        </ThemedText>

        {/* Formulario de carga */}
        <ThemedView style={styles.formSection}>
          <ThemedView style={styles.formGroup}>
            <ThemedText style={styles.label}>Producto (ej: naranjas, café)</ThemedText>
            <TextInput
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="Ingrese el nombre del producto"
              placeholderTextColor="#999"
              editable={!isLoading}
            />
          </ThemedView>

          <ThemedView style={styles.formGroup}>
            <ThemedText style={styles.label}>Precio ($ARS)</ThemedText>
            <TextInput
              style={styles.input}
              value={productPrice}
              onChangeText={setProductPrice}
              placeholder="Ingrese el precio"
              placeholderTextColor="#999"
              keyboardType="numeric"
              editable={!isLoading}
            />
          </ThemedView>

          <ThemedView style={styles.formGroup}>
            <ThemedText style={styles.label}>Unidad de Medida</ThemedText>
            <ThemedView style={styles.pickerContainer}>
              <Picker
                selectedValue={productUnit}
                onValueChange={setProductUnit}
                style={styles.picker}
                enabled={!isLoading}
              >
                <Picker.Item label="el kilo" value="el kilo" />
                <Picker.Item label="la unidad" value="la unidad" />
                <Picker.Item label="el litro" value="el litro" />
                <Picker.Item label="la docena" value="la docena" />
                <Picker.Item label="el paquete" value="el paquete" />
              </Picker>
            </ThemedView>
          </ThemedView>

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <ThemedText style={styles.submitButtonText}>
              {isLoading ? 'Guardando...' : 'Cargar o Actualizar Precio'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Lista de productos */}
        <ThemedView style={styles.productListSection}>
          <ThemedText style={styles.sectionTitle}>Tus Productos Cargados</ThemedText>
          {myProducts.length > 0 ? (
            <ThemedView style={styles.productList}>
              {myProducts.map((product, index) => (
                <ThemedView key={index} style={styles.productItem}>
                  <ThemedView style={styles.productInfo}>
                    <ThemedText style={styles.productNameText}>{product.product}</ThemedText>
                    <ThemedText style={styles.productPriceText}>
                      ${product.price.toLocaleString('es-AR')} {product.unit}
                    </ThemedText>
                    <ThemedText style={styles.productUpdated}>
                      Actualizado: {product.updated}
                    </ThemedText>
                  </ThemedView>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteProduct(product)}
                  >
                    <ThemedText style={styles.deleteButtonText}>Eliminar</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              ))}
            </ThemedView>
          ) : (
            <ThemedText style={styles.emptyList}>
              No has cargado ningún producto aún.
            </ThemedText>
          )}
        </ThemedView>

        {/* Botones de acción */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <ThemedText style={styles.logoutButtonText}>Cerrar Sesión</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.push('/(tabs)')}
        >
          <ThemedText style={styles.backButtonText}>⬅️ Ir a la Vista de Clientes</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7f9',
  },
  adminContainer: {
    margin: 20,
    padding: 30,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#dc3545',
    paddingBottom: 10,
    marginBottom: 20,
  },
  businessDisplay: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    color: '#555',
  },
  formSection: {
    marginBottom: 30,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
  picker: {
    height: 50,
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productListSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  productList: {
    gap: 10,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#f4f4f4',
  },
  productInfo: {
    flex: 1,
  },
  productNameText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  productPriceText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: 'bold',
  },
  productUpdated: {
    fontSize: 12,
    color: '#6c757d',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 3,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyList: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#999',
    padding: 20,
  },
  logoutButton: {
    backgroundColor: '#f0ad4e',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 15,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
    padding: 10,
  },
  backButtonText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});