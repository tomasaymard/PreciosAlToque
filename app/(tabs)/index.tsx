// Ruta del home. El contenido real vive en components/map-home:
// - map-home.tsx (Android/iOS): mapa real con react-native-maps
// - map-home.web.tsx (navegador): lista sin mapa
// Va separado en componentes porque expo-router bundlea TODAS las rutas en
// todas las plataformas — si esta ruta importara react-native-maps directo,
// la compilación web fallaría. Metro sí resuelve la extensión .web en
// componentes comunes.

import MapHome from '@/components/map-home';

export default MapHome;
