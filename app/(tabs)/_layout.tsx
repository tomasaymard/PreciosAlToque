import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Brand, Type } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';

export default function TabLayout() {
  // La pestaña "Mi negocio" es solo para comerciantes: aparece únicamente
  // cuando hay sesión iniciada. Los clientes no tienen cuenta (por ahora),
  // así que para ellos la app es Mapa + Buscar. El comerciante entra la
  // primera vez por el link "¿Tenés un comercio?" de la pantalla Buscar.
  const { session } = useApp();

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
          title: 'Mi negocio',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="storefront-outline" color={color} />,
          // href: null saca la pestaña de la barra (la ruta sigue existiendo)
          href: session ? undefined : null,
        }}
      />
    </Tabs>
  );
}
