// Catálogo de categorías de productos (2 niveles: categoría → subcategoría).
// Las keys se guardan en la DB (prices.category / prices.subcategory) — no
// renombrarlas una vez que haya datos cargados; los labels sí se pueden tocar.
//
// El nombre del producto sigue siendo texto libre ("banana", "criollitas"):
// la categoría lo complementa para poder filtrar y, a futuro, mapear contra
// precios de referencia oficiales.

export interface ProductSubcategory {
  key: string;
  label: string;
}

export interface ProductCategory {
  key: string;
  label: string;
  icon: string; // Ionicons outline
  subcategories: ProductSubcategory[];
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    key: 'frutas-verduras',
    label: 'Frutas y verduras',
    icon: 'nutrition-outline',
    subcategories: [
      { key: 'frutas', label: 'Frutas' },
      { key: 'verduras', label: 'Verduras' },
    ],
  },
  {
    key: 'lacteos',
    label: 'Lácteos',
    icon: 'water-outline',
    subcategories: [
      { key: 'leches', label: 'Leches' },
      { key: 'yogures', label: 'Yogures' },
      { key: 'quesos', label: 'Quesos' },
      { key: 'manteca-crema', label: 'Manteca y crema' },
    ],
  },
  {
    key: 'panificados',
    label: 'Panificados',
    icon: 'pizza-outline',
    subcategories: [
      { key: 'pan', label: 'Pan' },
      { key: 'facturas', label: 'Facturas' },
      { key: 'tortas', label: 'Tortas y budines' },
    ],
  },
  {
    key: 'galletitas',
    label: 'Galletitas',
    icon: 'apps-outline',
    subcategories: [
      { key: 'dulces', label: 'Dulces' },
      { key: 'saladas', label: 'Saladas' },
      { key: 'de-agua', label: 'De agua' },
    ],
  },
  {
    key: 'carnes',
    label: 'Carnes',
    icon: 'restaurant-outline',
    subcategories: [
      { key: 'vacuna', label: 'Vacuna' },
      { key: 'pollo', label: 'Pollo' },
      { key: 'cerdo', label: 'Cerdo' },
      { key: 'pescado', label: 'Pescado' },
    ],
  },
  {
    key: 'fiambres',
    label: 'Fiambres',
    icon: 'fast-food-outline',
    subcategories: [
      { key: 'jamones', label: 'Jamones' },
      { key: 'salames', label: 'Salames' },
      { key: 'quesos-fiambre', label: 'Quesos en fetas' },
    ],
  },
  {
    key: 'almacen',
    label: 'Almacén',
    icon: 'basket-outline',
    subcategories: [
      { key: 'fideos-pastas', label: 'Fideos y pastas' },
      { key: 'arroz-legumbres', label: 'Arroz y legumbres' },
      { key: 'harinas', label: 'Harinas' },
      { key: 'aceites', label: 'Aceites y vinagres' },
      { key: 'enlatados', label: 'Enlatados' },
      { key: 'yerba-cafe-te', label: 'Yerba, café y té' },
      { key: 'azucar-dulces', label: 'Azúcar y dulces' },
    ],
  },
  {
    key: 'bebidas',
    label: 'Bebidas',
    icon: 'wine-outline',
    subcategories: [
      { key: 'gaseosas', label: 'Gaseosas' },
      { key: 'aguas', label: 'Aguas' },
      { key: 'jugos', label: 'Jugos' },
      { key: 'cervezas-vinos', label: 'Cervezas y vinos' },
    ],
  },
  {
    key: 'golosinas',
    label: 'Golosinas y kiosco',
    icon: 'ice-cream-outline',
    subcategories: [
      { key: 'alfajores', label: 'Alfajores' },
      { key: 'chocolates', label: 'Chocolates' },
      { key: 'caramelos', label: 'Caramelos y chicles' },
      { key: 'snacks', label: 'Snacks' },
    ],
  },
  {
    key: 'limpieza',
    label: 'Limpieza',
    icon: 'sparkles-outline',
    subcategories: [
      { key: 'lavado-ropa', label: 'Lavado de ropa' },
      { key: 'cocina-bano', label: 'Cocina y baño' },
      { key: 'papeles', label: 'Papeles' },
    ],
  },
  {
    key: 'perfumeria',
    label: 'Perfumería e higiene',
    icon: 'rose-outline',
    subcategories: [
      { key: 'higiene-personal', label: 'Higiene personal' },
      { key: 'cuidado-pelo', label: 'Cuidado del pelo' },
      { key: 'bebes', label: 'Bebés' },
    ],
  },
  {
    key: 'otros',
    label: 'Otros',
    icon: 'pricetag-outline',
    subcategories: [],
  },
];

export function productCategoryLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return PRODUCT_CATEGORIES.find((c) => c.key === key)?.label ?? null;
}

export function productSubcategoryLabel(
  categoryKey: string | null | undefined,
  subKey: string | null | undefined
): string | null {
  if (!categoryKey || !subKey) return null;
  const cat = PRODUCT_CATEGORIES.find((c) => c.key === categoryKey);
  return cat?.subcategories.find((s) => s.key === subKey)?.label ?? null;
}
