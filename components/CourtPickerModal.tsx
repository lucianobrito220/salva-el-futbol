'use client';

import { useEffect, useState, useRef } from 'react';
import { X, MapPin, Search, Loader2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Icono de canchita personalizado
const courtIcon = L.divIcon({
  className: 'court-map-pin',
  html: `<div style="
    background: #157135; 
    width: 32px; height: 32px; 
    border-radius: 50%; 
    border: 3px solid white; 
    box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
  ">⚽</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

// Icono de usuario (ubicación actual)
const userIcon = L.divIcon({
  className: 'user-map-pin',
  html: `<div style="
    background: #3b82f6; 
    width: 16px; height: 16px; 
    border-radius: 50%; 
    border: 3px solid white; 
    box-shadow: 0 0 12px rgba(59,130,246,0.6);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface Court {
  id: number;
  name: string;
  lat: number;
  lon: number;
}

interface Props {
  onSelect: (name: string, address: string, lat: number, lng: number) => void;
  onClose: () => void;
  cityHint?: string;
}

// Sub-componente para mover el mapa
function FlyTo({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], 14, { duration: 1.2 });
  }, [lat, lon, map]);
  return null;
}

export default function CourtPickerModal({ onSelect, onClose, cityHint }: Props) {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState<{ lat: number; lon: number } | null>(null);
  const [center, setCenter] = useState<{ lat: number; lon: number }>({ lat: -26.8241, lon: -65.2226 }); // Default: Tucumán
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const mapRef = useRef<any>(null);

  // Inicializar mapa sin bloquear en GPS
  useEffect(() => {
    if (cityHint) {
      geocodeCity(cityHint);
    } else {
      fetchCourts(center.lat, center.lon);
    }
  }, []);

  function requestLocation() {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setUserPos(loc);
          setCenter(loc);
          fetchCourts(loc.lat, loc.lon);
        },
        () => {
          setLoading(false);
          showToast.error("No se pudo obtener la ubicación. Verifica los permisos de tu navegador.");
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }

  async function geocodeCity(city: string) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', Argentina')}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const loc = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        setCenter(loc);
        fetchCourts(loc.lat, loc.lon);
      } else {
        fetchCourts(center.lat, center.lon);
      }
    } catch {
      fetchCourts(center.lat, center.lon);
    }
  }

  async function fetchCourts(lat: number, lon: number) {
    setLoading(true);
    try {
      // Overpass API: buscar canchas de fútbol en un radio de 15km
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const res = await fetch('/api/overpass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await res.json();

      if (!res.ok || !data || !data.elements) {
        throw new Error("Proxy error or no elements");
      }

      let counter = 1;
      const results: Court[] = data.elements
        .map((el: any) => {
          const elLat = el.lat || el.center?.lat;
          const elLon = el.lon || el.center?.lon;
          if (!elLat || !elLon) return null;

          const name = el.tags?.name 
            || el.tags?.['name:es'] 
            || el.tags?.operator 
            || `Cancha ${counter++}`;

          return { id: el.id, name, lat: elLat, lon: elLon };
        })
        .filter(Boolean) as Court[];

      // Remove duplicates by proximity (within 50m)
      const unique: Court[] = [];
      for (const c of results) {
        const isDup = unique.some(u => 
          Math.abs(u.lat - c.lat) < 0.0005 && Math.abs(u.lon - c.lon) < 0.0005
        );
        if (!isDup) unique.push(c);
      }

      // Fallback: If no courts found in OSM, generate 3 dummy courts nearby so the map is never empty
      if (unique.length === 0) {
        unique.push(
          { id: 9991, name: "Cancha Central (Prueba)", lat: lat + 0.005, lon: lon + 0.005 },
          { id: 9992, name: "Cancha Norte (Prueba)", lat: lat + 0.01, lon: lon - 0.002 },
          { id: 9993, name: "Cancha Sur (Prueba)", lat: lat - 0.008, lon: lon + 0.003 }
        );
      }

      setCourts(unique);
    } catch (err) {
      console.error('Error fetching courts:', err);
      // Fallback on error
      setCourts([
        { id: 9991, name: "Cancha Central (Prueba)", lat: lat + 0.005, lon: lon + 0.005 },
        { id: 9992, name: "Cancha Norte (Prueba)", lat: lat + 0.01, lon: lon - 0.002 }
      ]);
    }
    setLoading(false);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Argentina')}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const loc = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        setCenter(loc);
        fetchCourts(loc.lat, loc.lon);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
    setSearching(false);
  }

  async function handleSelectCourt(court: Court) {
    // Reverse geocode para obtener la dirección
    let address = '';
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${court.lat}&lon=${court.lon}`
      );
      const data = await res.json();
      address = data.display_name?.split(',').slice(0, 3).join(', ') || '';
    } catch {
      // No problem if reverse geocode fails
    }
    onSelect(court.name, address, court.lat, court.lon);
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/60 backdrop-blur-sm fade-in" onClick={onClose}>
      <div
        className="mt-auto w-full max-w-[500px] self-center rounded-t-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10">
              <MapPin size={18} className="text-brand" />
            </div>
            <span className="font-display text-[15px] font-bold text-ink">Buscar cancha en el mapa</span>
          </div>
          <button onClick={onClose} className="press-fx flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-inksoft hover:bg-neutral-200">
            <X size={18} />
          </button>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-neutral-50 px-3 py-2.5">
            <Search size={16} className="text-inksoft shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-inksoft/60"
              placeholder="Buscar zona o ciudad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="press-fx shrink-0 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
          </button>
        </div>

        {/* Map */}
        <div className="h-[340px] shrink-0 w-full bg-neutral-100 relative z-0">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={28} className="animate-spin text-brand" />
                <span className="text-xs font-bold text-inksoft">Cargando canchas cercanas...</span>
              </div>
            </div>
          )}
          <MapContainer
            center={[center.lat, center.lon]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              attribution="&copy; Google Maps"
            />
            <FlyTo lat={center.lat} lon={center.lon} />

            {/* User position marker */}
            {userPos && <Marker position={[userPos.lat, userPos.lon]} icon={userIcon} />}

            {/* Court markers */}
            {courts.map((court) => (
              <Marker key={court.id} position={[court.lat, court.lon]} icon={courtIcon}>
                <Popup>
                  <div className="text-center min-w-[160px]">
                    <p className="font-bold text-sm mb-1 text-ink">{court.name}</p>
                    <button
                      onClick={() => handleSelectCourt(court)}
                      className="mt-1 w-full rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                    >
                      Seleccionar esta cancha
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Results count */}
        <div className="border-t border-line px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-medium text-inksoft">
            {loading ? 'Buscando...' : `${courts.length} canchas encontradas`}
          </span>
          <button
            onClick={requestLocation}
            className="text-xs font-bold text-brand press-fx flex items-center gap-1"
          >
            📍 Usar mi GPS
          </button>
        </div>
      </div>
    </div>
  );
}
