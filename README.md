# Precios al Toque

App móvil para comparar precios de productos en locales cercanos. Pensada para el mercado argentino: los vecinos buscan dónde está más barato lo que necesitan, y los comerciantes cargan y actualizan sus precios para ganar visibilidad.

## Estado

Proyecto en desarrollo temprano. Versión actual: 0.1.0.

Construido con **Expo (React Native)**. El backend con base de datos compartida (Supabase) y la geolocalización real son las próximas fases.

## Stack

- **Frontend**: React Native + Expo Router (file-based routing)
- **Lenguaje**: TypeScript
- **Estado**: Context API
- **Persistencia (temporal)**: AsyncStorage — se reemplaza por Supabase en la fase siguiente

## Desarrollo

```bash
npm install
npx expo start
```

Después se escanea el QR con la app **Expo Go** (Android) para ver la app en el celular.

## Roadmap

- [x] Fase 1: Limpieza del repo y unificación en una sola versión React Native
- [ ] Fase 2: Backend con Supabase (auth real, DB compartida, multi-usuario)
- [ ] Fase 3: Mapa real con `react-native-maps` y geolocalización con `expo-location`
- [ ] Fase 4: Foto de producto, categorías, filtros, build con EAS

## Licencia

Ver [LICENSE](LICENSE).
