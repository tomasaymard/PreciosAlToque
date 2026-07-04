import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router, Link } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Brand, Type, Radius } from '@/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { session, signIn } = useApp();

  useEffect(() => {
    if (session) {
      router.replace('/admin');
    }
  }, [session]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Atención', 'Por favor completá todos los campos.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        Alert.alert('Error al ingresar', error);
      }
      // Si fue exitoso, el useEffect de arriba redirige cuando session cambie
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error inesperado. Probá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.loginContainer}>
        <ThemedText style={styles.title}>Acceso para comercios</ThemedText>

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
          <ThemedText style={styles.label}>Contraseña</ThemedText>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Ingresá tu contraseña"
            placeholderTextColor={Brand.textMuted}
            secureTextEntry
            autoComplete="password"
            editable={!isLoading}
          />
        </ThemedView>

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <ThemedText style={styles.loginButtonText}>
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </ThemedText>
        </TouchableOpacity>

        <Link href="/signup" asChild>
          <TouchableOpacity style={styles.signupLink}>
            <ThemedText style={styles.signupLinkText}>
              ¿No tenés cuenta? Registrá tu comercio
            </ThemedText>
          </TouchableOpacity>
        </Link>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.background,
    justifyContent: 'center',
    padding: 20,
  },
  loginContainer: {
    backgroundColor: Brand.surface,
    padding: 32,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.border,
  },
  title: {
    fontSize: 20,
    fontFamily: Type.bold,
    color: Brand.textPrimary,
    textAlign: 'center',
    marginBottom: 30,
  },
  formGroup: {
    marginBottom: 20,
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
  loginButton: {
    backgroundColor: Brand.primary,
    padding: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: {
    backgroundColor: Brand.textMuted,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: Type.semibold,
  },
  signupLink: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 10,
  },
  signupLinkText: {
    color: Brand.primary,
    fontSize: 14,
    fontFamily: Type.semibold,
    textDecorationLine: 'underline',
  },
});
