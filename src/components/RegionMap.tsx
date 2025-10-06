import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface RegionMapProps {
  region: string;
  coordinates: [number, number];
}

const RegionMap: React.FC<RegionMapProps> = ({ region, coordinates }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Configurar token de Mapbox
    mapboxgl.accessToken = 'pk.eyJ1IjoiZ29pa28td2luZXJpbSIsImEiOiJjbWdmM3R1anQwNHE5MmtyMW02Nmp1OTFhIn0.0PGiNnLfvOiZNghcsNeK4g';

    const zoom = coordinates[0] === 0 && coordinates[1] === 0 ? 2 : 8;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: coordinates,
        zoom,
        interactive: true,
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error', e);
        setHasError(true);
      });

      // Añadir marcador en la región
      new mapboxgl.Marker({ color: '#be123c' })
        .setLngLat(coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<div class="font-semibold text-sm">${region}</div>`)
        )
        .addTo(map.current);

      // Añadir controles de navegación
      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: false }),
        'top-right'
      );

      // Cuando el mapa cargue, intentar dibujar la región como polígono
      map.current.on('load', async () => {
        if (!map.current) return;

        // Limpieza previa por si existía
        ['region-boundary-fill', 'region-boundary-outline'].forEach((layerId) => {
          if (map.current?.getLayer(layerId)) map.current.removeLayer(layerId);
        });
        if (map.current.getSource('region-boundary')) {
          map.current.removeSource('region-boundary');
        }

        // Función para calcular los bounds de un Feature GeoJSON (Polygon/MultiPolygon)
        const getFeatureBounds = (feature: any) => {
          const bounds = new mapboxgl.LngLatBounds();
          const coords = feature.geometry.type === 'Polygon'
            ? feature.geometry.coordinates
            : feature.geometry.type === 'MultiPolygon'
              ? feature.geometry.coordinates.flat()
              : [];
          coords.forEach((ring: number[][]) => {
            ring.forEach(([lng, lat]) => bounds.extend([lng, lat]));
          });
          return bounds;
        };

        // 1) Intentar con Nominatim (OSM) para obtener el polígono real
        try {
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=geojson&polygon_geojson=1&q=${encodeURIComponent(region + ' wine region')}`;
          const res = await fetch(nominatimUrl, { headers: { Accept: 'application/json' } });
          if (res.ok) {
            const data = await res.json();
            const feature = data?.features?.[0];
            if (feature?.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
              map.current.addSource('region-boundary', {
                type: 'geojson',
                data: feature,
              });
              map.current.addLayer({
                id: 'region-boundary-fill',
                type: 'fill',
                source: 'region-boundary',
                paint: {
                  'fill-color': '#be123c',
                  'fill-opacity': 0.15,
                },
              });
              map.current.addLayer({
                id: 'region-boundary-outline',
                type: 'line',
                source: 'region-boundary',
                paint: {
                  'line-color': '#be123c',
                  'line-width': 2,
                  'line-opacity': 0.8,
                },
              });

              const bounds = getFeatureBounds(feature);
              if (!bounds.isEmpty()) {
                map.current.fitBounds(bounds, { padding: 24, maxZoom: 9 });
                return; // Éxito
              }
            }
          }
        } catch (e) {
          console.warn('Nominatim falló, usando geocoding de Mapbox como alternativa', e);
        }

        // 2) Alternativa: usar Geocoding de Mapbox y sombrear el bounding box
        try {
          const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(region)}.json?types=region,place,district,locality&language=es&limit=1&access_token=${mapboxgl.accessToken}`;
          const res = await fetch(geocodeUrl);
          const data = await res.json();
          const feat = data?.features?.[0];
          const bbox = feat?.bbox; // [minLng, minLat, maxLng, maxLat]
          if (bbox && bbox.length === 4) {
            const rect = {
              type: 'Feature',
              properties: { name: region },
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [bbox[0], bbox[1]],
                  [bbox[2], bbox[1]],
                  [bbox[2], bbox[3]],
                  [bbox[0], bbox[3]],
                  [bbox[0], bbox[1]],
                ]],
              },
            };
            // Añadir como polígono de región (aproximado por bbox)
            map.current.addSource('region-boundary', { type: 'geojson', data: rect as any });
            map.current.addLayer({
              id: 'region-boundary-fill',
              type: 'fill',
              source: 'region-boundary',
              paint: {
                'fill-color': '#be123c',
                'fill-opacity': 0.12,
              },
            });
            map.current.addLayer({
              id: 'region-boundary-outline',
              type: 'line',
              source: 'region-boundary',
              paint: {
                'line-color': '#be123c',
                'line-width': 2,
                'line-opacity': 0.8,
              },
            });
            map.current.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 24, maxZoom: 9 });
          }
        } catch (e) {
          console.warn('Mapbox geocoding falló, mostrando solo marcador', e);
        }
      });
    } catch (err) {
      console.error('Map init error', err);
      setHasError(true);
    }

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [region, coordinates]);

  return (
    <div className="w-full h-48 rounded-lg overflow-hidden shadow-md relative">
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-600 text-sm">
          No se pudo cargar el mapa
        </div>
      ) : null}
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default RegionMap;
