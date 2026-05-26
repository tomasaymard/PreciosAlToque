// Cliente único de Supabase para toda la app.
//
// Por qué cada cosa:
// - 'react-native-url-polyfill/auto': React Native trae una implementación
//   incompleta de la API URL; supabase-js la usa internamente, sin el polyfill
//   tira errores raros.
// - storage: AsyncStorage. Es donde Supabase guarda el access token / refresh
//   token de la sesión del usuario logueado, así no tiene que volver a loguearse
//   cada vez que abre la app.
// - autoRefreshToken: true. El token de acceso dura 1 hora; con esto el cliente
//   lo renueva solo usando el refresh token.
// - persistSession: true. Guarda la sesión entre reinicios de la app.
// - detectSessionInUrl: false. Esa opción es para apps web que reciben el
//   token en el querystring del navegador. En mobile no aplica.
// - AppState listener: cuando la app vuelve del background, le pedimos a
//   Supabase que reanude el auto-refresh (lo pausa cuando la app no está activa
//   para no gastar batería).

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan variables de entorno EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_KEY. ' +
    'Revisá el archivo .env en la raíz del proyecto.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Reanuda el auto-refresh cuando la app vuelve del background
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
