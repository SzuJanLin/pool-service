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
      <div className="flex-1 bg-white shadow rounded-lg p-4 flex flex-col">
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
        {/* Content Split - Two Columns */}
        <div className="flex-1 flex gap-6 overflow-hidden mt-4">
          
          {/* Left Column: Technicians List */}
          <div className="w-1/3 overflow-y-auto pr-2 space-y-3 border-r">
             {routesByTech.length === 0 ? (
               <div className="text-gray-500 text-sm text-center py-4">No techs scheduled</div>
             ) : (
               routesByTech.map((group) => {
                 const techId = group.tech?.id || 'unassigned';
                 const isSelected = selectedTechId === techId;
                 const routeCount = group.routes.length;
                 
                 return (
                   <div 
                     key={techId}
                     onClick={() => setSelectedTechId(isSelected ? null : techId)}
                     className={`p-4 rounded-lg border cursor-pointer transition-all ${
                       isSelected 
                         ? 'border-blue-500 bg-blue-50 shadow-sm' 
                         : 'border-gray-200 hover:border-gray-300 bg-white'
                     }`}
                   >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                           <div 
                             className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                             style={{ backgroundColor: getTechColor(group.tech?.id || null) }}
                           >
                              {group.tech ? (group.tech.name?.[0] || 'T') : 'U'}
                           </div>
                           <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {group.tech ? group.tech.name : 'Unassigned'}
                              </div>
                              <div className="text-xs text-gray-500">{routeCount} stops</div>
                           </div>
                        </div>
                      </div>
                      
                      {/* Progress bar simulation */}
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
                        <div className="bg-gray-400 h-1.5 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                         <span>No stops</span>
                         <span>0 of {routeCount}</span>
                      </div>
                   </div>
                 );
               })
             )}
          </div>

          {/* Right Column: Routes Detail */}
          <div className="flex-1 overflow-y-auto pl-2">
             <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Customer Stops</h3>
             
             {!selectedTechId ? (
               <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                 <p>Select a technician to view their route</p>
               </div>
             ) : (
               (() => {
                 const selectedGroup = routesByTech.find(g => (g.tech?.id || 'unassigned') === selectedTechId);
                 if (!selectedGroup) return <div>Technician not found</div>;
                 
                 return (
                   <div className="space-y-4">
                     <div className="bg-blue-50 px-4 py-2 rounded text-sm font-medium text-blue-900">
                       <span className="text-xs bg-white px-2 py-0.5 rounded text-blue-600 border border-blue-100">
                         {selectedGroup.routes.length} stops
                       </span>
                     </div>
                     
                     {selectedGroup.routes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No stops for this day</div>
                     ) : (
                        <div className="space-y-3">
                          {selectedGroup.routes.map((route, idx) => (
                            <div key={route.id} className="flex items-start gap-3 p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                               <div className="flex flex-col items-center gap-1 mt-1">
                                  <div className="w-6 h-6 rounded-full bg-gray-100 border flex items-center justify-center text-xs font-medium text-gray-600">
                                    {idx + 1}
                                  </div>
                               </div>
                               <div className="flex-1">
                                  <div className="font-medium text-gray-900">
                                    {route.pool.customer.firstName} {route.pool.customer.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500 mt-0.5">
                                    {[
                                      route.pool.customer.addressStreet,
                                      route.pool.customer.addressCity
                                    ].filter(Boolean).join(', ')}
                                  </div>
                               </div>
                               <div className="text-xs text-gray-400 font-mono">
                                 --:--
                               </div>
                            </div>
                          ))}
                        </div>
                     )}
                   </div>
                 );
               })()
             )}
          </div>
        </div>
      </div>

      {/* Map Side */}
      <div className="w-1/3 relative rounded-lg overflow-hidden shadow">
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

