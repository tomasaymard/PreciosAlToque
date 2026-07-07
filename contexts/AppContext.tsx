// AppContext — estado compartido de la app.
//
// Migración Fase 2: ahora todo viene de Supabase en lugar de AsyncStorage.
// - Los negocios y precios se leen de las tablas `businesses` y `prices`.
// - El login usa Supabase Auth (email + password), no más usuarios hardcoded.
// - Los precios se crean/actualizan/borran con upsert/delete contra Supabase,
//   y las RLS policies de la DB se encargan de que un comerciante solo pueda
//   tocar sus propios precios.
//
// El componente <AppProvider> envuelve a toda la app (ver app/_layout.tsx)
// y expone su estado con el hook useApp().

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AppState } from 'react-native';
import { Session, User as AuthUser } from '@supabase/supabase-js';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { Coords, distanceInMeters } from '@/lib/geo';

// ---------------------------------------------------------------------
// Tipos que matchean el schema de Supabase
// ---------------------------------------------------------------------

export interface Business {
  id: string;
  owner_id: string | null;
  name: string;
  address: string | null;
  lat: number | null;
  lon: number | null;
  category: string | null;
  created_at: string;
}

export interface Price {
  id: string;
  business_id: string;
  product_name: string;
  price: number;
  unit: string;
  category: string | null;
  subcategory: string | null;
  updated_at: string;
}

export interface Rating {
  id: string;
  business_id: string;
  user_id: string;
  stars: number;
  updated_at: string;
}

// Resumen de puntuación de un comercio, listo para mostrar
export interface BusinessRating {
  average: number | null; // null si nadie puntuó todavía
  count: number;
  myStars: number | null; // la puntuación del usuario logueado, si existe
}

// Resultado de búsqueda: precio + el negocio que lo cargó, todo en un objeto.
// distance es la distancia en metros al usuario, o null si no tenemos su
// ubicación o el comercio no tiene coordenadas cargadas.
export interface PriceWithBusiness extends Price {
  business: Business;
  distance: number | null;
}

export type SortBy = 'price' | 'distance';

export type LocationPermission = 'unknown' | 'granted' | 'denied';

interface AppContextType {
  // Carga inicial
  loading: boolean;

  // Datos
  businesses: Business[];
  prices: Price[];
  refresh: () => Promise<void>;

  // Auth
  session: Session | null;
  authUser: AuthUser | null;
  /** El negocio del usuario logueado, o null si no está logueado o no tiene negocio asociado */
  myBusiness: Business | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    businessName: string,
    address: string,
    coords?: Coords | null,
    category?: string | null
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  /** Registro de cliente: cuenta sin comercio asociado, para puntuar y (a futuro) encargar */
  signUpClient: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;

  // CRUD de precios (solo el dueño del negocio puede; lo enforzan las RLS)
  upsertPrice: (
    productName: string,
    price: number,
    unit: string,
    category?: string | null,
    subcategory?: string | null
  ) => Promise<void>;
  deletePrice: (priceId: string) => Promise<void>;
  /** Fija/actualiza la ubicación del comercio del usuario logueado */
  updateMyBusinessLocation: (coords: Coords) => Promise<void>;
  /** Fija/actualiza el rubro del comercio del usuario logueado */
  updateMyBusinessCategory: (category: string) => Promise<void>;

  // Puntuaciones (estrellas)
  /** Resumen de puntuación de un comercio (promedio, cantidad, mi voto) */
  getBusinessRating: (businessId: string) => BusinessRating;
  /** Guarda/actualiza la puntuación del usuario logueado para un comercio */
  rateBusiness: (businessId: string, stars: number) => Promise<void>;
  /** true si el usuario logueado es el dueño de ese comercio (no puede autopuntuarse) */
  isMyBusiness: (businessId: string) => boolean;

  // Ubicación del usuario
  userLocation: Coords | null;
  locationPermission: LocationPermission;
  /** Pide permiso (si hace falta) y obtiene la ubicación actual. Devuelve las coords, o null si no las consiguió. */
  requestLocation: () => Promise<Coords | null>;

  // Búsqueda. sortBy 'distance' solo tiene efecto si hay ubicación.
  // locationOverride permite pasar coords recién obtenidas sin esperar a que
  // el estado del context se propague (evita un stale closure en el primer
  // "ordenar por cercanía" después de otorgar el permiso).
  searchPrices: (term: string, sortBy?: SortBy, locationOverride?: Coords | null) => PriceWithBusiness[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ---------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [locationPermission, setLocationPermission] = useState<LocationPermission>('unknown');

  const authUser = session?.user ?? null;
  // Buscamos el negocio del usuario logueado dentro de la lista que ya tenemos cargada,
  // así no hacemos otra query al servidor.
  const myBusiness = authUser
    ? businesses.find((b) => b.owner_id === authUser.id) ?? null
    : null;

  // Trae negocios, precios y puntuaciones desde Supabase. Se llama al montar y
  // después de cualquier cambio (login, signup, upsert, delete, rate).
  const refresh = useCallback(async (): Promise<void> => {
    const [businessesRes, pricesRes, ratingsRes] = await Promise.all([
      supabase.from('businesses').select('*').order('name'),
      supabase.from('prices').select('*').order('updated_at', { ascending: false }),
      supabase.from('ratings').select('*'),
    ]);

    if (businessesRes.error) {
      console.error('Error cargando negocios:', businessesRes.error.message);
    } else {
      setBusinesses(businessesRes.data || []);
    }

    if (pricesRes.error) {
      console.error('Error cargando precios:', pricesRes.error.message);
    } else {
      setPrices(pricesRes.data || []);
    }

    // La tabla ratings puede no existir todavía (si no corrieron el SQL); no
    // rompemos la app por eso, solo dejamos las puntuaciones vacías.
    if (ratingsRes.error) {
      console.warn('Puntuaciones no disponibles:', ratingsRes.error.message);
    } else {
      setRatings(ratingsRes.data || []);
    }
  }, []);

  // Carga inicial de datos
  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Recargar datos cuando la app vuelve del fondo: si un comerciante cambió
  // un precio mientras tanto, el vecino lo ve sin tener que refrescar a mano.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
      }
    });
    return () => sub.remove();
  }, [refresh]);

  // Sincronización con el estado de auth de Supabase
  useEffect(() => {
    // Sesión actual (puede haber una persistida en AsyncStorage de un login previo)
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });

    // Escuchar cambios futuros (login, logout, refresh de token)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Pide permiso de ubicación (si todavía no fue otorgado) y obtiene la posición.
  // Devuelve las coordenadas, o null si no las consiguió.
  const requestLocation = useCallback(async (): Promise<Coords | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermission('denied');
        return null;
      }
      setLocationPermission('granted');
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: Coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      setUserLocation(coords);
      return coords;
    } catch (e) {
      console.error('Error obteniendo ubicación:', e);
      return null;
    }
  }, []);

  // Intento no intrusivo al arrancar: si el permiso ya estaba otorgado de antes,
  // obtenemos la ubicación sin volver a preguntar. Si no, no molestamos todavía
  // (se la pedimos cuando el usuario toque "ordenar por cercanía").
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission('granted');
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        } catch (e) {
          console.error('Error obteniendo ubicación inicial:', e);
        }
      }
    })();
  }, []);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: translateAuthError(error.message) };
    }
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    businessName: string,
    address: string,
    coords?: Coords | null,
    category?: string | null
  ): Promise<{ error: string | null; needsEmailConfirmation: boolean }> => {
    // 1. Crear la cuenta de usuario en Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { error: translateAuthError(error.message), needsEmailConfirmation: false };
    }
    if (!data.user) {
      return { error: 'No se pudo crear la cuenta.', needsEmailConfirmation: false };
    }

    // Si Supabase tiene "Confirm email" activado, signUp no crea sesión —
    // el usuario tiene que clickear el link del mail antes de poder hacer nada.
    // En ese caso, NO podemos crear el negocio acá porque la RLS lo va a
    // rechazar (auth.uid() es null). Avisamos para que el usuario confirme y
    // después complete el alta en otra pantalla, o desactivá email confirmation
    // en el dashboard de Supabase para desarrollo.
    if (!data.session) {
      return {
        error: null,
        needsEmailConfirmation: true,
      };
    }

    // 2. Crear el negocio asociado (auth.uid() ya es el nuevo usuario)
    const { error: businessError } = await supabase.from('businesses').insert({
      owner_id: data.user.id,
      name: businessName.trim(),
      address: address.trim() || null,
      lat: coords?.lat ?? null,
      lon: coords?.lon ?? null,
      category: category ?? null,
    });

    if (businessError) {
      return {
        error: 'Cuenta creada, pero no se pudo crear el negocio: ' + businessError.message,
        needsEmailConfirmation: false,
      };
    }

    // 3. Refrescar para que aparezca el negocio recién creado en la lista
    await refresh();

    return { error: null, needsEmailConfirmation: false };
  };

  const signUpClient = async (
    email: string,
    password: string
  ): Promise<{ error: string | null; needsEmailConfirmation: boolean }> => {
    // Cuenta de cliente: solo crea el usuario, sin negocio asociado. Le sirve
    // para puntuar comercios y, a futuro, encargar productos.
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { error: translateAuthError(error.message), needsEmailConfirmation: false };
    }
    if (!data.session) {
      return { error: null, needsEmailConfirmation: true };
    }
    return { error: null, needsEmailConfirmation: false };
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  const upsertPrice = async (
    productName: string,
    price: number,
    unit: string,
    category?: string | null,
    subcategory?: string | null
  ): Promise<void> => {
    if (!myBusiness) {
      throw new Error('No tenés un negocio asociado a tu cuenta.');
    }

    // El trigger en la DB normaliza product_name a minúsculas y trim.
    // El unique index (business_id, product_name) hace que el upsert
    // reemplace si ya hay un precio para ese producto en este negocio.
    const payload = {
      business_id: myBusiness.id,
      product_name: productName,
      price,
      unit,
      category: category ?? null,
      subcategory: subcategory ?? null,
    };

    let { error } = await supabase
      .from('prices')
      .upsert(payload, { onConflict: 'business_id,product_name' });

    // Tolerancia: si la DB todavía no tiene las columnas de categoría (no
    // corrieron product_categories.sql), reintentamos sin ellas para no
    // bloquear la carga de precios.
    if (error && /category/i.test(error.message) && /column|schema/i.test(error.message)) {
      const { category: _c, subcategory: _s, ...withoutCategories } = payload;
      ({ error } = await supabase
        .from('prices')
        .upsert(withoutCategories, { onConflict: 'business_id,product_name' }));
    }

    if (error) {
      throw new Error(error.message);
    }

    await refresh();
  };

  const deletePrice = async (priceId: string): Promise<void> => {
    const { error } = await supabase.from('prices').delete().eq('id', priceId);
    if (error) {
      throw new Error(error.message);
    }
    await refresh();
  };

  // Fija o actualiza la ubicación del comercio del usuario logueado.
  // Existe porque hay comercios registrados antes de que el signup capturara
  // coordenadas (sin esto no aparecen nunca en el mapa).
  const updateMyBusinessLocation = async (coords: Coords): Promise<void> => {
    if (!myBusiness) {
      throw new Error('No tenés un negocio asociado a tu cuenta.');
    }
    const { error } = await supabase
      .from('businesses')
      .update({ lat: coords.lat, lon: coords.lon })
      .eq('id', myBusiness.id);
    if (error) {
      throw new Error(error.message);
    }
    await refresh();
  };

  const updateMyBusinessCategory = async (category: string): Promise<void> => {
    if (!myBusiness) {
      throw new Error('No tenés un negocio asociado a tu cuenta.');
    }
    const { error } = await supabase
      .from('businesses')
      .update({ category })
      .eq('id', myBusiness.id);
    if (error) {
      throw new Error(error.message);
    }
    await refresh();
  };

  // --- Puntuaciones ---

  const isMyBusiness = (businessId: string): boolean => {
    return !!authUser && businesses.some(
      (b) => b.id === businessId && b.owner_id === authUser.id
    );
  };

  const getBusinessRating = (businessId: string): BusinessRating => {
    const forBusiness = ratings.filter((r) => r.business_id === businessId);
    const count = forBusiness.length;
    const average =
      count > 0 ? forBusiness.reduce((sum, r) => sum + r.stars, 0) / count : null;
    const mine = authUser
      ? forBusiness.find((r) => r.user_id === authUser.id)
      : undefined;
    return { average, count, myStars: mine ? mine.stars : null };
  };

  const rateBusiness = async (businessId: string, stars: number): Promise<void> => {
    if (!authUser) {
      throw new Error('Tenés que iniciar sesión para puntuar.');
    }
    if (isMyBusiness(businessId)) {
      throw new Error('No podés puntuar tu propio comercio.');
    }
    // Upsert por (business_id, user_id): si ya puntuó, actualiza; si no, inserta.
    const { error } = await supabase
      .from('ratings')
      .upsert(
        { business_id: businessId, user_id: authUser.id, stars },
        { onConflict: 'business_id,user_id' }
      );
    if (error) {
      throw new Error(error.message);
    }
    await refresh();
  };

  const searchPrices = (
    term: string,
    sortBy: SortBy = 'price',
    locationOverride?: Coords | null
  ): PriceWithBusiness[] => {
    if (!term.trim()) return [];

    // Si nos pasan coords explícitas las usamos; si no, las del estado.
    const loc = locationOverride !== undefined ? locationOverride : userLocation;

    const normalizedTerm = term.toLowerCase().trim();
    const matched = prices
      .filter((p) => p.product_name.includes(normalizedTerm))
      .map((p): PriceWithBusiness | null => {
        const business = businesses.find((b) => b.id === p.business_id);
        if (!business) return null;

        // Distancia: solo si tenemos la ubicación del usuario Y el comercio
        // tiene coordenadas cargadas.
        let distance: number | null = null;
        if (loc && business.lat != null && business.lon != null) {
          distance = distanceInMeters(loc, {
            lat: business.lat,
            lon: business.lon,
          });
        }

        return { ...p, business, distance };
      })
      .filter((p): p is PriceWithBusiness => p !== null);

    if (sortBy === 'distance' && loc) {
      // Ordenar por distancia. Los que no tienen distancia (sin coords) van al final.
      return matched.sort((a, b) => {
        if (a.distance == null && b.distance == null) return a.price - b.price;
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
    }

    return matched.sort((a, b) => a.price - b.price);
  };

  const value: AppContextType = {
    loading,
    businesses,
    prices,
    refresh,
    session,
    authUser,
    myBusiness,
    signIn,
    signUp,
    signUpClient,
    signOut,
    upsertPrice,
    deletePrice,
    updateMyBusinessLocation,
    updateMyBusinessCategory,
    getBusinessRating,
    rateBusiness,
    isMyBusiness,
    userLocation,
    locationPermission,
    requestLocation,
    searchPrices,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp debe usarse dentro de un AppProvider');
  }
  return context;
};

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

/** Traduce mensajes de error de Supabase Auth a español */
function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Email o contraseña incorrectos.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Tenés que confirmar el email antes de ingresar. Revisá tu casilla.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Ya existe una cuenta con ese email.';
  }
  if (lower.includes('password should be at least')) {
    return 'La contraseña tiene que tener al menos 6 caracteres.';
  }
  if (lower.includes('unable to validate email')) {
    return 'El email no tiene un formato válido.';
  }
  return message;
}
