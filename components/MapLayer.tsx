'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Match } from '@/lib/types';
import Link from 'next/link';

// Custom Map Pin
const customIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function MapLayer({ matches }: { matches: Match[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-[450px] w-full rounded-2xl bg-neutral-100 animate-pulse" />;

  const markers = matches.map((m) => {
    let lat: number | null = null;
    let lon: number | null = null;

    if (m.location_address && m.location_address.includes('|')) {
      const parts = m.location_address.split('|');
      if (parts.length >= 3) {
        lat = parseFloat(parts[1]);
        lon = parseFloat(parts[2]);
      }
    }

    if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
      return { ...m, lat, lon };
    }
    
    // Dispersión determinista basada en el ID para que no salten
    const pseudoRandom1 = (m.id.charCodeAt(0) % 10) / 10 - 0.5;
    const pseudoRandom2 = (m.id.charCodeAt(m.id.length - 1) % 10) / 10 - 0.5;
    
    // Tucumán center fallback
    lat = -26.8241 + pseudoRandom1 * 0.05;
    lon = -65.2226 + pseudoRandom2 * 0.05;

    return { ...m, lat: lat, lon: lon };
  });

  const center: [number, number] = [-26.8241, -65.2226];

  return (
    <div className="h-[450px] w-full overflow-hidden rounded-2xl border border-line shadow-sm relative z-0">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          attribution="&copy; Google Maps"
        />
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lon]} icon={customIcon}>
            <Popup className="custom-popup rounded-2xl">
              <div className="p-1">
                <div className="mb-1 text-xs font-bold uppercase text-brand-dark">{m.match_time.slice(0, 5)}hs</div>
                <div className="mb-2 font-display text-sm font-extrabold text-ink">{m.court}</div>
                <Link href={`/partido/${m.id}`} className="block rounded-lg bg-brand py-2 text-center text-xs font-bold text-white">
                  Ver detalle
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
