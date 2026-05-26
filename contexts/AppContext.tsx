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
import { Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

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
  created_at: string;
}

export interface Price {
  id: string;
  business_id: string;
  product_name: string;
  price: number;
  unit: string;
  updated_at: string;
}

// Resultado de búsqueda: precio + el negocio que lo cargó, todo en un objeto
export interface PriceWithBusiness extends Price {
  business: Business;
}

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
    address: string
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;

  // CRUD de precios (solo el dueño del negocio puede; lo enforzan las RLS)
  upsertPrice: (productName: string, price: number, unit: string) => Promise<void>;
  deletePrice: (priceId: string) => Promise<void>;

  // Búsqueda
  searchPrices: (term: string) => PriceWithBusiness[];
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
  const [session, setSession] = useState<Session | null>(null);

  const authUser = session?.user ?? null;
  // Buscamos el negocio del usuario logueado dentro de la lista que ya tenemos cargada,
  // así no hacemos otra query al servidor.
  const myBusiness = authUser
    ? businesses.find((b) => b.owner_id === authUser.id) ?? null
    : null;

  // Trae negocios y precios desde Supabase. Se llama al montar y después de
  // cualquier cambio (login, signup, upsert, delete).
  const refresh = useCallback(async (): Promise<void> => {
    const [businessesRes, pricesRes] = await Promise.all([
      supabase.from('businesses').select('*').order('name'),
      supabase.from('prices').select('*').order('updated_at', { ascending: false }),
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
  }, []);

  // Carga inicial de datos
  useEffect(() => {
    refresh().finally(() => setLoading(false));
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
    address: string
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

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  const upsertPrice = async (
    productName: string,
    price: number,
    unit: string
  ): Promise<void> => {
    if (!myBusiness) {
      throw new Error('No tenés un negocio asociado a tu cuenta.');
    }

    // El trigger en la DB normaliza product_name a minúsculas y trim.
    // El unique index (business_id, product_name) hace que el upsert
    // reemplace si ya hay un precio para ese producto en este negocio.
    const { error } = await supabase
      .from('prices')
      .upsert(
        {
          business_id: myBusiness.id,
          product_name: productName,
          price,
          unit,
        },
        { onConflict: 'business_id,product_name' }
      );

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

  const searchPrices = (term: string): PriceWithBusiness[] => {
    if (!term.trim()) return [];

    const normalizedTerm = term.toLowerCase().trim();
    const matched = prices
      .filter((p) => p.product_name.includes(normalizedTerm))
      .map((p) => {
        const business = businesses.find((b) => b.id === p.business_id);
        return business ? { ...p, business } : null;
      })
      .filter((p): p is PriceWithBusiness => p !== null);

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
    signOut,
    upsertPrice,
    deletePrice,
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
