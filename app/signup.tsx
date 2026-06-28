// Pantalla de registro para comerciantes que quieren publicar precios.
//
// Flujo:
// 1. Pide email + password + nombre del comercio + dirección + ubicación.
// 2. Llama a signUp() del AppContext, que internamente:
//    - Crea la cuenta en Supabase Auth
//    - Crea el row del business con owner_id = nuevo user id y lat/lon
// 3. Si Supabase tiene "Confirm email" activado (default), no hay sesión
//    activa después de signUp — avisamos al usuario que confirme su mail.
//    Si está desactivado (recomendado en desarrollo), redirigimos al panel admin.

import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Coords } from '@/lib/geo';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, requestLocation, userLocation } = useApp();

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
    if (!email.trim() || !password.trim() || !businessName.trim()) {
      Alert.alert('Atención', 'Email, contraseña y nombre del comercio son obligatorios.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Atención', 'La contraseña tiene que tener al menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const { error, needsEmailConfirmation } = await signUp(
        email.trim(),
        password,
        businessName,
        address,
        coords ?? userLocation
      );

      if (error) {
        Alert.alert('No se pudo registrar', error);
        return;
      }

      if (needsEmailConfirmation) {
        Alert.alert(
          'Confirmá tu email',
          'Te enviamos un email para verificar tu cuenta. Hacé clic en el link y después volvé a ingresar.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
        return;
      }

      // Login automático, vamos al admin
      Alert.alert(
        '¡Bienvenido!',
        'Tu comercio fue registrado. Ya podés cargar precios.',
        [{ text: 'OK', onPress: () => router.replace('/admin') }]
      );
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error inesperado. Probá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.signupContainer}>
        <ThemedText style={styles.title}>Registrá tu Comercio</ThemedText>
        <ThemedText style={styles.subtitle}>
          Los datos de tu comercio van a ser visibles para todos los vecinos que busquen precios.
        </ThemedText>

        <ThemedView style={styles.formGroup}>
          <ThemedText style={styles.label}>Email</ThemedText>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            placeholderTextColor="#999"
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
            placeholderTextColor="#999"
            secureTextEntry
            editable={!isLoading}
          />
        </ThemedView>

        <ThemedView style={styles.formGroup}>
          <ThemedText style={styles.label}>Nombre del comercio</ThemedText>
          <TextInput
            style={styles.input}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Ej: Verdulería Don Pepe"
            placeholderTextColor="#999"
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
            placeholderTextColor="#999"
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
    backgroundColor: '#f4f7f9',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  signupContainer: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#28a745',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    fontStyle: 'italic',
  },
  formGroup: {
    marginBottom: 18,
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
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  locationHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  locationButton: {
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#eaf3ff',
  },
  locationButtonDone: {
    borderColor: '#28a745',
    backgroundColor: '#eafbef',
  },
  locationButtonText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  signupButton: {
    backgroundColor: '#28a745',
    padding: 14,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  signupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backLink: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 10,
  },
  backLinkText: {
    color: '#007bff',
    fontSize: 14,
  },
});
