'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const customIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onLocationSelect,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onLocationSelect?: (lat: number, lng: number) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleChange(v: string) {
    onChange(v);
    setOpen(true);
    setCoords(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 4) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const searchQuery = v.toLowerCase().includes('tucum') ? v : `${v}, Tucumán, Argentina`;
        const res = await fetch(
          `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&sourceCountry=ARG&maxLocations=5&singleLine=${encodeURIComponent(searchQuery)}`
        );
        const data = await res.json();
        const mapped = (data.candidates || []).map((c: any) => ({
          display_name: c.address,
          lat: c.location.y.toString(),
          lon: c.location.x.toString(),
        }));
        setSuggestions(mapped);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 450);
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <MapPin size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-inksoft" />
        <input
          className="input pl-9"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
        {loading && <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-inksoft" />}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-line bg-white shadow-lg">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onChange(s.display_name);
                const pLat = parseFloat(s.lat);
                const pLon = parseFloat(s.lon);
                setCoords({ lat: pLat, lon: pLon });
                if (onLocationSelect) onLocationSelect(pLat, pLon);
                setSuggestions([]);
                setOpen(false);
              }}
              className="flex w-full items-start gap-2 border-b border-line px-3.5 py-2.5 text-left text-xs last:border-0 hover:bg-neutral-50"
            >
              <MapPin size={13} className="mt-0.5 flex-shrink-0 text-inksoft" />
              <span>{s.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {coords && (
        <div className="mt-2 h-[120px] w-full overflow-hidden rounded-xl border border-line relative fade-in z-0">
          <MapContainer center={[coords.lat, coords.lon]} zoom={15} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              attribution="&copy; Google Maps"
            />
            <Marker position={[coords.lat, coords.lon]} icon={customIcon} />
          </MapContainer>
        </div>
      )}
    </div>
  );
}
