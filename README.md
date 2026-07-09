# Precios al Toque

App móvil para comparar precios de productos en locales cercanos. Pensada para el mercado argentino: los vecinos buscan dónde está más barato lo que necesitan, y los comerciantes cargan y actualizan sus precios para ganar visibilidad.

## Estado

Proyecto en desarrollo. Versión actual: 0.1.0.

Construido con **Expo (React Native)** sobre **Supabase** (base de datos compartida + autenticación). Ya funciona el flujo completo: los comercios se registran y cargan precios, los vecinos buscan un producto y ven los precios ordenados por valor o por cercanía. Falta el mapa visual con marcadores y el pulido final.

## Stack

- **Frontend**: React Native + Expo Router (file-based routing)
- **Lenguaje**: TypeScript
- **Estado**: Context API
- **Backend**: Supabase (Postgres + Auth + Row Level Security)
- **Geolocalización**: expo-location + distancia haversine propia (`lib/geo.ts`)

## Desarrollo

```bash
npm install
npx expo start
```

Después se escanea el QR con la app **Expo Go** (Android) para ver la app en el celular.

Requiere un archivo `.env` en la raíz (no versionado) con:

```
EXPO_PUBLIC_SUPABASE_URL=<url del proyecto Supabase>
EXPO_PUBLIC_SUPABASE_KEY=<publishable key>
```

El schema de la base está en [supabase/schema.sql](supabase/schema.sql) — se pega en el SQL Editor de Supabase y es idempotente (se puede correr más de una vez).

## Base de datos

El schema vive en [supabase/](supabase/) y se corre en el SQL Editor de Supabase:

1. [supabase/schema.sql](supabase/schema.sql) — comercios y precios (base).
2. [supabase/ratings.sql](supabase/ratings.sql) — puntuaciones de comercios (estrellas).
3. [supabase/business_category.sql](supabase/business_category.sql) — rubro del comercio.
4. [supabase/product_categories.sql](supabase/product_categories.sql) — categorías de productos.

Todos son idempotentes (se pueden correr más de una vez).

## Compilar el APK (Android)

La configuración de build ya está lista ([eas.json](eas.json), con perfil
`preview` que genera un APK instalable). Antes del primer build faltan dos
pasos que requieren cuentas del dueño del proyecto:

1. **Cuenta en Expo (gratis)**: crearla en https://expo.dev (puede ser con
   GitHub). Después, en la carpeta del proyecto: `npx eas-cli login`.
2. **API key de Google Maps**: en https://console.cloud.google.com crear un
   proyecto, habilitar "Maps SDK for Android" y crear una API key (pide
   tarjeta de crédito; el tier gratuito es amplio). Pegar la key en
   `app.json` → `android.config.googleMaps.apiKey` (hoy tiene un placeholder;
   sin key real, el mapa del APK sale gris).

Con eso listo, el build se lanza con:

```bash
npx eas-cli build --platform android --profile preview
```

El APK compila en la nube de Expo (~15 min) y queda descargable desde un link.

## Roadmap

- [x] Fase 1: Limpieza del repo y unificación en una sola versión React Native
- [x] Fase 2: Backend con Supabase (auth real, DB compartida, multi-usuario)
- [x] Fase 3a: Geolocalización con `expo-location` — distancia en resultados y orden por cercanía
- [x] Fase 3b: Mapa real con `react-native-maps` (home con comercios y buscador)
- [x] Rediseño visual: identidad propia (verde + Nunito), tabs Mapa/Buscar/Mi negocio
- [x] Cuentas de cliente + puntuaciones de comercios (estrellas)
- [ ] Fase 4: Catálogo de categorías, foto de producto, filtros, build con EAS
- [ ] Futuro: pedidos/encargos (click & collect)

## Licencia

Ver [LICENSE](LICENSE).
