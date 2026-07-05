import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Brand, Type } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';

export default function TabLayout() {
  // La última pestaña aparece solo con sesión iniciada, y se adapta:
  // - Comerciante (tiene comercio): "Mi negocio" (ícono de local).
  // - Cliente (sin comercio): "Mi cuenta" (ícono de persona).
  // Sin sesión, la pestaña se oculta (href: null); el comerciante entra la
  // primera vez por el link "¿Tenés un comercio?" de la pantalla Buscar.
  const { session, myBusiness } = useApp();
  const isMerchant = !!myBusiness;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: Brand.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontFamily: Type.semibold, fontSize: 11 },
        tabBarStyle: { backgroundColor: Brand.surface },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="map-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="buscar"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="search-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="mi-negocio"
        options={{
          title: isMerchant ? 'Mi negocio' : 'Mi cuenta',
          tabBarIcon: ({ color }) => (
            <Ionicons
              size={24}
              name={isMerchant ? 'storefront-outline' : 'person-outline'}
              color={color}
            />
          ),
          // href: null saca la pestaña de la barra (la ruta sigue existiendo)
          href: session ? undefined : null,
        }}
      />
    </Tabs>
  );
}
