import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { useApp, Price } from '@/contexts/AppContext';
import { CATEGORIES } from '@/lib/categories';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';
import { Brand, Type, Radius } from '@/constants/theme';

export default function AdminScreen() {
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productUnit, setProductUnit] = useState('el kilo');
  const [productCategory, setProductCategory] = useState<string | null>(null);
  const [productSubcategory, setProductSubcategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  const {
    session,
    authUser,
    myBusiness,
    prices,
    upsertPrice,
    deletePrice,
    updateMyBusinessLocation,
    updateMyBusinessCategory,
    requestLocation,
    signOut,
    loading,
  } = useApp();

  const hasLocation = myBusiness?.lat != null && myBusiness?.lon != null;

  const handleSaveLocation = async () => {
    setSavingLocation(true);
    try {
      const coords = await requestLocation();
      if (!coords) {
        Alert.alert(
          'Ubicación no disponible',
          'Activá el GPS y el permiso de ubicación, parate en tu comercio y probá de nuevo.'
        );
        return;
      }
      await updateMyBusinessLocation(coords);
      Alert.alert('Listo', 'Tu comercio ya aparece en el mapa en esta ubicación.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo guardar la ubicación.');
    } finally {
      setSavingLocation(false);
    }
  };

  useEffect(() => {
    // Si no está logueado, mandamos al login
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [session, loading]);

  // Precios cargados por el comercio del usuario actual
  const myPrices = myBusiness
    ? prices.filter((p) => p.business_id === myBusiness.id)
    : [];

  const handleSubmit = async () => {
    if (!productName.trim() || !productPrice.trim()) {
      Alert.alert('Atención', 'Completá nombre del producto y precio.');
      return;
    }

    const price = parseFloat(productPrice.replace(',', '.'));
    if (isNaN(price) || price <= 0) {
      Alert.alert('Atención', 'Ingresá un precio válido (número mayor a 0).');
      return;
    }

    if (!myBusiness) {
      Alert.alert(
        'Error',
        'No encontramos un comercio asociado a tu cuenta. Cerrá sesión y registrate de nuevo.'
      );
      return;
    }

    setIsLoading(true);
    try {
      await upsertPrice(productName, price, productUnit, productCategory, productSubcategory);
      setProductName('');
      setProductPrice('');
      setProductUnit('el kilo');
      setProductCategory(null);
      setProductSubcategory(null);
      Alert.alert('Listo', 'Precio cargado o actualizado con éxito.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo guardar el precio.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePrice = async (priceToDelete: Price) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Seguro que querés eliminar "${priceToDelete.product_name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePrice(priceToDelete.id);
              Alert.alert('Listo', 'Precio eliminado.');
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'No se pudo eliminar.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Querés cerrar tu sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  if (loading || !session) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={{ padding: 20 }}>Cargando...</ThemedText>
      </ThemedView>
    );
  }

  if (!myBusiness) {
    // El usuario está logueado pero no tiene un negocio asociado.
    // Esto puede pasar si confirmó el email y aún no completamos el alta del business.
    return (
      <ScrollView style={styles.container}>
        <ThemedView style={styles.adminContainer}>
          <ThemedText style={styles.title}>Tu cuenta no tiene un comercio asociado</ThemedText>
          <ThemedText style={styles.businessDisplay}>
            Email: {authUser?.email}
          </ThemedText>
          <ThemedText style={[styles.businessDisplay, { marginBottom: 20 }]}>
            Esto puede pasar si confirmaste tu email después de registrarte. Por
            ahora cerrá sesión y volvé a registrar tu comercio.
          </ThemedText>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <ThemedText style={styles.logoutButtonText}>Cerrar sesión</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.adminContainer}>
        <ThemedText style={styles.title}>Panel de Administración de Precios</ThemedText>
        <ThemedText style={styles.businessDisplay}>
          Administrando: {myBusiness.name}
        </ThemedText>

        {/* Ubicación del comercio en el mapa */}
        <ThemedView style={[styles.locationBox, hasLocation ? styles.locationBoxOk : styles.locationBoxMissing]}>
          <ThemedText style={styles.locationText}>
            {hasLocation
              ? '📍 Tu comercio aparece en el mapa.'
              : '⚠️ Tu comercio todavía no tiene ubicación: no aparece en el mapa.'}
          </ThemedText>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleSaveLocation}
            disabled={savingLocation}
          >
            <ThemedText style={styles.locationButtonText}>
              {savingLocation
                ? 'Guardando ubicación...'
                : hasLocation
                ? 'Actualizar ubicación (parate en tu comercio)'
                : 'Usar mi ubicación actual (parate en tu comercio)'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Rubro del comercio */}
        <ThemedView style={styles.formGroup}>
          <ThemedText style={styles.label}>Rubro</ThemedText>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((c) => {
              const active = myBusiness.category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={async () => {
                    try {
                      await updateMyBusinessCategory(c.key);
                    } catch (e: any) {
                      Alert.alert('Error', e?.message || 'No se pudo guardar el rubro.');
                    }
                  }}
                >
                  <Ionicons
                    name={c.icon as any}
                    size={15}
                    color={active ? '#ffffff' : Brand.textSecondary}
                  />
                  <ThemedText style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                    {c.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </ThemedView>

        {/* Formulario de carga */}
        <ThemedView style={styles.formSection}>
          <ThemedView style={styles.formGroup}>
            <ThemedText style={styles.label}>Producto (ej: naranjas, café)</ThemedText>
            <TextInput
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="Ingrese el nombre del producto"
              placeholderTextColor={Brand.textMuted}
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
              placeholderTextColor={Brand.textMuted}
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

          {/* Categoría del producto (opcional) */}
          <ThemedView style={styles.formGroup}>
            <ThemedText style={styles.label}>Categoría (opcional)</ThemedText>
            <View style={styles.categoryGrid}>
              {PRODUCT_CATEGORIES.map((c) => {
                const active = productCategory === c.key;
                return (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                    onPress={() => {
                      if (active) {
                        setProductCategory(null);
                        setProductSubcategory(null);
                      } else {
                        setProductCategory(c.key);
                        setProductSubcategory(null);
                      }
                    }}
                    disabled={isLoading}
                  >
                    <Ionicons
                      name={c.icon as any}
                      size={14}
                      color={active ? '#ffffff' : Brand.textSecondary}
                    />
                    <ThemedText style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                      {c.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ThemedView>

          {/* Subcategoría, si la categoría elegida tiene */}
          {productCategory &&
            (PRODUCT_CATEGORIES.find((c) => c.key === productCategory)?.subcategories.length ?? 0) > 0 && (
              <ThemedView style={styles.formGroup}>
                <ThemedText style={styles.label}>Tipo</ThemedText>
                <View style={styles.categoryGrid}>
                  {PRODUCT_CATEGORIES.find((c) => c.key === productCategory)!.subcategories.map((s) => {
                    const active = productSubcategory === s.key;
                    return (
                      <TouchableOpacity
                        key={s.key}
                        style={[styles.categoryChip, active && styles.categoryChipActive]}
                        onPress={() => setProductSubcategory(active ? null : s.key)}
                        disabled={isLoading}
                      >
                        <ThemedText
                          style={[styles.categoryChipText, active && styles.categoryChipTextActive]}
                        >
                          {s.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ThemedView>
            )}

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
          {myPrices.length > 0 ? (
            <ThemedView style={styles.productList}>
              {myPrices.map((price) => (
                <ThemedView key={price.id} style={styles.productItem}>
                  <ThemedView style={styles.productInfo}>
                    <ThemedText style={styles.productNameText}>{price.product_name}</ThemedText>
                    <ThemedText style={styles.productPriceText}>
                      ${price.price.toLocaleString('es-AR')} {price.unit}
                    </ThemedText>
                    <ThemedText style={styles.productUpdated}>
                      Actualizado: {new Date(price.updated_at).toLocaleString('es-AR')}
                    </ThemedText>
                  </ThemedView>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeletePrice(price)}
                  >
                    <ThemedText style={styles.deleteButtonText}>Eliminar</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              ))}
            </ThemedView>
          ) : (
            <ThemedText style={styles.emptyList}>
              No cargaste ningún producto todavía.
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
    backgroundColor: Brand.background,
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
    fontFamily: Type.bold,
    color: Brand.textPrimary,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Brand.primary,
    paddingBottom: 10,
    marginBottom: 20,
  },
  businessDisplay: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    color: Brand.textSecondary,
  },
  locationBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 25,
    borderWidth: 1,
  },
  locationBoxOk: {
    backgroundColor: Brand.primaryFaint,
    borderColor: Brand.primaryLight,
  },
  locationBoxMissing: {
    backgroundColor: Brand.accentFaint,
    borderColor: Brand.accent,
  },
  locationText: {
    fontSize: 13,
    color: Brand.textSecondary,
    marginBottom: 10,
  },
  locationButton: {
    backgroundColor: Brand.primary,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  locationButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Brand.border,
  },
  categoryChipActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  categoryChipText: {
    fontFamily: Type.regular,
    fontSize: 12.5,
    color: Brand.textSecondary,
  },
  categoryChipTextActive: {
    fontFamily: Type.semibold,
    color: '#ffffff',
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
    color: Brand.textSecondary,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    color: Brand.textPrimary,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 4,
  },
  picker: {
    height: 50,
  },
  submitButton: {
    backgroundColor: Brand.primary,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: Brand.textMuted,
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
    color: Brand.textPrimary,
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
    color: Brand.textPrimary,
  },
  productPriceText: {
    fontSize: 14,
    color: Brand.primary,
    fontWeight: 'bold',
  },
  productUpdated: {
    fontSize: 12,
    color: Brand.textMuted,
  },
  deleteButton: {
    backgroundColor: Brand.danger,
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
    color: Brand.textMuted,
    padding: 20,
  },
  logoutButton: {
    backgroundColor: Brand.accent,
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
    color: Brand.primary,
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});