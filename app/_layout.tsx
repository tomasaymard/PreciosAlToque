import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProvider } from '@/contexts/AppContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Tipografía de marca (Nunito). Hasta que carga, no renderizamos nada —
  // evita el "flash" de letra del sistema. En dispositivos reales tarda
  // milisegundos porque los archivos van empaquetados en la app.
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  // En nativo esperamos las fuentes (evita el "flash" de letra del sistema).
  // En web NO bloqueamos: el servidor nunca "carga" fuentes y dejaría el HTML
  // vacío; el navegador muestra la letra del sistema un instante y cambia.
  if (!fontsLoaded && Platform.OS !== 'web') {
    return null;
  }

  return (
    <AppProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="login" options={{ title: 'Acceso Comercios' }} />
          <Stack.Screen name="signup" options={{ title: 'Registrar Comercio' }} />
          <Stack.Screen name="admin" options={{ title: 'Administración' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AppProvider>
  );
}
