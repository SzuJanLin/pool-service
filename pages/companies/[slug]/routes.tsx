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

  // Helper to assign colors to technicians based on their index in the list
  // This ensures distinct colors for the visible technicians
  const getTechColor = useMemo(() => (techId: string | null) => {
    if (!techId) return '#9CA3AF'; // Gray for unassigned
    
    // Find index of this tech in the current list
    const index = routesByTech.findIndex(group => (group.tech?.id || 'unassigned') === techId);
    
    if (index === -1) return '#9CA3AF';

    // Extended palette for more variety
    const colors = [
      '#EF4444', // Red
      '#3B82F6', // Blue
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#8B5CF6', // Violet
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
      '#6366F1', // Indigo
      '#14B8A6', // Teal
      '#D946EF', // Fuchsia
    ];
    
    return colors[index % colors.length];
  }, [routesByTech]);

  const mapRoutes = useMemo(() => {
    if (!selectedTechId) {
      // Return all routes
      return dailyRoutes;
    }
    // Return only selected tech routes
    return dailyRoutes.filter(route => (route.techId || 'unassigned') === selectedTechId);
  }, [dailyRoutes, selectedTechId]);

  const mapData = useMemo(() => {
    return mapRoutes.map(route => {
      const customer = route.pool.customer;
      return {
        id: route.id,
        techId: route.techId || 'unassigned',
        color: getTechColor(route.techId),
        address: [
          customer.addressStreet,
          customer.addressCity,
          customer.addressState,
          customer.addressZip
        ].filter(Boolean).join(', '),
        customerName: `${customer.firstName} ${customer.lastName}`,
        index: 0 // Will be set during processing per tech
      };
    }).filter(item => item.address.length > 0);
  }, [mapRoutes, getTechColor]);

  // Approximate center for Provo, Utah (will be updated after geocoding)
  const mapOptions = useMemo(() => ({
    center: [-111.6585, 40.2181] as [number, number], // Provo, Utah approximate coordinates
    zoom: 14,
  }), []);

  const { mapContainer, map } = useMapbox(mapOptions);

  // Generate week starting from today
  const weekDays = useMemo(() => {
    const today = new Date();
    const days: Array<{ date: Date; dayName: string; dayNumber: number; isSelected: boolean }> = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const day = date.getDate();
      const dayName = dayNames[date.getDay()];
      
      // Compare dates ignoring time
      const isSelected = date.toDateString() === selectedDate.toDateString();

      days.push({
        date,
        dayName,
        dayNumber: day,
        isSelected,
      });
    }
    
    return days;
  }, [selectedDate]);

  // Geocode addresses and add markers when map is ready
  useEffect(() => {
    if (!map) return;


  }, [map, mapData]); // Placeholder to be replaced by actual logic below

  // Ref to store current markers to clear them on update
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    const updateMap = async () => {
      // Ensure map style is loaded before accessing layers
      if (!map.isStyleLoaded()) {
        map.once('style.load', updateMap);
        return;
      }

      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Remove existing route layers/sources
      // We need to remove all potential layers. 
      // Since IDs are dynamic (route-techId), we might need to track added layers.
      // For simplicity, let's assume we clear all layers that start with 'route-'
      const style = map.getStyle();
      if (style && style.layers) {
        style.layers.forEach(layer => {
          if (layer.id.startsWith('route-')) {
            map.removeLayer(layer.id);
          }
        });
      }
      // Sources too
      if (style && style.sources) {
        Object.keys(style.sources).forEach(sourceId => {
          if (sourceId.startsWith('route-')) {
            map.removeSource(sourceId);
          }
        });
      }

      if (mapData.length === 0) return;

      try {
        const token = env.mapbox.publicToken || '';
        if (!token) return;

        const bounds = new mapboxgl.LngLatBounds();
        
        // Group data by techId to draw separate lines
        const groupedData: Record<string, typeof mapData> = {};
        mapData.forEach(item => {
          if (!groupedData[item.techId]) groupedData[item.techId] = [];
          groupedData[item.techId].push(item);
        });

        // Process each tech group
        await Promise.all(Object.entries(groupedData).map(async ([techId, items]) => {
          const orderedCoordinates: Array<{ index: number; coords: [number, number] }> = [];
          const color = items[0].color; // All items in group have same color

          await Promise.all(items.map(async (item, index) => {
            try {
              const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(item.address)}.json?access_token=${token}&limit=1`;
              const response = await fetch(geocodeUrl);
              const data = await response.json();

              if (data.features && data.features.length > 0) {
                const [lng, lat] = data.features[0].center;
                const coordinates: [number, number] = [lng, lat];

                // Create colored marker
                const marker = new mapboxgl.Marker({
                  color: color,
                  scale: 1.0, // Slightly smaller for multiple techs
                })
                  .setLngLat(coordinates)
                  .setPopup(new mapboxgl.Popup().setHTML(`<div class="p-2"><strong>${item.customerName}</strong><br/>${item.address}</div>`))
                  .addTo(map);

                markersRef.current.push(marker);
                orderedCoordinates.push({ index, coords: coordinates });
                bounds.extend(coordinates);
              }
            } catch (e) {
              console.error(e);
            }
          }));

          // Draw line for this tech
          orderedCoordinates.sort((a, b) => a.index - b.index);
          const routeCoordinates = orderedCoordinates.map(item => item.coords);

          if (routeCoordinates.length > 1) {
            const routeId = `route-${techId}`;
            map.addSource(routeId, {
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
              'id': routeId,
              'type': 'line',
              'source': routeId,
              'layout': {
                'line-join': 'round',
                'line-cap': 'round'
              },
              'paint': {
                'line-color': color,
                'line-width': 4,
                'line-opacity': 0.8
              }
            });
          }
        }));

        if (!bounds.isEmpty()) {
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

  }, [map, mapData]);

  return (
    <div className="flex h-[600px] w-full gap-4">
      {/* Calendar Side */}
      <div className="w-1/3 bg-white shadow rounded-lg p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Week Schedule</h2>
        {/* Week Header - Grid Style */}
        <div className="grid grid-cols-7 gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
          {weekDays.map((day, index) => (
            <button
              key={index}
              onClick={() => setSelectedDate(day.date)}
              className={`flex flex-col items-center justify-center py-2 rounded-md transition-all ${
                day.isSelected
                  ? 'bg-white shadow-sm text-blue-600 font-bold ring-1 ring-gray-200'
                  : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider">{day.dayName}</span>
              <span className="text-sm font-medium">{day.dayNumber}</span>
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
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getTechColor(group.tech?.id || null) }}
                      />
                      <span>{group.tech ? group.tech.name : 'Unassigned'}</span>
                    </div>
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

