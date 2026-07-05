// Pantalla de registro. Dos tipos de cuenta:
// - Cliente: solo email + password. Sirve para puntuar comercios y (a futuro)
//   encargar productos.
// - Comercio: además pide nombre, dirección y ubicación, y crea el business.

import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Coords } from '@/lib/geo';
import { Brand, Type, Radius } from '@/constants/theme';

type AccountType = 'client' | 'merchant';

export default function SignupScreen() {
  const [accountType, setAccountType] = useState<AccountType>('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, signUpClient, requestLocation, userLocation } = useApp();

  const handleCaptureLocation = async () => {
    setCapturingLocation(true);
    try {
      const coords = await requestLocation();
      if (coords) {
        setCoords(coords);
        Alert.alert('Ubicación capturada', 'Tomamos tu ubicación actual como la del comercio.');
      } else {
        Alert.alert(
          'No pudimos obtener tu ubicación',
          'Revisá que el GPS esté activado y que le diste permiso de ubicación a la app.'
        );
      }
    } finally {
      setCapturingLocation(false);
    }
  };

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Atención', 'Email y contraseña son obligatorios.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Atención', 'La contraseña tiene que tener al menos 6 caracteres.');
      return;
    }
    if (accountType === 'merchant' && !businessName.trim()) {
      Alert.alert('Atención', 'El nombre del comercio es obligatorio.');
      return;
    }

    setIsLoading(true);
    try {
      const result =
        accountType === 'merchant'
          ? await signUp(email.trim(), password, businessName, address, coords ?? userLocation)
          : await signUpClient(email.trim(), password);

      if (result.error) {
        Alert.alert('No se pudo registrar', result.error);
        return;
      }

      if (result.needsEmailConfirmation) {
        Alert.alert(
          'Confirmá tu email',
          'Te enviamos un email para verificar tu cuenta. Hacé clic en el link y después volvé a ingresar.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
        return;
      }

      if (accountType === 'merchant') {
        Alert.alert('¡Bienvenido!', 'Tu comercio fue registrado. Ya podés cargar precios.', [
          { text: 'OK', onPress: () => router.replace('/admin') },
        ]);
      } else {
        Alert.alert('¡Listo!', 'Tu cuenta está creada. Ya podés puntuar comercios.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)') },
        ]);
      }
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error inesperado. Probá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.signupContainer}>
        <ThemedText style={styles.title}>Crear cuenta</ThemedText>

        {/* Selector de tipo de cuenta */}
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeOption, accountType === 'client' && styles.typeOptionActive]}
            onPress={() => setAccountType('client')}
            disabled={isLoading}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={accountType === 'client' ? Brand.primary : Brand.textMuted}
            />
            <Text style={[styles.typeText, accountType === 'client' && styles.typeTextActive]}>
              Soy vecino
            </Text>
            <Text style={styles.typeHint}>Busco y puntúo precios</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, accountType === 'merchant' && styles.typeOptionActive]}
            onPress={() => setAccountType('merchant')}
            disabled={isLoading}
          >
            <Ionicons
              name="storefront-outline"
              size={20}
              color={accountType === 'merchant' ? Brand.primary : Brand.textMuted}
            />
            <Text style={[styles.typeText, accountType === 'merchant' && styles.typeTextActive]}>
              Tengo un comercio
            </Text>
            <Text style={styles.typeHint}>Cargo mis precios</Text>
          </TouchableOpacity>
        </View>

        <ThemedView style={styles.formGroup}>
          <ThemedText style={styles.label}>Email</ThemedText>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            placeholderTextColor={Brand.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!isLoading}
          />
        </ThemedView>

        <ThemedView style={styles.formGroup}>
          <ThemedText style={styles.label}>Contraseña (mínimo 6 caracteres)</ThemedText>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Elegí una contraseña"
            placeholderTextColor={Brand.textMuted}
            secureTextEntry
            editable={!isLoading}
          />
        </ThemedView>

        {accountType === 'merchant' && (
          <>
            <ThemedView style={styles.formGroup}>
              <ThemedText style={styles.label}>Nombre del comercio</ThemedText>
              <TextInput
                style={styles.input}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Ej: Verdulería Don Pepe"
                placeholderTextColor={Brand.textMuted}
                editable={!isLoading}
              />
            </ThemedView>

            <ThemedView style={styles.formGroup}>
              <ThemedText style={styles.label}>Dirección (opcional)</ThemedText>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Ej: Av. Corrientes 3000"
                placeholderTextColor={Brand.textMuted}
                editable={!isLoading}
              />
            </ThemedView>

            <ThemedView style={styles.formGroup}>
              <ThemedText style={styles.label}>Ubicación del comercio</ThemedText>
              <ThemedText style={styles.locationHint}>
                Para que los vecinos te encuentren por cercanía, capturá la ubicación
                parándote en tu comercio.
              </ThemedText>
              <TouchableOpacity
                style={[styles.locationButton, coords && styles.locationButtonDone]}
                onPress={handleCaptureLocation}
                disabled={capturingLocation || isLoading}
              >
                <ThemedText style={styles.locationButtonText}>
                  {capturingLocation
                    ? 'Obteniendo ubicación...'
                    : coords
                    ? '✓ Ubicación capturada (tocá para volver a tomarla)'
                    : '📍 Usar mi ubicación actual'}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </>
        )}

        <TouchableOpacity
          style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
          onPress={handleSignup}
          disabled={isLoading}
        >
          <ThemedText style={styles.signupButtonText}>
            {isLoading ? 'Registrando...' : 'Crear cuenta'}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.replace('/login')}
        >
          <ThemedText style={styles.backLinkText}>← Volver al login</ThemedText>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  signupContainer: {
    backgroundColor: Brand.surface,
    padding: 28,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.border,
  },
  title: {
    fontSize: 22,
    fontFamily: Type.bold,
    color: Brand.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Brand.border,
    gap: 4,
  },
  typeOptionActive: {
    borderColor: Brand.primary,
    backgroundColor: Brand.primaryFaint,
  },
  typeText: {
    fontFamily: Type.semibold,
    fontSize: 13.5,
    color: Brand.textSecondary,
    textAlign: 'center',
  },
  typeTextActive: {
    color: Brand.primaryDark,
  },
  typeHint: {
    fontFamily: Type.regular,
    fontSize: 11,
    color: Brand.textMuted,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontFamily: Type.semibold,
    color: Brand.textSecondary,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    padding: 12,
    fontSize: 16,
    fontFamily: Type.regular,
    color: Brand.textPrimary,
  },
  locationHint: {
    fontSize: 12,
    fontFamily: Type.regular,
    color: Brand.textMuted,
    marginBottom: 8,
  },
  locationButton: {
    borderWidth: 1.5,
    borderColor: Brand.primary,
    borderRadius: Radius.md,
    padding: 12,
    alignItems: 'center',
    backgroundColor: Brand.primaryFaint,
  },
  locationButtonDone: {
    borderColor: Brand.primaryLight,
    backgroundColor: Brand.primaryFaint,
  },
  locationButtonText: {
    fontSize: 14,
    fontFamily: Type.semibold,
    color: Brand.primaryDark,
    textAlign: 'center',
  },
  signupButton: {
    backgroundColor: Brand.primary,
    padding: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonDisabled: {
    backgroundColor: Brand.textMuted,
  },
  signupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: Type.semibold,
  },
  backLink: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 10,
  },
  backLinkText: {
    color: Brand.primary,
    fontSize: 14,
    fontFamily: Type.semibold,
  },
});
