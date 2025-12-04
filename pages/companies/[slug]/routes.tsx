import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { NextPageWithLayout } from 'types';
import { useMapbox } from 'hooks/useMapbox';
import { useMemo, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import env from 'lib/env';

const Routes: NextPageWithLayout = () => {
  // Test locations
  const testAddresses = useMemo(() => [
    '142 W 1230 N, Provo, Utah 84604',
    '359 E 200 N, Provo, UT 84606',
  ], []);
  
  // Approximate center for Provo, Utah (will be updated after geocoding)
  const mapOptions = useMemo(() => ({
    center: [-111.6585, 40.2181] as [number, number], // Provo, Utah approximate coordinates
    zoom: 14,
  }), []);

  const { mapContainer, map } = useMapbox(mapOptions);

  // Generate week starting from today
  const weekDays = useMemo(() => {
    const today = new Date();
    const days: Array<{ date: Date; label: string; isToday: boolean }> = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const dayName = dayNames[date.getDay()];
      days.push({
        date,
        label: `${month}/${day} ${dayName}`,
        isToday: i === 0,
      });
    }
    
    return days;
  }, []);

  // Geocode addresses and add markers when map is ready
  useEffect(() => {
    if (!map) return;

    const addMarkers = async () => {
      try {
        const token = env.mapbox.publicToken || '';
        if (!token) {
          console.error('Mapbox token is not set');
          return;
        }

        const bounds = new mapboxgl.LngLatBounds();
        const orderedCoordinates: Array<{ index: number; coords: [number, number] }> = [];

        // Process addresses sequentially to maintain order for the line
        await Promise.all(testAddresses.map(async (address, index) => {
          try {
            // Use Mapbox Geocoding API to convert address to coordinates
            const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`;
            
            const response = await fetch(geocodeUrl);
            const data = await response.json();

            if (data.features && data.features.length > 0) {
              const [lng, lat] = data.features[0].center;
              const coordinates: [number, number] = [lng, lat];

              // Create and add marker
              new mapboxgl.Marker({
                color: '#3B82F6', // Blue color
                scale: 1.2,
              })
                .setLngLat(coordinates)
                .setPopup(new mapboxgl.Popup().setHTML(`<div class="p-2"><strong>Location ${index + 1}</strong><br/>${address}</div>`))
                .addTo(map);

              // Store coordinates with index for sorting
              orderedCoordinates.push({ index, coords: coordinates });
              bounds.extend(coordinates);
              console.log('Marker added at:', coordinates, address);
            } else {
              console.error('Address not found:', address);
            }
          } catch (error) {
            console.error('Error geocoding address:', address, error);
          }
        }));

        // Sort coordinates by original index to ensure line follows the list order
        orderedCoordinates.sort((a, b) => a.index - b.index);
        const routeCoordinates = orderedCoordinates.map(item => item.coords);

        // Draw a line connecting the points
        if (routeCoordinates.length > 1) {
          // Remove existing layer and source if they exist
          if (map.getLayer('route')) map.removeLayer('route');
          if (map.getSource('route')) map.removeSource('route');

          map.addSource('route', {
            'type': 'geojson',
            'data': {
              'type': 'Feature',
              'properties': {},
              'geometry': {
                'type': 'LineString',
                'coordinates': routeCoordinates
              }
            }
          });

          map.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': {
              'line-join': 'round',
              'line-cap': 'round'
            },
            'paint': {
              'line-color': '#3B82F6',
              'line-width': 4,
              'line-opacity': 0.8
            }
          });
        }

        // Fit map to bounds if we have coordinates
        if (routeCoordinates.length > 0) {
          map.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15,
            duration: 2000,
          });
        }
      } catch (error) {
        console.error('Error in marker generation:', error);
      }
    };

    // Wait for map to be fully loaded
    if (map.loaded()) {
      addMarkers();
    } else {
      map.on('load', addMarkers);
    }

    return () => {
      // Cleanup: remove event listener if component unmounts before map loads
      if (map) {
        map.off('load', addMarkers);
      }
    };
  }, [map, testAddresses]);

  return (
    <div className="flex h-[600px] w-full gap-4">
      {/* Calendar Side */}
      <div className="w-1/3 bg-white shadow rounded-lg p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Week Schedule</h2>
        {/* Week Header - Horizontal */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`flex-shrink-0 p-2 rounded-md border-2 transition-colors text-center min-w-[80px] ${
                day.isToday
                  ? 'bg-blue-50 border-blue-500 font-semibold'
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-xs text-gray-600">{day.label}</div>
            </div>
          ))}
        </div>
        {/* Calendar Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Add your calendar content here */}
        </div>
      </div>

      {/* Map Side */}
      <div className="flex-1 relative rounded-lg overflow-hidden shadow">
        <div 
          id="map-container" 
          ref={mapContainer} 
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
}

export default Routes;

