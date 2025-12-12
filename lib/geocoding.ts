import { env } from './env';

interface Coordinates {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    // Try to use Google Maps if key is available
    // if (env.GOOGLE_MAPS_API_KEY) { ... }

    // Fallback to OpenStreetMap (Nominatim)
    // Note: Nominatim has usage limits (1 request/sec). 
    // In production, use a paid service like Google Maps, Mapbox, or Radar.
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PoolServiceApp/1.0', // Nominatim requires a User-Agent
      },
    });

    if (!response.ok) {
      console.error('Geocoding failed:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}


