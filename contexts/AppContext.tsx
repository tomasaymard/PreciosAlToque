import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interfaces
export interface Product {
  business_id: string;
  product: string;
  price: number;
  unit: string;
  updated: string;
}

export interface Business {
  id: string;
  name: string;
  coords: { lat: number; lon: number };
  address: string;
}

export interface User {
  username: string;
  business: Business;
}

interface AppContextType {
  // Productos
  products: Product[];
  loadProducts: () => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (businessId: string, productName: string) => Promise<void>;
  
  // Autenticación
  isLoggedIn: boolean;
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  
  // Búsqueda
  searchProducts: (term: string) => Product[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Datos estáticos
export const BUSINESSES: Business[] = [
  { id: 'N001', name: "Verdulería Don Pepe", coords: { lat: -34.60, lon: -58.42 }, address: "Av. Corrientes 3000" },
  { id: 'N002', name: "Supermercado Chino", coords: { lat: -34.61, lon: -58.41 }, address: "Calle Honduras 150" },
  { id: 'N003', name: "Panadería El Sol", coords: { lat: -34.605, lon: -58.425 }, address: "Esquina Rivadavia" },
  { id: 'N004', name: "Almacén de Doña Rosa", coords: { lat: -34.615, lon: -58.43 }, address: "Pasaje Sarmiento 12" }
];

// Productos sembrados para el primer arranque — se usan tanto como estado inicial
// (para que la búsqueda funcione desde el render 0) como fallback si AsyncStorage falla.
// Esto es temporal: en la Fase 2 se reemplaza por datos reales desde Supabase.
const INITIAL_PRODUCTS: Product[] = [
  { business_id: 'N001', product: "banana", price: 1500, unit: "el kilo", updated: "Hace 1h" },
  { business_id: 'N001', product: "manzana", price: 1800, unit: "el kilo", updated: "Hace 1h" },
  { business_id: 'N002', product: "leche", price: 950, unit: "el litro", updated: "Hace 2h" },
  { business_id: 'N002', product: "arroz", price: 2300, unit: "el kilo", updated: "Hace 2h" },
  { business_id: 'N003', product: "pan", price: 2100, unit: "el kilo", updated: "Hace 30m" },
  { business_id: 'N004', product: "leche", price: 1050, unit: "el litro", updated: "Hace 4h" },
  { business_id: 'N004', product: "pan", price: 1900, unit: "el kilo", updated: "Hace 4h" }
];

const VALID_CREDENTIALS: { [key: string]: string } = {
  "pepe_don": "12345",
  "super_chino": "67890"
};

const USER_TO_BUSINESS: { [key: string]: string } = {
  "pepe_don": "N001",
  "super_chino": "N002"
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Iniciamos products con los datos sembrados para que la primera búsqueda
  // siempre funcione, incluso si AsyncStorage tarda o falla.
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await loadProducts();
    await checkExistingSession();
  };

  const loadProducts = async (): Promise<void> => {
    try {
      const storedProducts = await AsyncStorage.getItem('priceProducts');
      if (storedProducts) {
        const parsed = JSON.parse(storedProducts) as Product[];
        // Solo sobrescribimos el estado si lo guardado tiene contenido válido.
        // Si está vacío o corrupto, dejamos los INITIAL_PRODUCTS que ya están en el estado.
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed);
        }
      } else {
        // Primera vez: persistimos los datos sembrados a AsyncStorage.
        await AsyncStorage.setItem('priceProducts', JSON.stringify(INITIAL_PRODUCTS));
      }
    } catch (error) {
      console.error('Error loading products:', error);
      // Si AsyncStorage falla, los INITIAL_PRODUCTS ya están en el estado, así que la app sigue usable.
    }
  };

  const saveProducts = async (newProducts: Product[]): Promise<void> => {
    try {
      await AsyncStorage.setItem('priceProducts', JSON.stringify(newProducts));
      setProducts(newProducts);
    } catch (error) {
      console.error('Error saving products:', error);
      throw error;
    }
  };

  const addProduct = async (product: Product): Promise<void> => {
    const newProducts = [...products, product];
    await saveProducts(newProducts);
  };

  const updateProduct = async (updatedProduct: Product): Promise<void> => {
    const newProducts = products.map(p => 
      p.business_id === updatedProduct.business_id && p.product === updatedProduct.product
        ? updatedProduct
        : p
    );
    await saveProducts(newProducts);
  };

  const deleteProduct = async (businessId: string, productName: string): Promise<void> => {
    const newProducts = products.filter(p => 
      !(p.business_id === businessId && p.product === productName)
    );
    await saveProducts(newProducts);
  };

  const checkExistingSession = async (): Promise<void> => {
    try {
      const loggedIn = await AsyncStorage.getItem('isLoggedIn');
      const username = await AsyncStorage.getItem('currentUser');
      
      if (loggedIn === 'true' && username) {
        const businessId = USER_TO_BUSINESS[username];
        const business = BUSINESSES.find(b => b.id === businessId);
        
        if (business) {
          setIsLoggedIn(true);
          setCurrentUser({ username, business });
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Verificar credenciales
      if (VALID_CREDENTIALS[username] !== password) {
        return false;
      }

      // Obtener información del negocio
      const businessId = USER_TO_BUSINESS[username];
      const business = BUSINESSES.find(b => b.id === businessId);
      
      if (!business) {
        return false;
      }

      // Guardar sesión
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('currentUser', username);
      
      setIsLoggedIn(true);
      setCurrentUser({ username, business });
      
      return true;
    } catch (error) {
      console.error('Error logging in:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      await AsyncStorage.removeItem('currentUser');
      
      setIsLoggedIn(false);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  const searchProducts = (term: string): Product[] => {
    if (!term.trim()) return [];
    
    const filteredProducts = products.filter(p => 
      p.product.toLowerCase().includes(term.toLowerCase().trim())
    );
    
    return filteredProducts.sort((a, b) => a.price - b.price);
  };

  const value: AppContextType = {
    // Productos
    products,
    loadProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    
    // Autenticación
    isLoggedIn,
    currentUser,
    login,
    logout,
    
    // Búsqueda
    searchProducts
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};