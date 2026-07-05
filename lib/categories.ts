// Rubros de comercio. El valor (`key`) es lo que se guarda en la DB; `label`
// es lo que se muestra; `icon` es un nombre de Ionicons (outline).
// Mantener las keys estables — si se renombra una, los comercios ya guardados
// quedarían huérfanos.

export interface Category {
  key: string;
  label: string;
  icon: string;
}

export const CATEGORIES: Category[] = [
  { key: 'almacen', label: 'Almacén', icon: 'basket-outline' },
  { key: 'verduleria', label: 'Verdulería', icon: 'nutrition-outline' },
  { key: 'panaderia', label: 'Panadería', icon: 'pizza-outline' },
  { key: 'carniceria', label: 'Carnicería', icon: 'restaurant-outline' },
  { key: 'kiosco', label: 'Kiosco', icon: 'cafe-outline' },
  { key: 'fiambreria', label: 'Fiambrería', icon: 'fast-food-outline' },
  { key: 'dietetica', label: 'Dietética', icon: 'leaf-outline' },
  { key: 'pastas', label: 'Fábrica de pastas', icon: 'egg-outline' },
  { key: 'farmacia', label: 'Farmacia', icon: 'medkit-outline' },
  { key: 'otro', label: 'Otro', icon: 'storefront-outline' },
];

export function categoryLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return CATEGORIES.find((c) => c.key === key)?.label ?? null;
}

export function categoryIcon(key: string | null | undefined): string {
  return CATEGORIES.find((c) => c.key === key)?.icon ?? 'storefront-outline';
}
