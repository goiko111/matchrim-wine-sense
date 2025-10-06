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
