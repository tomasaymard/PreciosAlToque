// HTML del mapa que se muestra dentro del WebView.
//
// Usa Leaflet (librería de mapas de código abierto) con las imágenes de
// OpenStreetMap. A diferencia de Google Maps, no necesita clave, cuenta ni
// tarjeta de crédito.
//
// Comunicación con la app:
//  - App → mapa: se inyecta JavaScript llamando a window.PAT.* (ver funciones
//    al final del HTML).
//  - Mapa → app: window.ReactNativeWebView.postMessage con un JSON
//    { type: 'markerPress', id } cuando se toca un comercio, o
//    { type: 'ready' } cuando el mapa terminó de cargar.
//
// Nota sobre las imágenes del mapa: se usan los servidores públicos de
// OpenStreetMap, que son gratuitos pero piden un uso moderado. Para una app
// de barrio alcanza de sobra; si algún día hay mucho tráfico, se cambia la
// línea del tileLayer por otro proveedor sin tocar nada más.

import { Brand } from '@/constants/theme';

export interface MapMarkerData {
  id: string;
  lat: number;
  lon: number;
  name: string;
}

/** Centro por defecto: Obelisco, CABA */
export const DEFAULT_CENTER = { lat: -34.6037, lon: -58.3816 };

export function buildMapHtml(center: { lat: number; lon: number }, zoom = 14): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #F1EFE8; }
    .pat-pin {
      background: ${Brand.primary};
      border: 2px solid #ffffff;
      border-radius: 50% 50% 50% 0;
      width: 22px; height: 22px;
      transform: rotate(-45deg);
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    }
    .pat-pin.selected { background: ${Brand.accent}; width: 28px; height: 28px; }
    .pat-me {
      background: #1D9E75; border: 3px solid #ffffff; border-radius: 50%;
      width: 16px; height: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    }
    .leaflet-control-attribution { font-size: 9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          onerror="window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',reason:'leaflet'}))"></script>
  <script>
    // Si Leaflet no cargó (sin internet o CDN caído), avisamos a la app en vez
    // de dejar la pantalla en blanco sin explicación.
    if (typeof L === 'undefined') {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', reason: 'leaflet' }));
      }
      throw new Error('Leaflet no disponible');
    }

    var map = L.map('map', { zoomControl: false, attributionControl: true })
      .setView([${center.lat}, ${center.lon}], ${zoom});

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var markers = {};
    var meMarker = null;
    var selectedId = null;

    function send(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    function iconFor(isSelected) {
      var size = isSelected ? 28 : 22;
      return L.divIcon({
        className: '',
        html: '<div class="pat-pin' + (isSelected ? ' selected' : '') + '"></div>',
        iconSize: [size, size],
        iconAnchor: [size / 2, size]
      });
    }

    window.PAT = {
      setMarkers: function (list) {
        // Borra los que ya no están
        Object.keys(markers).forEach(function (id) {
          if (!list.some(function (b) { return b.id === id; })) {
            map.removeLayer(markers[id]);
            delete markers[id];
          }
        });
        // Agrega o mueve los actuales
        list.forEach(function (b) {
          if (markers[b.id]) {
            markers[b.id].setLatLng([b.lat, b.lon]);
          } else {
            var m = L.marker([b.lat, b.lon], { icon: iconFor(false) }).addTo(map);
            m.on('click', function () { send({ type: 'markerPress', id: b.id }); });
            m.bindTooltip(b.name, { direction: 'top', offset: [0, -22] });
            markers[b.id] = m;
          }
        });
        window.PAT.setSelected(selectedId);
      },

      setSelected: function (id) {
        selectedId = id;
        Object.keys(markers).forEach(function (mid) {
          markers[mid].setIcon(iconFor(mid === id));
        });
      },

      setUserLocation: function (lat, lon) {
        var icon = L.divIcon({
          className: '',
          html: '<div class="pat-me"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        if (meMarker) {
          meMarker.setLatLng([lat, lon]);
        } else {
          meMarker = L.marker([lat, lon], { icon: icon, interactive: false }).addTo(map);
        }
      },

      centerOn: function (lat, lon, z) {
        map.flyTo([lat, lon], z || 16, { duration: 0.5 });
      },

      fitTo: function (coords) {
        if (!coords.length) return;
        map.fitBounds(coords.map(function (c) { return [c.lat, c.lon]; }), {
          padding: [60, 60], maxZoom: 16
        });
      }
    };

    map.on('click', function () { send({ type: 'mapPress' }); });
    send({ type: 'ready' });
  </script>
</body>
</html>`;
}
