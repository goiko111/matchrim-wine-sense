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
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [hasError, setHasError] = useState(false);

  // Efecto para inicializar el mapa solo una vez
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Configurar token de Mapbox
    mapboxgl.accessToken = 'pk.eyJ1IjoiZ29pa28td2luZXJpbSIsImEiOiJjbWdmM3R1anQwNHE5MmtyMW02Nmp1OTFhIn0.0PGiNnLfvOiZNghcsNeK4g';

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v12', // Estilo con más detalles geográficos
        center: [0, 0],
        zoom: 2,
        interactive: true, // Habilitar interacción
        dragPan: true,
        scrollZoom: true,
        boxZoom: true,
        dragRotate: false,
        keyboard: true,
        doubleClickZoom: true,
        touchZoomRotate: true,
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error', e);
        setHasError(true);
      });
    } catch (err) {
      console.error('Map init error', err);
      setHasError(true);
    }

    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Efecto separado para actualizar región y coordenadas
  useEffect(() => {
    if (!map.current || hasError) return;

    const updateMapRegion = () => {
      // Limpiar marcador previo
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Añadir nuevo marcador
      markerRef.current = new mapboxgl.Marker({ color: '#be123c' })
        .setLngLat(coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<div class="font-semibold text-sm">${region}</div>`)
        )
        .addTo(map.current!);

      // Centrar en la región directamente usando las coordenadas
      const zoom = coordinates[0] === 0 && coordinates[1] === 0 ? 2 : 5;
      if (!map.current) return;
      map.current.flyTo({
        center: coordinates,
        zoom: zoom,
        duration: 1000,
        essential: true
      });
    };

    // Esperar a que el mapa esté cargado antes de actualizar
    if (map.current.isStyleLoaded()) {
      updateMapRegion();
    } else {
      map.current.once('load', updateMapRegion);
    }
  }, [region, coordinates, hasError]);

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
