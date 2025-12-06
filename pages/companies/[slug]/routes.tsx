import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { NextPageWithLayout } from 'types';
import { useMapbox } from 'hooks/useMapbox';
import { useMemo, useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import env from 'lib/env';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import useCompany from 'hooks/useCompany';
import { Route, User, Pool, Customer } from '@prisma/client';

type RouteWithRelations = Route & {
  tech: User | null;
  pool: Pool & {
    customer: Customer;
  };
};

const Routes: NextPageWithLayout = () => {
  const { company } = useCompany();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);

  // Fetch all company routes
  const { data: routesData } = useSWR<{ data: RouteWithRelations[] }>(
    company ? `/api/companies/${company.slug}/routes` : null,
    fetcher
  );

  const routes = useMemo(() => routesData?.data || [], [routesData]);

  // Filter routes by selected day
  const dailyRoutes = useMemo(() => {
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const selectedDayOfWeek = dayNames[selectedDate.getDay()];

    return routes.filter(route => route.dayOfWeek === selectedDayOfWeek);
  }, [routes, selectedDate]);

  // Group routes by technician
  const routesByTech = useMemo(() => {
    const grouped: Record<string, { tech: User | null; routes: RouteWithRelations[] }> = {};

    dailyRoutes.forEach(route => {
      const techId = route.techId || 'unassigned';
      if (!grouped[techId]) {
        grouped[techId] = {
          tech: route.tech,
          routes: [],
        };
      }
      grouped[techId].routes.push(route);
    });

    return Object.values(grouped);
  }, [dailyRoutes]);

  const mapRoutes = useMemo(() => {
    if (!selectedTechId) return [];
    const group = routesByTech.find(g => (g.tech?.id || 'unassigned') === selectedTechId);
    return group ? group.routes : [];
  }, [routesByTech, selectedTechId]);

  const mapAddresses = useMemo(() => {
    return mapRoutes.map(route => {
      const customer = route.pool.customer;
      return [
        customer.addressStreet,
        customer.addressCity,
        customer.addressState,
        customer.addressZip
      ].filter(Boolean).join(', ');
    }).filter(addr => addr.length > 0);
  }, [mapRoutes]);

  // Approximate center for Provo, Utah (will be updated after geocoding)
  const mapOptions = useMemo(() => ({
    center: [-111.6585, 40.2181] as [number, number], // Provo, Utah approximate coordinates
    zoom: 14,
  }), []);

  const { mapContainer, map } = useMapbox(mapOptions);

  // Generate week starting from today
  const weekDays = useMemo(() => {
    const today = new Date();
    const days: Array<{ date: Date; label: string; isSelected: boolean }> = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const dayName = dayNames[date.getDay()];
      
      // Compare dates ignoring time
      const isSelected = date.toDateString() === selectedDate.toDateString();

      days.push({
        date,
        label: `${month}/${day} ${dayName}`,
        isSelected,
      });
    }
    
    return days;
  }, [selectedDate]);

  // Geocode addresses and add markers when map is ready
  useEffect(() => {
    if (!map) return;


  }, [map, mapAddresses]); // Placeholder to be replaced by actual logic below

  // Ref to store current markers to clear them on update
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    const updateMap = async () => {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Remove existing route layer/source
      if (map.getLayer('route')) map.removeLayer('route');
      if (map.getSource('route')) map.removeSource('route');

      if (mapAddresses.length === 0) return;

      try {
        const token = env.mapbox.publicToken || '';
        if (!token) {
          console.error('Mapbox token is not set');
          return;
        }

        const bounds = new mapboxgl.LngLatBounds();
        const orderedCoordinates: Array<{ index: number; coords: [number, number] }> = [];

        // Process addresses sequentially
        await Promise.all(mapAddresses.map(async (address, index) => {
          try {
            const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`;
            
            const response = await fetch(geocodeUrl);
            const data = await response.json();

            if (data.features && data.features.length > 0) {
              const [lng, lat] = data.features[0].center;
              const coordinates: [number, number] = [lng, lat];

              // Create and add marker
              const marker = new mapboxgl.Marker({
                color: '#3B82F6',
                scale: 1.2,
              })
                .setLngLat(coordinates)
                .setPopup(new mapboxgl.Popup().setHTML(`<div class="p-2"><strong>Location ${index + 1}</strong><br/>${address}</div>`))
                .addTo(map);

              markersRef.current.push(marker);
              orderedCoordinates.push({ index, coords: coordinates });
              bounds.extend(coordinates);
            }
          } catch (error) {
            console.error('Error geocoding address:', address, error);
          }
        }));

        // Sort and draw line
        orderedCoordinates.sort((a, b) => a.index - b.index);
        const routeCoordinates = orderedCoordinates.map(item => item.coords);

        if (routeCoordinates.length > 1) {
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

        if (routeCoordinates.length > 0) {
          map.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15,
            duration: 2000,
          });
        }
      } catch (error) {
        console.error('Error updating map:', error);
      }
    };

    updateMap();

  }, [map, mapAddresses]);

  return (
    <div className="flex h-[600px] w-full gap-4">
      {/* Calendar Side */}
      <div className="w-1/3 bg-white shadow rounded-lg p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Week Schedule</h2>
        {/* Week Header - Horizontal */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {weekDays.map((day, index) => (
            <button
              key={index}
              onClick={() => setSelectedDate(day.date)}
              className={`flex-shrink-0 p-2 rounded-md border-2 transition-colors text-center min-w-[80px] ${
                day.isSelected
                  ? 'bg-blue-50 border-blue-500 font-semibold'
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-xs text-gray-600">{day.label}</div>
            </button>
          ))}
        </div>
        {/* Calendar Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {routesByTech.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No routes scheduled for this day</div>
          ) : (
            routesByTech.map((group) => {
              const techId = group.tech?.id || 'unassigned';
              const isSelected = selectedTechId === techId;

              return (
                <div 
                  key={techId} 
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    isSelected 
                      ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' 
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTechId(isSelected ? null : techId)}
                >
                  <div className="font-semibold text-gray-900 mb-2 pb-2 border-b flex justify-between items-center">
                    <span>{group.tech ? group.tech.name : 'Unassigned'}</span>
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      ({group.routes.length} routes)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.routes.map((route) => (
                      <div key={route.id} className={`text-sm p-2 rounded transition-colors ${
                        isSelected ? 'bg-white' : 'bg-gray-50'
                      }`}>
                        <div className="font-medium">{route.pool.customer.firstName} {route.pool.customer.lastName}</div>
                        <div className="text-gray-500 text-xs mt-1">
                          {[
                            route.pool.customer.addressStreet,
                            route.pool.customer.addressCity
                          ].filter(Boolean).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
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

