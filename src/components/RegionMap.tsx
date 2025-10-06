import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface RegionMapProps {
  region: string;
  coordinates: [number, number];
}

const RegionMap: React.FC<RegionMapProps> = ({ region, coordinates }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Configurar token de Mapbox
    // TODO: Reemplaza este token con tu propio token público de Mapbox
    // Obtén tu token en: https://account.mapbox.com/access-tokens/
    mapboxgl.accessToken = 'TU_TOKEN_PUBLICO_DE_MAPBOX_AQUI';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: coordinates,
      zoom: 8,
      interactive: true,
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
      new mapboxgl.NavigationControl({
        visualizePitch: false,
      }),
      'top-right'
    );

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [region, coordinates]);

  return (
    <div className="w-full h-48 rounded-lg overflow-hidden shadow-md">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default RegionMap;
