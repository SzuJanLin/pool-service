import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import env from '../lib/env';

interface UseMapboxOptions {
  center?: [number, number];
  zoom?: number;
  style?: string;
}

export const useMapbox = (options: UseMapboxOptions = {}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const {
    center = [-74.0242, 40.6941],
    zoom = 10.12,
    style = 'mapbox://styles/mapbox/streets-v12',
  } = options;

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    
    const token = env.mapbox.publicToken || '';
    if (!token) {
      console.error('Mapbox token is not set. Please set NEXT_PUBLIC_MAPBOX_TOKEN in your .env file.');
      return;
    }
    
    mapboxgl.accessToken = token;

    // Wait for container to be rendered with dimensions
    const initMap = () => {
      if (!mapContainer.current || map.current) return;
      
      const rect = mapContainer.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        // Retry after a short delay if container has no dimensions
        setTimeout(initMap, 100);
        return;
      }

      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style,
          center,
          zoom,
        });

        map.current.on('load', () => {
          console.log('Map loaded successfully');
        });

        map.current.on('error', (e) => {
          console.error('Map error:', e);
        });
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(initMap, 0);

    return () => {
      clearTimeout(timeoutId);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom, style]);

  return { mapContainer, map: map.current as mapboxgl.Map | null };
};

