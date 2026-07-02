// Pestaña "Mi negocio": la puerta de entrada de los comerciantes.
// - Logueado con negocio: resumen + botón al panel de administración.
// - No logueado: invitación a ingresar o registrar el comercio.
// Reemplaza al viejo link "Acceso Negocios" escondido en el footer.

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useApp } from '@/contexts/AppContext';
import { Brand, Type, Radius, Spacing } from '@/constants/theme';

export default function MyBusinessScreen() {
  const { session, myBusiness, prices, authUser } = useApp();

  const myPricesCount = myBusiness
    ? prices.filter((p) => p.business_id === myBusiness.id).length
    : 0;

  if (session && myBusiness) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.businessIcon}>
            <Ionicons name="storefront-outline" size={26} color="#ffffff" />
          </View>
          <Text style={styles.businessName}>{myBusiness.name}</Text>
          <Text style={styles.businessMeta}>{myBusiness.address || 'Sin dirección cargada'}</Text>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{myPricesCount}</Text>
              <Text style={styles.statLabel}>precios cargados</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/admin')}>
            <Ionicons name="pricetags-outline" size={18} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Administrar mis precios</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (session && !myBusiness) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Tu cuenta no tiene un comercio</Text>
          <Text style={styles.subtitle}>
            Estás logueado como {authUser?.email}, pero no encontramos un comercio asociado.
            Entrá al panel para más detalles.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/admin')}>
            <Text style={styles.primaryButtonText}>Ir al panel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.businessIcon}>
          <Ionicons name="storefront-outline" size={26} color="#ffffff" />
        </View>
        <Text style={styles.title}>¿Tenés un comercio?</Text>
        <Text style={styles.subtitle}>
          Cargá tus precios y aparecé en el mapa de tu barrio. Los vecinos que buscan tus
          productos te van a encontrar.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/signup')}>
          <Text style={styles.primaryButtonText}>Registrar mi comercio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/login')}>
          <Text style={styles.secondaryButtonText}>Ya tengo cuenta — Ingresar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: Brand.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.border,
  },
  businessIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  businessName: {
    fontFamily: Type.bold,
    fontSize: 20,
    color: Brand.textPrimary,
    textAlign: 'center',
  },
  businessMeta: {
    fontFamily: Type.regular,
    fontSize: 13,
    color: Brand.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    marginVertical: Spacing.xl,
  },
  stat: {
    alignItems: 'center',
    backgroundColor: Brand.primaryFaint,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  statNumber: {
    fontFamily: Type.bold,
    fontSize: 24,
    color: Brand.primaryDark,
  },
  statLabel: {
    fontFamily: Type.regular,
    fontSize: 12,
    color: Brand.primaryDark,
  },
  title: {
    fontFamily: Type.bold,
    fontSize: 20,
    color: Brand.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Type.regular,
    fontSize: 13.5,
    color: Brand.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    alignSelf: 'stretch',
  },
  primaryButtonText: {
    fontFamily: Type.semibold,
    fontSize: 15,
    color: '#ffffff',
  },
  secondaryButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.primary,
  },
  secondaryButtonText: {
    fontFamily: Type.semibold,
    fontSize: 14,
    color: Brand.primary,
  },
});
